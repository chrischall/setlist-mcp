# Changelog

## [0.10.0](https://github.com/chrischall/setlist-mcp/compare/v0.9.9...v0.10.0) (2026-08-29)


### Features

* **deps:** take @fetchproxy/server 2.2.0 so the concentrator can bind its sandbox address ([#125](https://github.com/chrischall/setlist-mcp/issues/125)) ([77880e0](https://github.com/chrischall/setlist-mcp/commit/77880e067757c9bffbda8e5910f849871dd876fd))

## [0.9.9](https://github.com/chrischall/setlist-mcp/compare/v0.9.8...v0.9.9) (2026-08-28)


### Bug Fixes

* **egress:** declare only the hosts the server process dials in mint.yaml ([#123](https://github.com/chrischall/setlist-mcp/issues/123)) ([0dce69a](https://github.com/chrischall/setlist-mcp/commit/0dce69a0849de9dca3a9fb9c16cb42b78edfbf41))

## [0.9.8](https://github.com/chrischall/setlist-mcp/compare/v0.9.7...v0.9.8) (2026-08-27)


### Documentation

* npm test now typechecks before running vitest ([#119](https://github.com/chrischall/setlist-mcp/issues/119)) ([21aff5e](https://github.com/chrischall/setlist-mcp/commit/21aff5e85598d8a26fe8d363dae81e5097cf4d35))
* **readme:** npm test now typechecks before running vitest ([#121](https://github.com/chrischall/setlist-mcp/issues/121)) ([4520126](https://github.com/chrischall/setlist-mcp/commit/4520126e1cf8b76e9ba3ced6c315594b151dd8b1))
* **skill:** declare the name this skill actually publishes under ([#115](https://github.com/chrischall/setlist-mcp/issues/115)) ([140508e](https://github.com/chrischall/setlist-mcp/commit/140508e2b438c489bd101a756a80fe88d02e08c3))

## [0.9.7](https://github.com/chrischall/setlist-mcp/compare/v0.9.6...v0.9.7) (2026-08-09)


### Refactor

* **connector:** retire the standalone Cloudflare Worker connector ([#101](https://github.com/chrischall/setlist-mcp/issues/101)) ([7fc2d53](https://github.com/chrischall/setlist-mcp/commit/7fc2d5330f2faf561ee8961dca4577030a661314))

## [0.9.6](https://github.com/chrischall/setlist-mcp/compare/v0.9.5...v0.9.6) (2026-08-06)


### Bug Fixes

* **deps:** move to @fetchproxy/server 2.0.0 for the v3 handshake ([#99](https://github.com/chrischall/setlist-mcp/issues/99)) ([56b029c](https://github.com/chrischall/setlist-mcp/commit/56b029c44aec12d227842aa579d8fc6140629924))

## [0.9.5](https://github.com/chrischall/setlist-mcp/compare/v0.9.4...v0.9.5) (2026-08-03)


### Bug Fixes

* **attendance:** re-lift an expired browser session instead of wedging ([#90](https://github.com/chrischall/setlist-mcp/issues/90)) ([ceb3432](https://github.com/chrischall/setlist-mcp/commit/ceb3432654385eabe8618d64f3d98923c05597c0))
* **web-client:** single-flight requireCookie and land the doc I claimed ([#95](https://github.com/chrischall/setlist-mcp/issues/95)) ([5c4a02f](https://github.com/chrischall/setlist-mcp/commit/5c4a02f2545d510ef6eeaa7cb604be85da992f78)), closes [#94](https://github.com/chrischall/setlist-mcp/issues/94)
* **web-client:** single-flight the re-lift so concurrent writes can't race ([#93](https://github.com/chrischall/setlist-mcp/issues/93)) ([89c4795](https://github.com/chrischall/setlist-mcp/commit/89c4795bf06da5a4c8b772959d183e3012c2c59b)), closes [#91](https://github.com/chrischall/setlist-mcp/issues/91)

## [0.9.4](https://github.com/chrischall/setlist-mcp/compare/v0.9.3...v0.9.4) (2026-07-30)


### Bug Fixes

* **deps:** bump @fetchproxy/* to 1.7.0 and @chrischall/mcp-utils to 0.14.0 ([#85](https://github.com/chrischall/setlist-mcp/issues/85)) ([fe8af94](https://github.com/chrischall/setlist-mcp/commit/fe8af94fd9fa85e251a2077932eef2edfa962fdb))

## [0.9.3](https://github.com/chrischall/setlist-mcp/compare/v0.9.2...v0.9.3) (2026-07-27)


### Bug Fixes

* **deps:** require @chrischall/mcp-connector &gt;=1.1.1 ([#78](https://github.com/chrischall/setlist-mcp/issues/78)) ([f843703](https://github.com/chrischall/setlist-mcp/commit/f84370372bd5e149d991086f910b7538af35f9e1))

## [0.9.2](https://github.com/chrischall/setlist-mcp/compare/v0.9.1...v0.9.2) (2026-07-19)


### Bug Fixes

* **deps:** move to workers-oauth-provider 0.8.x and mcp-connector 1.0.0 ([#68](https://github.com/chrischall/setlist-mcp/issues/68)) ([3c39ce0](https://github.com/chrischall/setlist-mcp/commit/3c39ce0ecb0fa7fd64c37f24d9794d3bebbe86cf))

## [0.9.1](https://github.com/chrischall/setlist-mcp/compare/v0.9.0...v0.9.1) (2026-07-19)


### Bug Fixes

* **ci:** run the Workers test pool in CI ([#67](https://github.com/chrischall/setlist-mcp/issues/67)) ([19c0a42](https://github.com/chrischall/setlist-mcp/commit/19c0a4208db2a83abe331641f95449ff501ac3c0))


### Documentation

* replace duplicated fleet policy with a pointer ([#65](https://github.com/chrischall/setlist-mcp/issues/65)) ([9e698e4](https://github.com/chrischall/setlist-mcp/commit/9e698e4b5e42e1a4b0c0e335627acb3dd793383a))

## [0.9.0](https://github.com/chrischall/setlist-mcp/compare/v0.8.0...v0.9.0) (2026-07-14)


### Features

* add hosted Cloudflare Worker connector (read-only v1) ([#62](https://github.com/chrischall/setlist-mcp/issues/62)) ([0869e50](https://github.com/chrischall/setlist-mcp/commit/0869e50199115fdefc4dedeccbad31bb0f8e2568))


### Bug Fixes

* guard client.ts .env load so the Worker starts + wire OAUTH_KV id ([#64](https://github.com/chrischall/setlist-mcp/issues/64)) ([3aa1dac](https://github.com/chrischall/setlist-mcp/commit/3aa1dacb93ddb0e31e0966063cbb7a0ecd22a197))


### Refactor

* pass client into tool registrars (transport-neutral) ([#60](https://github.com/chrischall/setlist-mcp/issues/60)) ([7786704](https://github.com/chrischall/setlist-mcp/commit/7786704193de857cce4a9f4d81e22197df9c516e))

## [0.8.0](https://github.com/chrischall/setlist-mcp/compare/v0.7.4...v0.8.0) (2026-07-13)


### Features

* **skill:** add setlist.fm fpx/curl access skill ([#55](https://github.com/chrischall/setlist-mcp/issues/55)) ([2e57c38](https://github.com/chrischall/setlist-mcp/commit/2e57c38041763464e33ef60419ffc00e71cd96ab))


### Bug Fixes

* **skill:** make attendance-write.md's perl parse order-independent ([#59](https://github.com/chrischall/setlist-mcp/issues/59)) ([1fc573d](https://github.com/chrischall/setlist-mcp/commit/1fc573db66a1e74629cf333d4dfb4003c52a1aff)), closes [#56](https://github.com/chrischall/setlist-mcp/issues/56)


### Refactor

* **skill:** move root SKILL.md into skills/, point plugin.json at ./skills/ ([#58](https://github.com/chrischall/setlist-mcp/issues/58)) ([c138479](https://github.com/chrischall/setlist-mcp/commit/c13847929c9957a62690db56ccdd6aa3e7bd5a9b))

## [0.7.4](https://github.com/chrischall/setlist-mcp/compare/v0.7.3...v0.7.4) (2026-07-07)


### Bug Fixes

* bump @chrischall/mcp-utils to ^0.12.0 ([#50](https://github.com/chrischall/setlist-mcp/issues/50)) ([dca5296](https://github.com/chrischall/setlist-mcp/commit/dca52960a8818a16f495b17e7f9d1ccbaee9546e))


### Refactor

* adopt withDeadline + createAuthResolver; bump mcp-utils to 0.10.5 ([#46](https://github.com/chrischall/setlist-mcp/issues/46)) ([05d8c28](https://github.com/chrischall/setlist-mcp/commit/05d8c282f42afbb709750618a5d105485e7b72cd))


### Documentation

* document first-party dependency-bump label exception ([#51](https://github.com/chrischall/setlist-mcp/issues/51)) ([3291794](https://github.com/chrischall/setlist-mcp/commit/32917943ab6d86c171905248c32b8854035941a6))

## [0.7.3](https://github.com/chrischall/setlist-mcp/compare/v0.7.2...v0.7.3) (2026-06-15)


### Documentation

* audit CLAUDE.md and add auto-review follow-up convention ([#37](https://github.com/chrischall/setlist-mcp/issues/37)) ([f7adf83](https://github.com/chrischall/setlist-mcp/commit/f7adf8316a88a8acb6922987bdf5d24b0d24d98c))
* require Conventional Commit PR titles for release-please ([#32](https://github.com/chrischall/setlist-mcp/issues/32)) ([5f77353](https://github.com/chrischall/setlist-mcp/commit/5f77353b8f64554bc68c10e93ecdbcace1b0d848))

## [0.7.2](https://github.com/chrischall/setlist-mcp/compare/v0.7.1...v0.7.2) (2026-06-13)


### Bug Fixes

* bot PRs bypass the CI gate unconditionally ([#28](https://github.com/chrischall/setlist-mcp/issues/28)) ([bbbf7d5](https://github.com/chrischall/setlist-mcp/commit/bbbf7d5cdb1899956e9bae89d6e61a797e925679))


### Documentation

* add MIT LICENSE file and README badges ([#25](https://github.com/chrischall/setlist-mcp/issues/25)) ([110ffc3](https://github.com/chrischall/setlist-mcp/commit/110ffc3ee77a4da33bf5b80e6c5a05fdacd317e8))

## [0.7.1](https://github.com/chrischall/setlist-mcp/compare/v0.7.0...v0.7.1) (2026-06-09)


### Refactor

* migrate pacing and status sniffing to mcp-utils 0.7.0 primitives ([#23](https://github.com/chrischall/setlist-mcp/issues/23)) ([b46f635](https://github.com/chrischall/setlist-mcp/commit/b46f6352ae58b4dda63720fc41433224140f21c3))

## [0.7.0](https://github.com/chrischall/setlist-mcp/compare/v0.6.1...v0.7.0) (2026-06-09)


### Features

* setlist_id_from_url — extract a setlist ID from a setlist.fm URL ([#20](https://github.com/chrischall/setlist-mcp/issues/20)) ([23fa915](https://github.com/chrischall/setlist-mcp/commit/23fa915613e07d3ffb4dfffa53b57ada3a294336))


### Bug Fixes

* detect session expiry and pace authenticated writes in attendance ([#21](https://github.com/chrischall/setlist-mcp/issues/21)) ([22541de](https://github.com/chrischall/setlist-mcp/commit/22541de9fa28f8f837acd386d68bdc8221f1fd1a))

## [0.6.1](https://github.com/chrischall/setlist-mcp/compare/v0.6.0...v0.6.1) (2026-06-09)


### Bug Fixes

* fetchproxy cookie grab (apex scope + www subdomain) and transient 5xx retry ([#17](https://github.com/chrischall/setlist-mcp/issues/17)) ([a155364](https://github.com/chrischall/setlist-mcp/commit/a155364e9dccf4caeca3c0e0354aa81b9bb5fb7d))

## [0.6.0](https://github.com/chrischall/setlist-mcp/compare/v0.5.1...v0.6.0) (2026-06-09)


### Features

* authenticated "I was there" attendance writes (cookie-session) ([#16](https://github.com/chrischall/setlist-mcp/issues/16)) ([d754561](https://github.com/chrischall/setlist-mcp/commit/d754561b684f642ebbc7fe2a5a88c5ec208b42a3))
* tour-reference fallback for empty stubs in resolve_concerts ([#14](https://github.com/chrischall/setlist-mcp/issues/14)) ([c3936d8](https://github.com/chrischall/setlist-mcp/commit/c3936d8597ece90f6dc8689fbbab0feac5272037))

## [0.5.1](https://github.com/chrischall/setlist-mcp/compare/v0.5.0...v0.5.1) (2026-06-08)


### Bug Fixes

* pace resolve_concerts upstream calls and budget-bound the batch (Bug 6) ([#12](https://github.com/chrischall/setlist-mcp/issues/12)) ([e748da5](https://github.com/chrischall/setlist-mcp/commit/e748da52b987f7590645921f11244a2e67d09c2b))

## [0.5.0](https://github.com/chrischall/setlist-mcp/compare/v0.4.0...v0.5.0) (2026-06-08)


### Features

* add setlist_resolve_concerts batch resolver (Gaps 2 & 5) ([#11](https://github.com/chrischall/setlist-mcp/issues/11)) ([a9a9eb8](https://github.com/chrischall/setlist-mcp/commit/a9a9eb8c0589c140093d7086e3b977a9f78b6ae8))
* flag empty stub setlists and surface venue/city + festival filters ([#9](https://github.com/chrischall/setlist-mcp/issues/9)) ([c157388](https://github.com/chrischall/setlist-mcp/commit/c15738826551e3e326ba58a8f9996c21766c691c))

## [0.4.0](https://github.com/chrischall/setlist-mcp/compare/v0.3.0...v0.4.0) (2026-06-07)


### Features

* use ISO yyyy-MM-dd for all dates on the MCP surface ([#7](https://github.com/chrischall/setlist-mcp/issues/7)) ([49ad64a](https://github.com/chrischall/setlist-mcp/commit/49ad64a51e0f2955581a402ffbad2663d063ce53))


### Bug Fixes

* accept ISO dates in search_setlists and bound requests with a timeout ([#5](https://github.com/chrischall/setlist-mcp/issues/5)) ([2f9f86e](https://github.com/chrischall/setlist-mcp/commit/2f9f86e1101d26592a0ceff974e9783aa63322ba))


### Refactor

* source date and timeout helpers from @chrischall/mcp-utils ([#8](https://github.com/chrischall/setlist-mcp/issues/8)) ([182d6fb](https://github.com/chrischall/setlist-mcp/commit/182d6fbacee424cfcf9a2d55dce375082e3f46f8))

## [0.3.0](https://github.com/chrischall/setlist-mcp/compare/v0.2.0...v0.3.0) (2026-06-07)


### Features

* surface setlist.fm attribution links and document API terms ([#3](https://github.com/chrischall/setlist-mcp/issues/3)) ([8e70ecd](https://github.com/chrischall/setlist-mcp/commit/8e70ecd764d7802342d61621a9dd52349594c954))

## [0.2.0](https://github.com/chrischall/setlist-mcp/compare/v0.1.0...v0.2.0) (2026-06-07)


### Features

* initial setlist.fm MCP server with 16 read-only tools ([37740b4](https://github.com/chrischall/setlist-mcp/commit/37740b4e4259cf2c4e597f4852e283cd156e08fd))
