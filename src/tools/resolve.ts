import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { textResult, isoToDmy, messageOf } from '@chrischall/mcp-utils';
import { client } from '../client.js';
import { ATTRIBUTION_NOTE } from '../attribution.js';

const MAX_BATCH = 24;

interface RawSetlist {
  id?: string;
  url?: string;
  eventDate?: string;
  artist?: { name?: string };
  venue?: { name?: string; city?: { name?: string } };
  tour?: { name?: string };
  sets?: { set?: { song?: unknown[] }[] };
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

async function searchSetlists(query: Record<string, string | undefined>): Promise<RawSetlist[]> {
  return emptyOn404(async () => {
    const data = await client.request<{ setlist?: RawSetlist[] }>('GET', '/1.0/search/setlists', {
      query,
    });
    return data?.setlist ?? [];
  }, []);
}

async function topArtistMbid(artistName: string): Promise<string | undefined> {
  return emptyOn404(async () => {
    const data = await client.request<{ artist?: { mbid?: string }[] }>('GET', '/1.0/search/artists', {
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

interface Concert {
  artist: string;
  date: string;
  city?: string;
  venue?: string;
}

async function resolveOne(c: Concert): Promise<unknown> {
  const filters: Record<string, string | undefined> = {
    date: isoToDmy(c.date),
    ...(c.city ? { cityName: c.city } : {}),
    ...(c.venue ? { venueName: c.venue } : {}),
  };

  let list = await searchSetlists({ artistName: c.artist, ...filters });

  // Fuzzy fallback 1: resolve the artist via the (more forgiving) relevance
  // search, then query by its mbid.
  if (list.length === 0) {
    const mbid = await topArtistMbid(c.artist);
    if (mbid) list = await searchSetlists({ artistMbid: mbid, ...filters });
  }
  // Fuzzy fallback 2: a punctuation-normalized name.
  if (list.length === 0) {
    const norm = normalizeArtist(c.artist);
    if (norm && norm.toLowerCase() !== c.artist.toLowerCase()) {
      list = await searchSetlists({ artistName: norm, ...filters });
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

export function registerResolveTools(server: McpServer): void {
  server.registerTool(
    'setlist_resolve_concerts',
    {
      description:
        "Resolve many concerts to their setlists in ONE call (instead of 2+ per show). Given up to 24 `{artist, date, city?, venue?}`, returns the best-match setlist for each — `{setlistId, url, eventDate, artist, venue, city, tour, songCount, hasSongs}` — plus a `{matched, stubs, unmatched}` summary. For each: searches artist + date (narrowed by your city/venue), and on a miss falls back to a relevance artist lookup (by mbid) and a punctuation-normalized name so format variants still resolve. `hasSongs: false` flags an empty stub page. Processed sequentially to respect setlist.fm's rate limit; chunk lists longer than 24 across calls." +
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
      const results: { match: { hasSongs: boolean } | null }[] = [];
      // Sequential on purpose: one request at a time keeps us within setlist.fm's
      // ~2 req/sec limit (the client also retries once on a 429).
      for (const c of concerts) {
        results.push((await resolveOne(c)) as { match: { hasSongs: boolean } | null });
      }
      const matched = results.filter((r) => r.match).length;
      const stubs = results.filter((r) => r.match && !r.match.hasSongs).length;
      return textResult({
        results,
        summary: { total: results.length, matched, stubs, unmatched: results.length - matched },
      });
    },
  );
}
