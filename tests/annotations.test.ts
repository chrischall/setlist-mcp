import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

const WRITES = ['setlist_mark_attended', 'setlist_unmark_attended'];

// Fleet convention: every tool states all of its hints explicitly (via
// toolAnnotations) so a client never falls back to spec defaults — notably
// destructiveHint, which defaults to TRUE whenever readOnlyHint is false.
describe('tool annotations', () => {
  let harness: Awaited<ReturnType<typeof createTestHarness>>;
  let tools: Awaited<ReturnType<typeof harness.client.listTools>>['tools'];

  beforeAll(async () => {
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
    tools = (await harness.client.listTools()).tools;
  });
  afterAll(async () => {
    if (harness) await harness.close();
  });

  it('every tool states readOnly, idempotent and openWorld hints', () => {
    for (const t of tools) {
      expect(t.annotations?.readOnlyHint, t.name).toBe(!WRITES.includes(t.name));
      expect(typeof t.annotations?.idempotentHint, t.name).toBe('boolean');
      expect(typeof t.annotations?.openWorldHint, t.name).toBe('boolean');
    }
  });

  it('the attendance toggles are reversible, so not destructive', () => {
    for (const name of WRITES) {
      const t = tools.find((x) => x.name === name)!;
      expect(t.annotations?.destructiveHint, name).toBe(false);
      expect(t.annotations?.openWorldHint, name).toBe(true);
    }
  });

  it('write descriptions name both auth paths and the real verification step', () => {
    for (const name of WRITES) {
      const d = tools.find((x) => x.name === name)!.description ?? '';
      expect(d, name).toMatch(/SETLIST_SESSION_COOKIE/);
      expect(d, name).toMatch(/browser/i);
      expect(d, name).toMatch(/re-reading the setlist page/i);
      expect(d, name).not.toMatch(/attended list\./i);
    }
  });
});
