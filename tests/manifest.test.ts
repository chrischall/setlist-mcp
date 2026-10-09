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

// The env surface each install path exposes. The server boots and serves
// tools/list without SETLIST_API_KEY (deferred config error) and the
// attendance + URL tools never need it, so no install path may demand it.
describe('manifest.json / server.json env surface', () => {
  const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8')) as {
    server: { mcp_config: { env: Record<string, string> } };
    user_config: Record<string, { required?: boolean }>;
  };
  const serverJson = JSON.parse(readFileSync(new URL('../server.json', import.meta.url), 'utf8')) as {
    packages: { environmentVariables: { name: string; isRequired?: boolean }[] }[];
  };
  const serverVars = serverJson.packages[0].environmentVariables;
  const EXPECTED = [
    'FETCHPROXY_IDENTITY_DIR',
    'FETCHPROXY_WS_HOST',
    'FETCHPROXY_WS_PORT',
    'SETLIST_ACCEPT_LANGUAGE',
    'SETLIST_API_KEY',
    'SETLIST_DISABLE_FETCHPROXY',
    'SETLIST_SESSION_COOKIE',
  ];

  it('both surfaces declare the same env keys', () => {
    expect(Object.keys(manifest.server.mcp_config.env).sort()).toEqual(EXPECTED);
    expect(serverVars.map((v) => v.name).sort()).toEqual(EXPECTED);
  });

  it('declares nothing as required (every reader is optional)', () => {
    for (const [key, cfg] of Object.entries(manifest.user_config)) {
      expect(cfg.required, key).toBe(false);
    }
    for (const v of serverVars) expect(v.isRequired, v.name).toBe(false);
  });

  it('every user_config entry is wired into the server env', () => {
    const wired = Object.values(manifest.server.mcp_config.env).join(' ');
    for (const key of Object.keys(manifest.user_config)) {
      expect(wired, key).toContain(`\${user_config.${key}}`);
    }
  });
});
