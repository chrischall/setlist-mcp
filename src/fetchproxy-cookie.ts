import { readEnvVar } from '@chrischall/mcp-utils';
import { VERSION } from './version.js';

// The cookies that authenticate a www.setlist.fm session: JSESSIONID is the
// (HttpOnly) Wicket session, RememberMeCookie re-establishes login, aws-waf-token
// clears the WAF. read_cookies uses chrome.cookies.get, which DOES see HttpOnly
// cookies (page JS cannot), so the bridge can lift JSESSIONID.
const SESSION_COOKIE_KEYS = ['JSESSIONID', 'RememberMeCookie', 'aws-waf-token'];

// Bound the bridge round-trip so a wedged/absent extension fails fast instead of
// hanging the tool call.
const BOOTSTRAP_TIMEOUT_MS = 15_000;

function fetchproxyDisabled(): boolean {
  const raw = readEnvVar('SETLIST_DISABLE_FETCHPROXY');
  return raw !== undefined && ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(
          'fetchproxy: timed out waiting for the browser bridge. Is the Transporter extension running and signed into setlist.fm in that browser?',
        )),
        ms,
      ).unref?.(),
    ),
  ]);
}

/**
 * One-shot fetchproxy bootstrap: lift the logged-in setlist.fm session cookies
 * out of the signed-in browser tab (via the Transporter extension), assemble a
 * `Cookie` header, and return it — fetchproxy is NOT in the hot path afterward.
 * Used only when `SETLIST_SESSION_COOKIE` is unset.
 *
 * Returns `null` when the fallback is disabled; throws an actionable error if the
 * bridge is unreachable or no session cookie is present.
 */
export async function grabSessionCookie(): Promise<string | null> {
  if (fetchproxyDisabled()) return null;

  let bootstrap: typeof import('@fetchproxy/bootstrap').bootstrap;
  try {
    ({ bootstrap } = await import('@fetchproxy/bootstrap'));
  } catch {
    return null; // bridge package unavailable (shouldn't happen — bundled)
  }

  const session = await withTimeout(
    bootstrap({
      serverName: 'setlist-mcp',
      version: VERSION,
      domains: ['www.setlist.fm'],
      declare: { cookies: SESSION_COOKIE_KEYS, localStorage: [], sessionStorage: [], captureHeaders: [] },
    }),
    BOOTSTRAP_TIMEOUT_MS,
  );

  const cookies: Record<string, string> = session.cookies ?? {};
  const header = SESSION_COOKIE_KEYS.filter((k) => cookies[k]).map((k) => `${k}=${cookies[k]}`).join('; ');
  if (!cookies.JSESSIONID && !cookies.RememberMeCookie) {
    throw new Error(
      'fetchproxy: no setlist.fm session cookie found — sign in at https://www.setlist.fm in the browser running the Transporter extension, then retry.',
    );
  }
  return header;
}
