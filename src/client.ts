import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  loadDotenvSafely,
  readEnvVar,
  createApiClient,
  type ApiClient,
} from '@chrischall/mcp-utils';

// Load .env for local dev; silently skip if dotenv is unavailable (e.g. the
// mcpb bundle). `loadDotenvSafely` swallows a missing dotenv module and never
// lets .env override a host-provided value.
const __dirname = dirname(fileURLToPath(import.meta.url));
await loadDotenvSafely({ path: join(__dirname, '..', '.env'), override: false });

const BASE_URL = 'https://api.setlist.fm/rest';
const SERVICE_NAME = 'setlist.fm';

/** Query params for a GET — undefined/null/empty members are dropped. */
export type Query = Record<string, string | number | undefined>;

export class SetlistClient {
  private readonly apiKey: string | null;
  private readonly configError: Error | null;
  private readonly api: ApiClient;

  /**
   * Defer the config error so the server can still start (and answer the host's
   * install-time tools/list smoke test) when SETLIST_API_KEY isn't set yet.
   * Tool calls re-raise the error at request time via {@link requireKey}.
   */
  constructor() {
    const key = readEnvVar('SETLIST_API_KEY');
    if (!key) {
      this.apiKey = null;
      this.configError = new Error('SETLIST_API_KEY environment variable is required');
    } else {
      this.apiKey = key;
      this.configError = null;
    }

    // setlist.fm authenticates with an `x-api-key` header (not a Bearer token),
    // attached per-request in `request()`. We localize city/country names via an
    // optional `Accept-Language`. `Accept: application/json` is already the
    // fetchJson default (the API serves XML otherwise).
    const lang = readEnvVar('SETLIST_ACCEPT_LANGUAGE');
    this.api = createApiClient({
      baseUrl: BASE_URL,
      serviceName: SERVICE_NAME,
      retry: { count: 1, delayMs: 2000 },
      baseHeaders: lang ? { 'Accept-Language': lang } : undefined,
    });
  }

  private requireKey(): string {
    if (this.configError) throw this.configError;
    return this.apiKey!;
  }

  /**
   * Issue a request with the `x-api-key` header attached. `requireKey()` runs
   * here (not in the constructor) so a missing key surfaces at request time,
   * keeping the deferred-config-error pattern intact.
   */
  async request<T>(
    method: string,
    path: string,
    opts: { query?: Query; body?: unknown } = {},
  ): Promise<T> {
    const apiKey = this.requireKey();
    return this.api.fetchJson<T>(method, path, {
      headers: { 'x-api-key': apiKey },
      ...(opts.query !== undefined ? { query: opts.query } : {}),
      ...(opts.body !== undefined ? { body: opts.body } : {}),
    });
  }
}

/**
 * Module-level singleton shared by every tool module. Constructing it here (not
 * in `index.ts`) keeps the deferred-config-error pattern: the server boots and
 * answers the host's install-time tools/list smoke test even when the API key
 * is absent — the error only surfaces on the first request.
 */
export const client = new SetlistClient();
