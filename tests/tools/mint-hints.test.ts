import { describe, it, expect, afterAll } from 'vitest';
import type { SetlistClient } from '../../src/client.js';
import { registerArtistTools } from '../../src/tools/artists.js';
import { registerSetlistTools } from '../../src/tools/setlists.js';
import { registerVenueTools } from '../../src/tools/venues.js';
import { registerGeoTools } from '../../src/tools/geo.js';
import { registerUserTools } from '../../src/tools/users.js';
import { registerResolveTools } from '../../src/tools/resolve.js';
import { registerAttendanceTools } from '../../src/tools/attendance.js';
import { registerUrlTools } from '../../src/tools/urls.js';
import { registerUtilityTools } from '../../src/tools/utilities.js';
import { createTestHarness } from '../helpers.js';

/**
 * Context-group hints (`_meta.mint`, the mcp-host context-groups contract),
 * read off `tools/list` — what a host actually sees.
 */
type Listed = {
  name: string;
  annotations?: { readOnlyHint?: boolean };
  inputSchema: { properties?: Record<string, { enum?: unknown[] }> };
  _meta?: { mint?: Record<string, unknown> };
};

const DOMAINS = ['school', 'home', 'work', 'family', 'health', 'money', 'travel', 'food'];
const INTENTS = ['whats-new', 'whats-due', 'whats-on', 'lookup', 'turn-on-off', 'send', 'change', 'other'];
const READ_INTENTS = ['whats-new', 'whats-due', 'whats-on', 'lookup', 'other'];
const WRITE_INTENTS = ['turn-on-off', 'send', 'change', 'other'];
const CANONICAL_INTENTS = ['whats-new', 'whats-due', 'whats-on'];
const KEYS = ['domain', 'intent', 'canonical', 'subject', 'when', 'aliases'];

/**
 * The intent every tool declares — this table is the assertion. setlist.fm is
 * a historical record of concerts that already happened: nothing in it is a
 * person's news, due date or upcoming schedule, so every read is a lookup and
 * nothing is canonical.
 */
const EXPECTED_INTENT: Record<string, string> = {
  setlist_search_artists: 'lookup',
  setlist_get_artist: 'lookup',
  setlist_get_artist_setlists: 'lookup',
  setlist_search_setlists: 'lookup',
  setlist_get_setlist: 'lookup',
  setlist_get_setlist_version: 'lookup',
  setlist_search_venues: 'lookup',
  setlist_get_venue: 'lookup',
  setlist_get_venue_setlists: 'lookup',
  setlist_search_cities: 'lookup',
  setlist_get_city: 'lookup',
  setlist_search_countries: 'lookup',
  setlist_get_user: 'lookup',
  setlist_get_user_attended: 'lookup',
  setlist_get_user_edited: 'lookup',
  setlist_resolve_concerts: 'lookup',
  setlist_id_from_url: 'other',
  setlist_mark_attended: 'change',
  setlist_unmark_attended: 'change',
};

let harness: Awaited<ReturnType<typeof createTestHarness>>;
let tools: Listed[] = [];
afterAll(async () => {
  if (harness) await harness.close();
});

describe('_meta.mint on tools/list', () => {
  it('setup', async () => {
    const client = {} as SetlistClient;
    harness = await createTestHarness((server) => {
      registerArtistTools(server, client);
      registerSetlistTools(server, client);
      registerVenueTools(server, client);
      registerGeoTools(server, client);
      registerUserTools(server, client);
      registerResolveTools(server, client);
      registerAttendanceTools(server, client);
      registerUrlTools(server);
      registerUtilityTools(server, client);
    });
    tools = (await harness.client.listTools()).tools as Listed[];
    expect(tools.length).toBe(20);
  });

  it('names every served tool except the healthcheck, so a new tool cannot skip the decision', () => {
    const hinted = tools.filter((t) => !t.name.endsWith('_healthcheck')).map((t) => t.name);
    expect(hinted.sort()).toEqual(Object.keys(EXPECTED_INTENT).sort());
  });

  it.each(Object.entries(EXPECTED_INTENT))('%s declares domain family and intent %s', (name, intent) => {
    const mint = tools.find((t) => t.name === name)?._meta?.mint;
    expect(mint, name).toBeDefined();
    expect(mint!.domain).toBe('family');
    expect(mint!.intent).toBe(intent);
  });

  it('every hint is shaped per the host contract', () => {
    for (const t of tools) {
      if (t.name.endsWith('_healthcheck')) continue;
      const mint = t._meta!.mint!;
      const props = t.inputSchema.properties ?? {};
      expect(Object.keys(mint).filter((k) => !KEYS.includes(k)), t.name).toEqual([]);
      expect(DOMAINS, t.name).toContain(mint.domain);
      expect(INTENTS, t.name).toContain(mint.intent);
      const readOnly = t.annotations?.readOnlyHint === true;
      expect(readOnly ? READ_INTENTS : WRITE_INTENTS, t.name).toContain(mint.intent);
      if ('canonical' in mint) {
        expect(mint.canonical, t.name).toBe(true);
        expect(readOnly, t.name).toBe(true);
        expect(CANONICAL_INTENTS, t.name).toContain(mint.intent);
        expect(props, t.name).toHaveProperty('view');
        expect(props.view.enum, t.name).toContain('brief');
      }
      if ('subject' in mint) expect(props, t.name).toHaveProperty(mint.subject as string);
      if ('when' in mint) {
        const when = mint.when as Record<string, string>;
        expect(Object.keys(when).sort(), t.name).toEqual(['end', 'start']);
        expect(props, t.name).toHaveProperty(when.start);
        expect(props, t.name).toHaveProperty(when.end);
      }
      if ('aliases' in mint) {
        const aliases = mint.aliases as string[];
        expect(aliases.length, t.name).toBeGreaterThan(0);
        expect(aliases.length, t.name).toBeLessThanOrEqual(8);
        for (const a of aliases) {
          expect(a.length, t.name).toBeLessThanOrEqual(40);
          expect(a, t.name).toBe(a.toLowerCase());
          expect(a, t.name).not.toMatch(/^setlist_/);
        }
      }
    }
  });

  it('at most one canonical read per whats-new / whats-due / whats-on — and here, none', () => {
    const canonical = tools.filter((t) => t._meta?.mint?.canonical === true);
    for (const intent of CANONICAL_INTENTS) {
      expect(canonical.filter((t) => t._meta!.mint!.intent === intent).length).toBeLessThanOrEqual(1);
    }
    // setlist.fm records shows that already happened; no read answers a
    // what's-new/due/on question, so no canonical read, no brief view and no
    // subject enum (it has no listable set of people or accounts either).
    expect(canonical.map((t) => t.name)).toEqual([]);
    for (const t of tools) expect(t._meta?.mint?.subject, t.name).toBeUndefined();
    for (const t of tools) expect(t.inputSchema.properties?.view?.enum ?? [], t.name).not.toContain('brief');
  });

  it('carries the words a person says', () => {
    const aliases = (name: string) => tools.find((t) => t.name === name)?._meta?.mint?.aliases as string[];
    for (const name of ['setlist_search_setlists', 'setlist_get_setlist', 'setlist_get_artist_setlists', 'setlist_resolve_concerts']) {
      expect(aliases(name), name).toEqual(expect.arrayContaining(['concert', 'setlist', 'gig']));
    }
    expect(aliases('setlist_search_venues')).toEqual(expect.arrayContaining(['venue']));
    expect(aliases('setlist_get_user_attended')).toEqual(expect.arrayContaining(['my concerts', 'shows i went to']));
    for (const name of ['setlist_mark_attended', 'setlist_unmark_attended']) {
      expect(aliases(name), name).toEqual(expect.arrayContaining(['i was there', 'attended']));
    }
  });

  it('leaves the healthcheck unhinted', () => {
    expect(tools.find((t) => t.name === 'setlist_healthcheck')?._meta?.mint).toBeUndefined();
  });
});
