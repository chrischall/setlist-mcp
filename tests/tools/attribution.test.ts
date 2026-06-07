import { describe, it, expect, afterAll } from 'vitest';
import { registerArtistTools } from '../../src/tools/artists.js';
import { registerSetlistTools } from '../../src/tools/setlists.js';
import { registerVenueTools } from '../../src/tools/venues.js';
import { registerGeoTools } from '../../src/tools/geo.js';
import { registerUserTools } from '../../src/tools/users.js';
import { registerUtilityTools } from '../../src/tools/utilities.js';
import { ATTRIBUTION_NOTE } from '../../src/attribution.js';
import { createTestHarness } from '../helpers.js';

// setlist.fm's API terms require followable attribution wherever their data is
// shown. Every tool that returns setlist.fm data must instruct the model to
// surface the source link; setlist_healthcheck (no data) must not.
const MARKER = 'followable attribution';

describe('attribution coverage', () => {
  let harness: Awaited<ReturnType<typeof createTestHarness>>;
  afterAll(async () => {
    if (harness) await harness.close();
  });

  it('every data tool carries the attribution note; healthcheck does not', async () => {
    expect(ATTRIBUTION_NOTE).toContain(MARKER); // guards the marker if the note is reworded

    harness = await createTestHarness((server) => {
      registerArtistTools(server);
      registerSetlistTools(server);
      registerVenueTools(server);
      registerGeoTools(server);
      registerUserTools(server);
      registerUtilityTools(server);
    });

    // harness.listTools() returns names only; read full descriptions via the
    // raw MCP client.
    const { tools } = await harness.client.listTools();
    for (const tool of tools) {
      const hasNote = (tool.description ?? '').includes(MARKER);
      if (tool.name === 'setlist_healthcheck') {
        expect(hasNote, 'healthcheck should not carry the attribution note').toBe(false);
      } else {
        expect(hasNote, `${tool.name} is missing the attribution note`).toBe(true);
      }
    }
  });
});
