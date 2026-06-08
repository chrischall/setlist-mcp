# Changelog

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
