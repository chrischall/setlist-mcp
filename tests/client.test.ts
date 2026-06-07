import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SetlistClient } from '../src/client.js';

// Capture outbound fetches. createApiClient binds the global `fetch` at
// construction time, so the stub must be installed BEFORE `new SetlistClient()`.
interface Call {
  url: string;
  init: { method: string; headers: Record<string, string> };
}

describe('SetlistClient', () => {
  let calls: Call[];

  function stubFetch(body: unknown = {}, status = 200): ReturnType<typeof vi.fn> {
    const fn = vi.fn(async (url: string, init: Call['init']) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fn);
    return fn;
  }

  beforeEach(() => {
    calls = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete process.env.SETLIST_API_KEY;
    delete process.env.SETLIST_ACCEPT_LANGUAGE;
  });

  it('sends the x-api-key header and JSON Accept against the rest base URL', async () => {
    process.env.SETLIST_API_KEY = 'test-key';
    stubFetch({ ok: 1 });
    const c = new SetlistClient();

    await c.request('GET', '/1.0/search/countries');

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.setlist.fm/rest/1.0/search/countries');
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].init.headers['x-api-key']).toBe('test-key');
    expect(calls[0].init.headers.Accept).toBe('application/json');
  });

  it('builds a query string and drops undefined params', async () => {
    process.env.SETLIST_API_KEY = 'k';
    stubFetch();
    const c = new SetlistClient();

    await c.request('GET', '/1.0/search/setlists', {
      query: { artistName: 'Phish', p: 2, year: undefined },
    });

    expect(calls[0].url).toBe(
      'https://api.setlist.fm/rest/1.0/search/setlists?artistName=Phish&p=2',
    );
  });

  it('adds Accept-Language when SETLIST_ACCEPT_LANGUAGE is set', async () => {
    process.env.SETLIST_API_KEY = 'k';
    process.env.SETLIST_ACCEPT_LANGUAGE = 'de';
    stubFetch();
    const c = new SetlistClient();

    await c.request('GET', '/1.0/search/countries');

    expect(calls[0].init.headers['Accept-Language']).toBe('de');
  });

  it('times out a hung request with a clear, actionable error', async () => {
    process.env.SETLIST_API_KEY = 'k';
    vi.useFakeTimers();
    // A fetch that never resolves until its AbortSignal fires.
    vi.stubGlobal('fetch', (_url: string, init: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          const e = new Error('aborted');
          (e as { name: string }).name = 'AbortError';
          reject(e);
        });
      }),
    );
    const c = new SetlistClient();

    const p = c.request('GET', '/1.0/search/countries');
    const assertion = expect(p).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(60_000); // fire the timeout regardless of its exact value
    await assertion;
  });

  it('defers the config error — constructs without a key, throws on first request', async () => {
    delete process.env.SETLIST_API_KEY;
    const fn = stubFetch();

    const c = new SetlistClient(); // must NOT throw

    await expect(c.request('GET', '/1.0/search/countries')).rejects.toThrow(/SETLIST_API_KEY/);
    expect(fn).not.toHaveBeenCalled(); // no network call when the key is missing
  });
});
