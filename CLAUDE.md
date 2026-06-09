# setlist-mcp

MCP server for [setlist.fm](https://www.setlist.fm). Wraps the setlist.fm REST API (`https://api.setlist.fm/rest`) and exposes 20 tools to Claude over stdio: 18 read-only (the REST API has no write endpoints — those are all GETs) plus 2 authenticated "I was there" attendance actions (`setlist_mark_attended` / `setlist_unmark_attended`) performed against the logged-in **website** (Apache Wicket), not the REST API.

## Commands

```bash
npm run build          # tsc + esbuild bundle → dist/index.js + dist/bundle.js
npm test               # vitest run
npm run test:watch     # vitest watch
npm run test:coverage  # vitest run --coverage (v8 reporter, no thresholds)
```

Run locally (requires built `dist/`):
```bash
SETLIST_API_KEY=xxx node dist/index.js
```

## Tool naming

All tools are prefixed `setlist_` (e.g. `setlist_search_setlists`, `setlist_get_artist`).

## Architecture

```
src/
  version.ts      # single source of truth for VERSION (x-release-please-version)
  index.ts        # MCP server entry — runMcp({ name, version, banner, tools })
  client.ts       # SetlistClient — reads SETLIST_API_KEY, attaches x-api-key
                  #   header per request, 15s request timeout + 2s 429 retry (both
                  #   via createApiClient), normalizes response eventDate → ISO
                  #   (deepMapStringField + dmyToIso from @chrischall/mcp-utils)
  attribution.ts  # ATTRIBUTION_NOTE appended to data tool descriptions
  tools/
    artists.ts    # setlist_search_artists, setlist_get_artist, setlist_get_artist_setlists
    setlists.ts   # setlist_search_setlists, setlist_get_setlist, setlist_get_setlist_version
    venues.ts     # setlist_search_venues, setlist_get_venue, setlist_get_venue_setlists
    geo.ts        # setlist_search_cities, setlist_get_city, setlist_search_countries
    users.ts      # setlist_get_user, setlist_get_user_attended, setlist_get_user_edited
    resolve.ts    # setlist_resolve_concerts (batch {artist,date,city?,venue?} → setlist resolver)
    attendance.ts # setlist_mark_attended, setlist_unmark_attended (authenticated website writes via web-client.ts)
    urls.ts       # setlist_id_from_url (pure local parser — extracts the setlist ID from a /setlist/ URL)
    utilities.ts  # setlist_healthcheck
```

Each tool file exports a `register<Domain>Tools(server)` function that calls `server.registerTool(name, { description, annotations, inputSchema }, handler)` (high-level `McpServer` API with zod schemas) and returns results via `textResult(...)`. `index.ts` just wires them all up through `runMcp` from `@chrischall/mcp-utils`.

## Auth & client

setlist.fm authenticates with an **`x-api-key` header** (not a Bearer token). `client.ts` therefore does NOT use `createApiClient`'s `getToken` (which emits `Authorization: Bearer`); instead it attaches `x-api-key` per request in `SetlistClient.request()`. `Accept: application/json` is the `fetchJson` default (the API serves XML otherwise). An optional `SETLIST_ACCEPT_LANGUAGE` is sent as `Accept-Language` via `baseHeaders` to localize city/country names.

**Deferred-config-error pattern:** `SetlistClient` reads `SETLIST_API_KEY` in its constructor; if missing it stores a `configError` instead of throwing, and re-raises it from `requireKey()` at request time. This lets the server boot and answer the host's install-time `tools/list` probe even without a key — the error only surfaces on the first tool call.

## Environment

```
SETLIST_API_KEY=<your key>        # Required. Apply at https://www.setlist.fm/settings/api
SETLIST_ACCEPT_LANGUAGE=en        # Optional. one of: en, es, fr, de, pt, tr, it, pl
```

Loaded via `dotenv` from `.env` next to `dist/` (guarded import; the mcpb bundle omits `dotenv` and the host provides env). `readEnvVar` treats blank, `"undefined"`, `"null"`, and unsubstituted `${FOO}` placeholders as unset.

## Testing

Tests live in `tests/` (vitest). No real API calls — `fetch` (in `client.test.ts`) and `client.request` (in tool tests) are mocked. `tests/server-boot.test.ts` spawns the real built artifacts (`dist/bundle.js` with no `node_modules`, and `dist/index.js`) and asserts the `initialize` + `tools/list` handshake.

**Vitest gotcha (tool error-path tests):** when a `beforeEach(mockClear)` is in play, an *eager* `mockRejectedValue(...)` loses vitest's settled-result tracking and the rejection is mis-reported as unhandled, failing the test even though the handler caught it. Reject *lazily* instead: `mockRequest.mockImplementationOnce(() => Promise.reject(new Error(...)))`. See `tests/tools/utilities.test.ts`.

## Versioning

Version lives in `src/version.ts` (`VERSION`, marked `// x-release-please-version`) and is mirrored into `package.json`, `manifest.json`, `server.json` (×2), and the two `.claude-plugin/*` manifests. **Don't hand-bump** — release-please owns it via the `extra-files` list in `release-please-config.json`. `versionSyncTest` (in `tests/version-sync.test.ts`) fails the build if any `x-release-please-version` marker drifts from `package.json`.

## Publishing constraints

The MCP Registry caps `server.json`'s `description` at **100 characters** — over that, `mcp-publisher publish` 422s. Check with `jq -r '.description | length' server.json`.

## Pull requests & release notes

**Default workflow: branch + PR, even for solo work.** Apply exactly one release-notes label per PR (`enhancement`, `bug`, `security`, `refactor`, `documentation`, `test`, `dependencies`, `ci`/`github_actions`, or `ignore-for-release`). The PR title becomes the changelog bullet.

**Don't merge PRs yourself.** `pr-auto-review.yml` reviews every PR and adds `ready-to-merge` on a `pass` verdict; `auto-merge.yml` then squash-merges once CI is green. Open a PR only when the change is COMPLETE in a single push — auto-merge ships it the moment review passes, and later commits orphan onto a stale branch. Need a checkpoint without shipping? Open it `--draft` (auto-review skips drafts).

## API terms (compliance — don't regress these)

Governed by the [setlist.fm API terms](https://www.setlist.fm/help/api-terms). The implementation encodes them:

- **Attribution.** The terms require a *followable* link to setlist.fm wherever the data is shown. Every setlist/artist/venue object includes a `url`, and `textResult` passes the full JSON through, so the link is always in the output. `src/attribution.ts` (`ATTRIBUTION_NOTE`) is appended to every data tool's description so the model surfaces that `url`; `tests/tools/attribution.test.ts` asserts coverage (the `NO_DATA_TOOLS` set — `setlist_healthcheck` and `setlist_id_from_url` — must NOT carry the note, as they surface no setlist.fm data). If you reword the note, keep the `followable attribution` marker or update the test.
- **No persistent caching.** The terms forbid retaining copies beyond short-lived caching and require live retrieval. The client makes a direct API call per request and keeps no store — **do not add a response cache or local datastore.**
- **Non-commercial only**; the free key doesn't cover commercial use.
- **Rate limits.** Standard tier ≈ 2 req/sec; a 429 is retried once after 2s (`client.ts`).
- **API key** is never logged or returned; `.env` is gitignored.

## Gotchas

- **ESM + NodeNext**: relative imports use `.js` extensions even from `.ts` source.
- **Read-only API**: setlist.fm exposes no write endpoints; there are no mutating tools and no `confirm` gating.
- **ISO date surface**: the whole MCP surface uses ISO `yyyy-MM-dd`. The API does NOT — it takes event dates as `dd-MM-yyyy`, `lastUpdated` as `yyyyMMddHHmmss`, and returns `eventDate` as `dd-MM-yyyy`. The shared `@chrischall/mcp-utils` date helpers translate at the boundary: tool inputs convert ISO→API (`isoToDmy`/`isoToCompactTimestamp` in `setlists.ts`), and `client.request` rewrites every response `eventDate`→ISO via `deepMapStringField(data, 'eventDate', dmyToIso)`. Keep new date-bearing inputs/outputs ISO and route them through those helpers. `lastUpdated` outputs are already ISO-8601 timestamps and are left as-is.
- **Request timeout**: `createApiClient({ timeout: 15_000 })` bounds each request (throws mcp-utils' `RequestTimeoutError`) so a hung upstream fails fast instead of hanging the tool call.
- **Rate limiting**: 429 retries once after 2s, then throws. setlist.fm's standard tier is ~2 req/sec, 1440/day.
- **Bad key → 403** (not 401): `setlist_healthcheck` distinguishes "no key" vs "bad key (401/403)" vs other errors in its hint.
- **MusicBrainz IDs**: artists are keyed by `mbid`; setlists by `setlistId`; venues by `venueId`; cities by `geoId`. `search_*` tools return these — chain them into the `get_*` tools.
- **stdio transport**: server logs to **stderr** only — stdout is reserved for JSON-RPC.
- **Lazy optional deps in the bundle**: the `.mcpb` ships no `node_modules`; keep any externalized/optional dep import lazy (`await import(...)`) so the bundled server boots.
