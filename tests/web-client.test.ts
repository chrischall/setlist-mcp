import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SetlistWebClient } from '../src/web-client.js';

// Stub the global fetch (createApiClient binds it at construction → stub first).
interface Call { url: string; init: { headers: Record<string, string> } }

describe('SetlistWebClient', () => {
  let calls: Call[];
  function stubFetch(body = '<html>ok</html>', status = 200): ReturnType<typeof vi.fn> {
    const fn = vi.fn(async (url: string, init: Call['init']) => {
      calls.push({ url, init });
      return new Response(body, { status, headers: { 'content-type': 'text/html' } });
    });
    vi.stubGlobal('fetch', fn);
    return fn;
  }
  beforeEach(() => { calls = []; });
  afterEach(() => {
    vi.unstubAllGlobals();
    // Restore real timers so the 5xx-retry test's vi.useFakeTimers() can't
    // leak fake-timer state into subsequent tests (no-op when not faked).
    vi.useRealTimers();
    delete process.env.SETLIST_SESSION_COOKIE;
    delete process.env.SETLIST_DISABLE_FETCHPROXY;
  });

  it('fetchPage sends the session cookie + browser UA against the www base URL', async () => {
    process.env.SETLIST_SESSION_COOKIE = 'JSESSIONID=abc';
    stubFetch();
    const c = new SetlistWebClient();
    await c.fetchPage('/setlist/x.html');
    expect(calls[0].url).toBe('https://www.setlist.fm/setlist/x.html');
    expect(calls[0].init.headers.Cookie).toBe('JSESSIONID=abc');
    expect(calls[0].init.headers['User-Agent']).toMatch(/Mozilla/);
  });

  it('wicketAjaxGet sends the Wicket-Ajax headers and base URL', async () => {
    process.env.SETLIST_SESSION_COOKIE = 'c=1';
    stubFetch('<ajax-response></ajax-response>');
    const c = new SetlistWebClient();
    await c.wicketAjaxGet('/?p:1-link', 'setlist/x.html');
    expect(calls[0].url).toBe('https://www.setlist.fm/?p:1-link');
    const h = calls[0].init.headers;
    expect(h['Wicket-Ajax']).toBe('true');
    expect(h['Wicket-Ajax-BaseURL']).toBe('setlist/x.html');
    expect(h['X-Requested-With']).toBe('XMLHttpRequest');
    expect(h.Cookie).toBe('c=1');
  });

  it('retries a transient 5xx then succeeds', async () => {
    process.env.SETLIST_SESSION_COOKIE = 'c=1';
    vi.useFakeTimers();
    let n = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      n += 1;
      return new Response(n === 1 ? 'gateway' : '<html>ok</html>', {
        status: n === 1 ? 502 : 200,
        headers: { 'content-type': 'text/html' },
      });
    }));
    const c = new SetlistWebClient();
    const p = c.fetchPage('/setlist/x.html');
    await vi.advanceTimersByTimeAsync(2000);
    await expect(p).resolves.toContain('ok');
    expect(n).toBe(2);
  });

  it('does not retry a 404 whose body merely mentions a 5xx code', async () => {
    process.env.SETLIST_SESSION_COOKIE = 'c=1';
    const fn = vi.fn(async () => {
      return new Response('Not found — see /errors/503 for maintenance windows', {
        status: 404,
        headers: { 'content-type': 'text/html' },
      });
    });
    vi.stubGlobal('fetch', fn);
    const c = new SetlistWebClient();
    await expect(c.fetchPage('/setlist/x.html')).rejects.toThrow(/404/);
    expect(fn).toHaveBeenCalledTimes(1); // no retries: a 404 is not transient
  });

  it('paces consecutive authenticated requests at least paceMs apart', async () => {
    process.env.SETLIST_SESSION_COOKIE = 'c=1';
    stubFetch();
    let t = 1_000_000; // start high so the first call (lastCallAt=0) never waits
    const sleeps: number[] = [];
    const c = new SetlistWebClient({
      now: () => t,
      sleep: async (ms: number) => {
        sleeps.push(ms);
        t += ms;
      },
      paceMs: 500,
    });
    await c.fetchPage('/a'); // first request runs immediately
    await c.fetchPage('/b'); // second must be gated ~paceMs after the first
    expect(sleeps).toEqual([500]);
    expect(calls.length).toBe(2);
  });

  it('serializes CONCURRENT requests: the second starts >= paceMs after the first', async () => {
    process.env.SETLIST_SESSION_COOKIE = 'c=1';
    let t = 1_000_000; // start high so the first call never waits
    const startTimes: number[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        startTimes.push(t);
        return new Response('<html>ok</html>', { status: 200, headers: { 'content-type': 'text/html' } });
      }),
    );
    const c = new SetlistWebClient({
      now: () => t,
      sleep: async (ms: number) => {
        t += ms;
      },
      paceMs: 500,
    });
    // Fired concurrently (e.g. parallel tool calls) — the pacer must still
    // space the request starts, not let both sleep the same remainder and
    // burst together.
    await Promise.all([c.fetchPage('/a'), c.fetchPage('/b')]);
    expect(startTimes).toHaveLength(2);
    expect(startTimes[1] - startTimes[0]).toBeGreaterThanOrEqual(500);
  });

  it('throws a clear config error (no network) when no session is set and the bridge is disabled', async () => {
    delete process.env.SETLIST_SESSION_COOKIE;
    process.env.SETLIST_DISABLE_FETCHPROXY = '1'; // skip the fetchproxy fallback
    const fn = stubFetch();
    const c = new SetlistWebClient();
    await expect(c.fetchPage('/x')).rejects.toThrow(/SETLIST_SESSION_COOKIE|session/i);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('SetlistWebClient.relift — concurrency', () => {
  // The write throttle serializes requests, but callers invalidate from the
  // tool layer outside it. Two concurrent attendance writes could both see a
  // logged-out page and race: the first clears the cookie, the second finds
  // nothing lifted to clear, concludes no renewal is available, and gives up
  // while a perfectly good re-lift is in flight.
  afterEach(() => {
    vi.resetModules();
    delete process.env.SETLIST_SESSION_COOKIE;
  });

  it('shares one in-flight lift between concurrent callers', async () => {
    let lifts = 0;
    vi.doMock('../src/fetchproxy-cookie.js', () => ({
      resolveSessionCookie: async () => {
        lifts++;
        return { cookieHeader: `JSESSIONID=v${lifts}` };
      },
    }));
    const { SetlistWebClient } = await import('../src/web-client.js');
    const c = new SetlistWebClient();
    // Resolve an initial lifted cookie so there is something to renew.
    await (c as unknown as { requireCookie(): Promise<string> }).requireCookie();
    expect(lifts).toBe(1);

    const [a, b] = await Promise.all([c.relift(), c.relift()]);
    expect(a).toBe(true);
    expect(b).toBe(true); // neither caller is told "nothing to renew"
    expect(lifts).toBe(2); // one shared re-lift, not two
  });

  it('reports false for an env cookie so callers skip a pointless re-read', async () => {
    process.env.SETLIST_SESSION_COOKIE = 'JSESSIONID=from-env';
    const { SetlistWebClient } = await import('../src/web-client.js');
    const c = new SetlistWebClient();
    expect(await c.relift()).toBe(false);
  });
});

describe('SetlistWebClient.requireCookie — single-flight', () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.SETLIST_SESSION_COOKIE;
  });

  it('resolves one cookie for concurrent first-use callers', async () => {
    // relift() shares an in-flight RE-lift, but the window it opens (cookie
    // momentarily null) is exactly when a concurrent request can arrive at
    // requireCookie() and start a SECOND bridge round-trip for one session.
    let resolves = 0;
    vi.doMock('../src/fetchproxy-cookie.js', () => ({
      resolveSessionCookie: async () => {
        resolves++;
        await new Promise((r) => setTimeout(r, 5));
        return { cookieHeader: 'JSESSIONID=shared' };
      },
    }));
    const { SetlistWebClient } = await import('../src/web-client.js');
    const c = new SetlistWebClient() as unknown as { requireCookie(): Promise<string> };
    const [a, b] = await Promise.all([c.requireCookie(), c.requireCookie()]);
    expect(a).toBe('JSESSIONID=shared');
    expect(b).toBe('JSESSIONID=shared');
    expect(resolves).toBe(1);
  });
});
