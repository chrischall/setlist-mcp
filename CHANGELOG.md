# Changelog

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
