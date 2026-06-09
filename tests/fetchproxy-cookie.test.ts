import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const bootstrap = vi.fn();
vi.mock('@fetchproxy/bootstrap', () => ({ bootstrap }));

import { grabSessionCookie } from '../src/fetchproxy-cookie.js';

describe('grabSessionCookie', () => {
  beforeEach(() => bootstrap.mockReset());
  afterEach(() => { delete process.env.SETLIST_DISABLE_FETCHPROXY; });

  it('assembles a Cookie header from the bridge-read session cookies', async () => {
    bootstrap.mockResolvedValue({ cookies: { JSESSIONID: 'abc', RememberMeCookie: 'rm', aws: undefined } });
    const header = await grabSessionCookie();
    expect(header).toBe('JSESSIONID=abc; RememberMeCookie=rm');
    // declared the right cookie keys + setlist.fm domain
    const arg = bootstrap.mock.calls[0][0];
    expect(arg.domains).toEqual(['setlist.fm']);
    expect(arg.storageSubdomain).toBe('www');
    expect(arg.declare.cookies).toEqual(['JSESSIONID', 'RememberMeCookie', 'aws-waf-token']);
  });

  it('returns null when the fallback is disabled (no bridge call)', async () => {
    process.env.SETLIST_DISABLE_FETCHPROXY = '1';
    expect(await grabSessionCookie()).toBeNull();
    expect(bootstrap).not.toHaveBeenCalled();
  });

  it('throws an actionable error when no session cookie is present', async () => {
    bootstrap.mockResolvedValue({ cookies: { 'aws-waf-token': 'x' } });
    await expect(grabSessionCookie()).rejects.toThrow(/sign in|session cookie/i);
  });
});
