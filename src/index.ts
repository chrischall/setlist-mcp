#!/usr/bin/env node
import { runMcp } from '@chrischall/mcp-utils';
import { VERSION } from './version.js';
import { registerArtistTools } from './tools/artists.js';
import { registerSetlistTools } from './tools/setlists.js';
import { registerVenueTools } from './tools/venues.js';
import { registerGeoTools } from './tools/geo.js';
import { registerUserTools } from './tools/users.js';
import { registerResolveTools } from './tools/resolve.js';
import { registerAttendanceTools } from './tools/attendance.js';
import { registerUtilityTools } from './tools/utilities.js';

// The setlist.fm client is a module-level singleton (imported by each tool
// module) that defers its config error to the first request. That preserves the
// deferred-config-error pattern: the server boots and answers the host's
// install-time tools/list smoke test even when SETLIST_API_KEY is absent — the
// configuration error only surfaces on the first tool call.
await runMcp({
  name: 'setlist-mcp',
  version: VERSION,
  banner:
    '[setlist-mcp] This project was developed and is maintained by AI (Claude Opus 4.8). Use at your own discretion.',
  tools: [
    registerArtistTools,
    registerSetlistTools,
    registerVenueTools,
    registerGeoTools,
    registerUserTools,
    registerResolveTools,
    registerAttendanceTools,
    registerUtilityTools,
  ],
});
