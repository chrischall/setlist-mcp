import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { client } from '../../src/client.js';
import {
  registerResolveTools,
  resolveConcerts,
  summarizeResults,
} from '../../src/tools/resolve.js';
import { createTestHarness } from '../helpers.js';

function setlist(over: Record<string, unknown> = {}) {
  return {
    id: 's1',
    url: 'https://www.setlist.fm/x.html',
    eventDate: '2025-08-28',
    artist: { name: 'Oasis' },
    venue: { name: 'Soldier Field', city: { name: 'Chicago' } },
    tour: { name: 'Live 25' },
    sets: { set: [{ song: [{ name: 'a' }, { name: 'b' }] }] },
    ...over,
  };
}

// Inject deps so the core runs instantly and deterministically (no real sleeps,
// no shared-client mock).
const fast = (request: ReturnType<typeof vi.fn>) => ({ request, sleep: async () => {}, paceMs: 0 });

describe('resolveConcerts (core)', () => {
  it('resolves a direct match with song counts', async () => {
    const request = vi.fn(async () => ({ setlist: [setlist()] }));
    const [r] = await resolveConcerts([{ artist: 'Oasis', date: '2025-08-28' }], fast(request));
    expect(r.match).toMatchObject({ setlistId: 's1', songCount: 2, hasSongs: true });
  });

  it('passes the ISO date as dd-MM-yyyy and threads the city filter', async () => {
    const request = vi.fn(async () => ({ setlist: [setlist()] }));
    await resolveConcerts([{ artist: 'TSO', date: '2025-12-13', city: 'Charlotte' }], fast(request));
    const [, path, opts] = request.mock.calls[0];
    expect(path).toBe('/1.0/search/setlists');
    expect((opts as { query: Record<string, unknown> }).query).toMatchObject({
      artistName: 'TSO',
      date: '13-12-2025',
      cityName: 'Charlotte',
    });
  });

  it('flags an empty stub as hasSongs:false', async () => {
    const request = vi.fn(async () => ({ setlist: [setlist({ sets: { set: [] } })] }));
    const [r] = await resolveConcerts([{ artist: 'Xscape', date: '2025-06-01' }], fast(request));
    expect(r.match).toMatchObject({ hasSongs: false, songCount: 0 });
  });

  it('falls back to a relevance artist lookup (mbid) when the direct search misses', async () => {
    const request = vi.fn(async (_m: string, p: string, o?: { query?: Record<string, unknown> }) => {
      const q = o?.query ?? {};
      if (p === '/1.0/search/artists') return { artist: [{ mbid: 'MBID-1' }] };
      if (p === '/1.0/search/setlists' && q.artistMbid === 'MBID-1') return { setlist: [setlist()] };
      return { setlist: [] };
    });
    const [r] = await resolveConcerts([{ artist: 'Dan + Shay', date: '2025-08-28' }], fast(request));
    expect(r.match?.setlistId).toBe('s1');
  });

  it('falls back to a punctuation-normalized name when mbid lookup also misses', async () => {
    const request = vi.fn(async (_m: string, p: string, o?: { query?: Record<string, unknown> }) => {
      const q = o?.query ?? {};
      if (p === '/1.0/search/artists') return { artist: [] };
      if (p === '/1.0/search/setlists' && q.artistName === 'Weird Al Yankovic') return { setlist: [setlist()] };
      return { setlist: [] };
    });
    const [r] = await resolveConcerts([{ artist: '"Weird Al" Yankovic', date: '2025-08-28' }], fast(request));
    expect(r.match?.setlistId).toBe('s1');
  });

  it('treats a 404 (no results) as unmatched, not an error', async () => {
    const request = vi.fn(() => Promise.reject(new Error('setlist.fm error 404 for GET /1.0/search/setlists')));
    const [r] = await resolveConcerts([{ artist: 'Nobody', date: '2025-01-01' }], fast(request));
    expect(r.match).toBeNull();
  });

  it('paces upstream calls ~paceMs apart (does not burst)', async () => {
    const request = vi.fn(async () => ({ setlist: [setlist()] }));
    const sleep = vi.fn(async () => {});
    await resolveConcerts(
      [
        { artist: 'A', date: '2025-01-01' },
        { artist: 'B', date: '2025-01-02' },
      ],
      { request, sleep, now: () => 1000, paceMs: 500, budgetMs: Infinity },
    );
    expect(request).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1); // first call immediate, second paced
    expect(sleep).toHaveBeenCalledWith(500);
  });

  it('stops at the time budget and marks the rest pending (no further upstream calls)', async () => {
    let t = 0;
    const request = vi.fn(async () => {
      t += 1000; // simulate ~1s per resolved concert
      return { setlist: [setlist()] };
    });
    const results = await resolveConcerts(
      [
        { artist: 'A', date: '2025-01-01' },
        { artist: 'B', date: '2025-01-02' },
        { artist: 'C', date: '2025-01-03' },
      ],
      { request, sleep: async (ms) => { t += ms; }, now: () => t, paceMs: 0, budgetMs: 1500 },
    );
    expect(results[0].match).not.toBeNull();
    expect(results[1].match).not.toBeNull();
    expect(results[2].pending).toBe(true);
    expect(request).toHaveBeenCalledTimes(2); // C never hit the API
  });
});

describe('summarizeResults', () => {
  it('counts matched/stubs/unmatched/pending and adds a note when work was deferred', () => {
    const out = summarizeResults([
      { input: { artist: 'A', date: 'd' }, match: { songCount: 5, hasSongs: true }, alternatives: 0 },
      { input: { artist: 'B', date: 'd' }, match: { songCount: 0, hasSongs: false }, alternatives: 0 },
      { input: { artist: 'C', date: 'd' }, match: null, alternatives: 0 },
      { input: { artist: 'D', date: 'd' }, match: null, alternatives: 0, pending: true },
    ]);
    expect(out.summary).toMatchObject({ total: 4, matched: 2, stubs: 1, unmatched: 1, pending: 1 });
    expect(String(out.note)).toMatch(/pending/i);
  });

  it('omits the note when nothing is pending', () => {
    const out = summarizeResults([
      { input: { artist: 'A', date: 'd' }, match: { songCount: 1, hasSongs: true }, alternatives: 0 },
    ]);
    expect(out.note).toBeUndefined();
  });
});

describe('setlist_resolve_concerts tool', () => {
  const mockRequest = vi.spyOn(client, 'request').mockResolvedValue(undefined as never);
  let harness: Awaited<ReturnType<typeof createTestHarness>>;
  beforeEach(() => mockRequest.mockClear());
  afterAll(async () => {
    if (harness) await harness.close();
  });
  const parse = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

  it('setup', async () => {
    harness = await createTestHarness((s) => registerResolveTools(s));
  });

  it('registers the tool and returns results + summary', async () => {
    mockRequest.mockResolvedValue({ setlist: [setlist()] } as never);
    const out = parse(await harness.callTool('setlist_resolve_concerts', {
      concerts: [{ artist: 'Oasis', date: '2025-08-28' }],
    }));
    expect(out.results[0].match.setlistId).toBe('s1');
    expect(out.summary).toMatchObject({ total: 1, matched: 1 });
  });

  it('rejects a batch larger than 24', async () => {
    const concerts = Array.from({ length: 25 }, (_, i) => ({ artist: `A${i}`, date: '2025-01-01' }));
    const res = await harness
      .callTool('setlist_resolve_concerts', { concerts })
      .catch(() => ({ isError: true }) as { isError: boolean });
    expect(res.isError).toBe(true);
  });
});
