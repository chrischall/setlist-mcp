# setlist-mcp

[![CI](https://github.com/chrischall/setlist-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/chrischall/setlist-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/setlist-mcp)](https://www.npmjs.com/package/setlist-mcp)

MCP server for [setlist.fm](https://www.setlist.fm) — search concert setlists, artists, venues, tours, and cities from Claude via natural language. Read-only (setlist.fm exposes no write API).

> This project was developed and is maintained by AI (Claude). Use at your own discretion.

## What it does

Exposes 16 read-only tools over the [setlist.fm REST API](https://api.setlist.fm/docs/1.0/index.html):

| Area | Tools |
|------|-------|
| Artists | `setlist_search_artists`, `setlist_get_artist`, `setlist_get_artist_setlists` |
| Setlists | `setlist_search_setlists`, `setlist_get_setlist`, `setlist_get_setlist_version` |
| Venues | `setlist_search_venues`, `setlist_get_venue`, `setlist_get_venue_setlists` |
| Cities & countries | `setlist_search_cities`, `setlist_get_city`, `setlist_search_countries` |
| Users | `setlist_get_user`, `setlist_get_user_attended`, `setlist_get_user_edited` |
| Utility | `setlist_healthcheck` |

## Setup

Get a free API key (non-commercial use) at [setlist.fm/settings/api](https://www.setlist.fm/settings/api), then add the server to your `.mcp.json`:

```json
{
  "mcpServers": {
    "setlist": {
      "command": "npx",
      "args": ["-y", "setlist-mcp"],
      "env": {
        "SETLIST_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Optional: `SETLIST_ACCEPT_LANGUAGE` (one of `en, es, fr, de, pt, tr, it, pl`) localizes city/country names.

See [SKILL.md](SKILL.md) for from-source setup, the full tool reference, and example flows.

## Development

```bash
npm install
npm run build   # tsc + esbuild bundle → dist/
npm test        # vitest
```

For local runs, put `SETLIST_API_KEY=<key>` in a `.env` file (gitignored) next to the project root.

See [CLAUDE.md](CLAUDE.md) for architecture, conventions, and gotchas.

## License

MIT
