import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadDotenvSafely, readEnvVar, createApiClient, messageOf, type ApiClient } from '@chrischall/mcp-utils';

// Load .env for local dev (guarded; the mcpb bundle omits dotenv).
const __dirname = dirname(fileURLToPath(import.meta.url));
await loadDotenvSafely({ path: join(__dirname, '..', '.env'), override: false });

const RETRY_5XX = 3; // www.setlist.fm intermittently returns 500/502/503 from its gateway
const RETRY_DELAY_MS = 1200;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// Retry transient gateway errors (502/503/504); createApiClient only retries 429.
async function retryOn5xx<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_5XX; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < RETRY_5XX && /\b50[0234]\b/.test(messageOf(err))) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

const BASE_URL = 'https://www.setlist.fm';
const SERVICE_NAME = 'setlist.fm (web)';
const REQUEST_TIMEOUT_MS = 20_000;
// A browser-like UA; the bare default can trip the site's bot heuristics.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/**
 * Authenticated client for the setlist.fm **website** (not the public REST API).
 * The site has no JSON API for user actions — it's server-rendered HTML plus
 * Apache Wicket stateful AJAX, authenticated by the logged-in session cookie.
 *
 * Auth resolves in order: `SETLIST_SESSION_COOKIE` (env) → a fetchproxy
 * `read_cookies` bootstrap from the signed-in browser tab (lazy, optional) →
 * a deferred config error at request time. Kept entirely separate from the
 * api-key `SetlistClient` so the public-API tools never depend on a session.
 */
export class SetlistWebClient {
  private cookie: string | null;
  private readonly configError: Error;
  private readonly api: ApiClient;

  constructor() {
    this.cookie = readEnvVar('SETLIST_SESSION_COOKIE') ?? null;
    this.configError = new Error(
      'No setlist.fm session: set SETLIST_SESSION_COOKIE (copy the Cookie header from a logged-in www.setlist.fm request) or connect the fetchproxy browser bridge.',
    );
    this.api = createApiClient({
      baseUrl: BASE_URL,
      serviceName: SERVICE_NAME,
      timeout: REQUEST_TIMEOUT_MS,
      retry: { count: 1, delayMs: 2000 },
      baseHeaders: { 'User-Agent': USER_AGENT },
    });
  }

  /**
   * Resolve the session cookie: `SETLIST_SESSION_COOKIE` (env) first, else a
   * one-time fetchproxy `read_cookies` grab from the signed-in tab (lazy-imported
   * so the env path never loads the bridge), else the deferred config error.
   * The grabbed cookie is cached on the instance for the process lifetime.
   */
  private async requireCookie(): Promise<string> {
    if (this.cookie) return this.cookie;
    const { grabSessionCookie } = await import('./fetchproxy-cookie.js');
    const grabbed = await grabSessionCookie();
    if (grabbed) {
      this.cookie = grabbed;
      return grabbed;
    }
    throw this.configError;
  }

  /** GET a page as HTML, authenticated. `path` is appended to the www base URL. */
  async fetchPage(path: string): Promise<string> {
    const cookie = await this.requireCookie();
    return retryOn5xx(() => this.api.fetchHtml('GET', path, { headers: { Cookie: cookie } }));
  }

  /**
   * Replay an Apache Wicket AJAX behavior GET (e.g. the attendance toggle).
   * `ajaxPath` is the per-render URL parsed from a page's `wicketAjaxGet(...)`;
   * `baseUrl` is the rendering page's path (no leading slash) for the
   * `Wicket-Ajax-BaseURL` header. Returns the `<ajax-response>` XML body.
   */
  async wicketAjaxGet(ajaxPath: string, baseUrl: string): Promise<string> {
    const cookie = await this.requireCookie();
    return retryOn5xx(() =>
      this.api.fetchHtml('GET', ajaxPath, {
        headers: {
          Cookie: cookie,
          'Wicket-Ajax': 'true',
          'Wicket-Ajax-BaseURL': baseUrl,
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'text/xml, text/javascript, application/xml, text/html, */*',
        },
      }),
    );
  }
}

/** Module-level singleton (deferred-config: missing session surfaces at request time). */
export const webClient = new SetlistWebClient();
