import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { registerArtistTools } from '../src/tools/artists.js';
import { registerSetlistTools } from '../src/tools/setlists.js';
import { registerVenueTools } from '../src/tools/venues.js';
import { registerGeoTools } from '../src/tools/geo.js';
import { registerUserTools } from '../src/tools/users.js';
import { registerResolveTools } from '../src/tools/resolve.js';
import { registerAttendanceTools } from '../src/tools/attendance.js';
import { registerUrlTools } from '../src/tools/urls.js';
import { registerUtilityTools } from '../src/tools/utilities.js';
import { client } from '../src/client.js';
import { createTestHarness } from './helpers.js';

// The .mcpb directory/install UI reads manifest.json's tool list, so it must
// name exactly the tools the server registers — no more, no fewer.
describe('manifest.json tool list', () => {
  let harness: Awaited<ReturnType<typeof createTestHarness>>;
  afterAll(async () => {
    if (harness) await harness.close();
  });

  it('matches the registered tool set', async () => {
    harness = await createTestHarness((server) => {
      for (const register of [
        registerArtistTools,
        registerSetlistTools,
        registerVenueTools,
        registerGeoTools,
        registerUserTools,
        registerResolveTools,
        registerAttendanceTools,
        registerUtilityTools,
      ]) {
        register(server, client);
      }
      registerUrlTools(server);
    });
    const registered = (await harness.listTools()).map((t) => t.name).sort();
    const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8')) as {
      tools: { name: string }[];
    };
    expect(manifest.tools.map((t) => t.name).sort()).toEqual(registered);
  });
});
