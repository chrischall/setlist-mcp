import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import { EdgeBlockedError, messageOf, minifiedResult, toolAnnotations } from '@chrischall/mcp-utils';
import type { SetlistClient } from '../client.js';

interface CountriesResponse {
  total?: number;
  country?: unknown[];
}

export function registerUtilityTools(server: McpServer, client: SetlistClient): void {
  server.registerTool(
    'setlist_healthcheck',
    {
      title: 'Verify setlist.fm API key + connectivity',
      description:
        'Confirm the API key is configured and works by calling the setlist.fm countries endpoint. Reports {ok, authenticated, country_count} with a plain-English hint distinguishing "no key" vs "bad key" vs "API error". Read-only.',
      annotations: toolAnnotations({
        title: 'Verify setlist.fm API key + connectivity',
        readOnly: true,
        idempotent: true,
        openWorld: true,
      }),
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const data = await client.request<CountriesResponse>('GET', '/1.0/search/countries');
        const count = data.total ?? data.country?.length ?? 0;
        return minifiedResult({
          ok: true,
          authenticated: true,
          country_count: count,
          hint: 'API key is valid and the setlist.fm API is reachable.',
        });
      } catch (e) {
        const msg = messageOf(e);
        // A CDN/WAF refused the request before setlist.fm saw the key. Checked
        // first: its message still says "HTTP 403", which the bad-key test
        // below would read as a rejected key (chrischall/mcp-host#1015).
        if (e instanceof EdgeBlockedError) {
          return minifiedResult({
            ok: false,
            authenticated: false,
            edge_blocked: true,
            error: msg,
            hint: `setlist.fm's CDN/WAF (${e.vendor}) blocked the request before it reached the API, so the key was not checked. This is usually a block on this host's IP address or request fingerprint — changing SETLIST_API_KEY will not fix it. Retry later or from another network.`,
          });
        }
        const noKey = /environment variable is required/.test(msg);
        const badKey = /\b(401|403)\b/.test(msg);
        return minifiedResult({
          ok: false,
          authenticated: false,
          error: msg,
          hint: noKey
            ? 'Set SETLIST_API_KEY (in .env or the MCP host env), then retry. Apply for a key at https://www.setlist.fm/settings/api.'
            : badKey
              ? 'The API key was rejected (401/403). Verify SETLIST_API_KEY is correct and active.'
              : 'The setlist.fm API call failed — it may be rate-limited or temporarily unavailable. Retry shortly.',
        });
      }
    },
  );
}
