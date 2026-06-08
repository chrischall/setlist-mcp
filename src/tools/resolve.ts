import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { textResult, isoToDmy, messageOf } from '@chrischall/mcp-utils';
import { client } from '../client.js';
import { ATTRIBUTION_NOTE } from '../attribution.js';

const MAX_BATCH = 24;
// Pace upstream calls to ~2 req/sec (setlist.fm's standard-tier limit). Bursting
// a whole batch trips the limit → 429s → retries stack up → the tool call times
// out; spacing the requests keeps the batch steady and predictable.
const PACE_MS = 500;
// Overall wall-clock budget for one tool call. When it's exhausted, the
// remaining concerts come back `pending` instead of timing the whole call out.
const BUDGET_MS = 45_000;

type Query = Record<string, string | undefined>;
type RequestFn = <T>(method: string, path: string, opts?: { query?: Query }) => Promise<T>;

export interface ResolveDeps {
  request?: RequestFn;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  paceMs?: number;
  budgetMs?: number;
}

interface RawSetlist {
  id?: string;
  url?: string;
  eventDate?: string;
  artist?: { name?: string };
  venue?: { name?: string; city?: { name?: string } };
  tour?: { name?: string };
  sets?: { set?: { song?: unknown[] }[] };
}

interface Concert {
  artist: string;
  date: string;
  city?: string;
  venue?: string;
}

function songCountOf(s: RawSetlist): number {
  const sets = Array.isArray(s.sets?.set) ? s.sets!.set! : [];
  return sets.reduce((n, set) => n + (Array.isArray(set?.song) ? set.song.length : 0), 0);
}

// Loosen punctuation/format variants for a fuzzy retry: drop quotes, turn + / &
// into "and", drop stray periods, collapse whitespace. (Dan + Shay, "Weird Al"
// Yankovic, DJ Pee .Wee.)
function normalizeArtist(name: string): string {
  return name
    .replace(/["'’‘”“]/g, '')
    .replace(/\s*[+&]\s*/g, ' and ')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// A no-match search returns HTTP 404 from setlist.fm — treat that as "empty",
// not an error; let anything else propagate.
async function emptyOn404<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (/\b404\b/.test(messageOf(err))) return fallback;
    throw err;
  }
}

async function searchSetlists(req: RequestFn, query: Query): Promise<RawSetlist[]> {
  return emptyOn404(async () => {
    const data = await req<{ setlist?: RawSetlist[] }>('GET', '/1.0/search/setlists', { query });
    return data?.setlist ?? [];
  }, []);
}

async function topArtistMbid(req: RequestFn, artistName: string): Promise<string | undefined> {
  return emptyOn404(async () => {
    const data = await req<{ artist?: { mbid?: string }[] }>('GET', '/1.0/search/artists', {
      query: { artistName, sort: 'relevance' },
    });
    return data?.artist?.[0]?.mbid;
  }, undefined);
}

function score(s: RawSetlist, city?: string, venue?: string): number {
  let sc = 0;
  const vn = s.venue?.name?.toLowerCase() ?? '';
  const cn = s.venue?.city?.name?.toLowerCase() ?? '';
  if (venue && vn.includes(venue.toLowerCase())) sc += 4;
  if (city && cn.includes(city.toLowerCase())) sc += 2;
  if (songCountOf(s) > 0) sc += 1;
  return sc;
}

function pickBest(list: RawSetlist[], city?: string, venue?: string): RawSetlist | undefined {
  if (list.length === 0) return undefined;
  // Best location/song score wins; prefer a populated setlist on ties via songCount.
  return [...list].sort((a, b) => score(b, city, venue) - score(a, city, venue) || songCountOf(b) - songCountOf(a))[0];
}

interface ResolveResult {
  input: Concert;
  match: {
    setlistId?: string;
    url?: string;
    eventDate?: string;
    artist?: string;
    venue?: string;
    city?: string;
    tour?: string;
    songCount: number;
    hasSongs: boolean;
  } | null;
  alternatives: number;
  pending?: boolean;
}

async function resolveOne(req: RequestFn, c: Concert): Promise<ResolveResult> {
  const filters: Query = {
    date: isoToDmy(c.date),
    ...(c.city ? { cityName: c.city } : {}),
    ...(c.venue ? { venueName: c.venue } : {}),
  };

  let list = await searchSetlists(req, { artistName: c.artist, ...filters });

  // Fuzzy fallback 1: resolve the artist via the (more forgiving) relevance
  // search, then query by its mbid.
  if (list.length === 0) {
    const mbid = await topArtistMbid(req, c.artist);
    if (mbid) list = await searchSetlists(req, { artistMbid: mbid, ...filters });
  }
  // Fuzzy fallback 2: a punctuation-normalized name.
  if (list.length === 0) {
    const norm = normalizeArtist(c.artist);
    if (norm && norm.toLowerCase() !== c.artist.toLowerCase()) {
      list = await searchSetlists(req, { artistName: norm, ...filters });
    }
  }

  const best = pickBest(list, c.city, c.venue);
  if (!best) return { input: c, match: null, alternatives: 0 };

  const songCount = songCountOf(best);
  return {
    input: c,
    match: {
      setlistId: best.id,
      url: best.url,
      eventDate: best.eventDate, // already ISO (normalized by client.request)
      artist: best.artist?.name,
      venue: best.venue?.name,
      city: best.venue?.city?.name,
      tour: best.tour?.name,
      songCount,
      hasSongs: songCount > 0,
    },
    alternatives: list.length - 1,
  };
}

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Resolve each concert sequentially, pacing upstream calls to stay under
 * setlist.fm's rate limit and stopping (remaining → `pending`) once the
 * wall-clock budget is spent, so a large batch returns partial results instead
 * of timing the whole call out. Exported for testing.
 */
export async function resolveConcerts(concerts: Concert[], deps: ResolveDeps = {}): Promise<ResolveResult[]> {
  const baseRequest: RequestFn = deps.request ?? ((m, p, o) => client.request(m, p, o));
  const sleep = deps.sleep ?? defaultSleep;
  const now = deps.now ?? Date.now;
  const paceMs = deps.paceMs ?? PACE_MS;
  const budgetMs = deps.budgetMs ?? BUDGET_MS;

  // Gate every upstream call to at least `paceMs` apart (the first runs immediately).
  let lastCallAt = 0;
  const req: RequestFn = async (method, path, opts) => {
    const wait = paceMs - (now() - lastCallAt);
    if (wait > 0) await sleep(wait);
    lastCallAt = now();
    return baseRequest(method, path, opts);
  };

  const start = now();
  const results: ResolveResult[] = [];
  let budgetSpent = false;
  for (const c of concerts) {
    if (budgetSpent || now() - start >= budgetMs) {
      budgetSpent = true;
      results.push({ input: c, match: null, alternatives: 0, pending: true });
      continue;
    }
    results.push(await resolveOne(req, c));
  }
  return results;
}

/** Build the tool payload (results + summary, plus a note when work was deferred). */
export function summarizeResults(results: ResolveResult[]): Record<string, unknown> {
  const pending = results.filter((r) => r.pending).length;
  const matched = results.filter((r) => r.match).length;
  const stubs = results.filter((r) => r.match && !r.match.hasSongs).length;
  const summary = { total: results.length, matched, stubs, unmatched: results.length - matched - pending, pending };
  const payload: Record<string, unknown> = { results, summary };
  if (pending > 0) {
    payload.note = `Reached the time budget after ${results.length - pending} of ${results.length} concerts. Re-call setlist_resolve_concerts with just the ${pending} pending concert(s).`;
  }
  return payload;
}

export function registerResolveTools(server: McpServer): void {
  server.registerTool(
    'setlist_resolve_concerts',
    {
      description:
        "Resolve many concerts to their setlists in ONE call (instead of 2+ per show). Given up to 24 `{artist, date, city?, venue?}`, returns the best-match setlist for each — `{setlistId, url, eventDate, artist, venue, city, tour, songCount, hasSongs}` — plus a `{matched, stubs, unmatched, pending}` summary. For each: searches artist + date (narrowed by your city/venue), and on a miss falls back to a relevance artist lookup (by mbid) and a punctuation-normalized name so format variants still resolve. `hasSongs: false` flags an empty stub page. Calls are paced to setlist.fm's ~2 req/sec limit; if a big batch can't finish within the time budget the rest come back `pending: true` (re-call with just those) rather than timing out. Keep batches ≤24." +
        ATTRIBUTION_NOTE,
      annotations: { readOnlyHint: true },
      inputSchema: {
        concerts: z
          .array(
            z.object({
              artist: z.string().describe('Artist name'),
              date: z.string().describe('Event date, ISO yyyy-MM-dd (e.g. 2025-08-28)'),
              city: z.string().optional().describe('City to disambiguate multi-city dates (optional)'),
              venue: z.string().optional().describe('Venue to disambiguate (optional)'),
            }),
          )
          .min(1)
          .max(MAX_BATCH)
          .describe(`Concerts to resolve (1–${MAX_BATCH} per call)`),
      },
    },
    async ({ concerts }) => {
      const results = await resolveConcerts(concerts);
      return textResult(summarizeResults(results));
    },
  );
}
