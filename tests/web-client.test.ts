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
  afterEach(() => { vi.unstubAllGlobals(); delete process.env.SETLIST_SESSION_COOKIE; });

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

  it('throws a clear config error (no network) when no session is set', async () => {
    delete process.env.SETLIST_SESSION_COOKIE;
    const fn = stubFetch();
    const c = new SetlistWebClient();
    await expect(c.fetchPage('/x')).rejects.toThrow(/SETLIST_SESSION_COOKIE|session/i);
    expect(fn).not.toHaveBeenCalled();
  });
});
