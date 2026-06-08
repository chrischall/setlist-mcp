import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { client } from '../../src/client.js';
import { registerResolveTools } from '../../src/tools/resolve.js';
import { createTestHarness } from '../helpers.js';

const mockRequest = vi.spyOn(client, 'request').mockResolvedValue(undefined as never);
let harness: Awaited<ReturnType<typeof createTestHarness>>;

beforeEach(() => mockRequest.mockClear());
afterAll(async () => {
  if (harness) await harness.close();
});

const parse = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

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

describe('setlist_resolve_concerts', () => {
  it('setup', async () => {
    harness = await createTestHarness((s) => registerResolveTools(s));
  });

  it('resolves a direct match with song counts and a summary', async () => {
    mockRequest.mockImplementation(async (_m, p) =>
      p === '/1.0/search/setlists' ? ({ setlist: [setlist()] } as never) : ({} as never),
    );
    const out = parse(await harness.callTool('setlist_resolve_concerts', {
      concerts: [{ artist: 'Oasis', date: '2025-08-28' }],
    }));
    expect(out.results[0].match).toMatchObject({
      setlistId: 's1',
      url: 'https://www.setlist.fm/x.html',
      eventDate: '2025-08-28',
      songCount: 2,
      hasSongs: true,
    });
    expect(out.summary).toMatchObject({ total: 1, matched: 1, stubs: 0, unmatched: 0 });
  });

  it('passes the ISO date as dd-MM-yyyy and threads the city filter', async () => {
    mockRequest.mockImplementation(async () => ({ setlist: [setlist()] } as never));
    await harness.callTool('setlist_resolve_concerts', {
      concerts: [{ artist: 'TSO', date: '2025-12-13', city: 'Charlotte' }],
    });
    const [, path, opts] = mockRequest.mock.calls[0];
    expect(path).toBe('/1.0/search/setlists');
    expect((opts as { query: Record<string, unknown> }).query).toMatchObject({
      artistName: 'TSO',
      date: '13-12-2025',
      cityName: 'Charlotte',
    });
  });

  it('flags an empty stub as hasSongs:false and counts it in the summary', async () => {
    mockRequest.mockImplementation(async () => ({ setlist: [setlist({ sets: { set: [] } })] } as never));
    const out = parse(await harness.callTool('setlist_resolve_concerts', {
      concerts: [{ artist: 'Xscape', date: '2025-06-01' }],
    }));
    expect(out.results[0].match.hasSongs).toBe(false);
    expect(out.results[0].match.songCount).toBe(0);
    expect(out.summary).toMatchObject({ matched: 1, stubs: 1 });
  });

  it('falls back to a relevance artist lookup (mbid) when the direct search misses', async () => {
    mockRequest.mockImplementation(async (_m, p, o) => {
      const q = (o as { query?: Record<string, unknown> } | undefined)?.query ?? {};
      if (p === '/1.0/search/artists') return { artist: [{ mbid: 'MBID-1' }] } as never;
      if (p === '/1.0/search/setlists' && q.artistMbid === 'MBID-1') return { setlist: [setlist()] } as never;
      return { setlist: [] } as never; // direct (artistName) search misses
    });
    const out = parse(await harness.callTool('setlist_resolve_concerts', {
      concerts: [{ artist: 'Dan + Shay', date: '2025-08-28' }],
    }));
    expect(out.results[0].match.setlistId).toBe('s1');
    expect(out.summary.matched).toBe(1);
  });

  it('falls back to a punctuation-normalized artist name when mbid lookup also misses', async () => {
    mockRequest.mockImplementation(async (_m, p, o) => {
      const q = (o as { query?: Record<string, unknown> } | undefined)?.query ?? {};
      if (p === '/1.0/search/artists') return { artist: [] } as never; // no mbid
      if (p === '/1.0/search/setlists' && q.artistName === 'Weird Al Yankovic') {
        return { setlist: [setlist()] } as never; // normalized name hits
      }
      return { setlist: [] } as never; // raw quoted name misses
    });
    const out = parse(await harness.callTool('setlist_resolve_concerts', {
      concerts: [{ artist: '"Weird Al" Yankovic', date: '2025-08-28' }],
    }));
    expect(out.results[0].match?.setlistId).toBe('s1');
    expect(out.summary.matched).toBe(1);
  });

  it('treats a 404 (no results) as unmatched, not an error', async () => {
    // Reject lazily via mockImplementationOnce (the one form that doesn't trip
    // vitest's settled-result tracking under beforeEach(mockClear)); the rest of
    // the calls return empty so there's exactly one rejection — the setlists 404.
    mockRequest
      .mockImplementationOnce(() =>
        Promise.reject(new Error('setlist.fm error 404 for GET /1.0/search/setlists')),
      )
      .mockImplementation(async () => ({ artist: [] }) as never);
    const out = parse(await harness.callTool('setlist_resolve_concerts', {
      concerts: [{ artist: 'Nobody', date: '2025-01-01' }],
    }));
    expect(out.results[0].match).toBeNull();
    expect(out.summary).toMatchObject({ matched: 0, unmatched: 1 });
  });

  it('rejects a batch larger than 24', async () => {
    const concerts = Array.from({ length: 25 }, (_, i) => ({ artist: `A${i}`, date: '2025-01-01' }));
    // Schema violation may surface as an isError result or a rejected call —
    // accept either, but it must not succeed.
    const res = await harness
      .callTool('setlist_resolve_concerts', { concerts })
      .catch(() => ({ isError: true }) as { isError: boolean });
    expect(res.isError).toBe(true);
  });
});
