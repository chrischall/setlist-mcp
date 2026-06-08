import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { textResult } from '@chrischall/mcp-utils';
import { client } from '../client.js';
import { webClient } from '../web-client.js';
import { ATTRIBUTION_NOTE } from '../attribution.js';

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

interface AttendanceControl {
  ajaxUrl: string;
  attended: boolean;
}

/**
 * Locate the attendance toggle in a logged-in setlist page and read its state.
 * The control is a Wicket `wicketAjaxGet(...)` anchor whose title is
 * "Add this setlist to your attended shows." (not attended) or
 * "Remove this setlist from your attended shows." (attended).
 */
export function parseAttendance(html: string): AttendanceControl | null {
  for (const seg of html.split(/<a\b/i).slice(1)) {
    const a = '<a ' + seg.slice(0, 800);
    if (!/wicketAjaxGet/.test(a)) continue;
    const title = (a.match(/title="([^"]*attended shows[^"]*)"/i) || [])[1];
    if (!title) continue;
    const url = (a.match(/wicketAjaxGet\(\s*['"]([^'"]+)['"]/) || [])[1];
    if (!url) continue;
    return { ajaxUrl: decodeEntities(url), attended: /remove/i.test(title) };
  }
  return null;
}

interface SetlistMeta {
  url?: string;
  eventDate?: string;
  artist?: { name?: string };
  venue?: { name?: string; city?: { name?: string } };
}

async function setAttendance(
  setlistId: string,
  desired: boolean,
  confirm: boolean,
): Promise<Record<string, unknown>> {
  // Resolve the canonical setlist page URL via the public API.
  const meta = await client.request<SetlistMeta>('GET', `/1.0/setlist/${encodeURIComponent(setlistId)}`);
  if (!meta?.url) throw new Error(`No setlist found for id "${setlistId}".`);
  const path = new URL(meta.url).pathname;
  const summary = {
    setlistId,
    url: meta.url,
    artist: meta.artist?.name,
    eventDate: meta.eventDate,
    venue: meta.venue?.name,
    city: meta.venue?.city?.name,
  };

  const control = parseAttendance(await webClient.fetchPage(path));
  if (!control) {
    throw new Error(
      'Could not find the attendance control on the setlist page — your setlist.fm session has likely expired (re-copy SETLIST_SESSION_COOKIE) or the page layout changed.',
    );
  }

  if (control.attended === desired) {
    return {
      ...summary,
      attended: desired,
      changed: false,
      note: desired ? 'Already marked as attended.' : 'Not currently attended — nothing to remove.',
    };
  }

  if (!confirm) {
    return {
      ...summary,
      currentlyAttended: control.attended,
      wouldSetAttendedTo: desired,
      dryRun: true,
      note: `Dry run — re-run with confirm: true to ${desired ? 'record' : 'remove'} this attendance.`,
    };
  }

  // Replay the per-render Wicket toggle, then VERIFY by re-reading (a 200 is not proof).
  const u = new URL(control.ajaxUrl, meta.url);
  await webClient.wicketAjaxGet(u.pathname + u.search, path.replace(/^\//, ''));
  const after = parseAttendance(await webClient.fetchPage(path));
  const verified = after?.attended === desired;
  return {
    ...summary,
    attended: desired,
    changed: true,
    verified,
    ...(verified ? {} : { warning: 'Toggle sent, but the re-read did not confirm the new state — check on setlist.fm.' }),
  };
}

export function registerAttendanceTools(server: McpServer): void {
  server.registerTool(
    'setlist_mark_attended',
    {
      description:
        "Record on YOUR setlist.fm account that you attended a show — the site's \"I was there\" marker — by setlist ID. Authenticated via your session (needs SETLIST_SESSION_COOKIE). Idempotent: a no-op if already marked. Without confirm: true it returns a dry-run preview and makes NO change; with confirm: true it toggles attendance and verifies by re-reading your attended list." +
        ATTRIBUTION_NOTE,
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: true },
      inputSchema: {
        setlistId: z.string().describe('Setlist ID (e.g. from setlist_search_setlists / resolve_concerts)'),
        confirm: z.boolean().optional().describe('Must be true to actually record attendance; omit for a dry-run preview.'),
      },
    },
    async ({ setlistId, confirm }) => textResult(await setAttendance(setlistId, true, confirm === true)),
  );

  server.registerTool(
    'setlist_unmark_attended',
    {
      description:
        'Remove a show from YOUR attended list on setlist.fm, by setlist ID (reverses setlist_mark_attended). Authenticated via your session. Idempotent: a no-op if not currently attended. Without confirm: true it returns a dry-run preview and makes NO change; with confirm: true it removes the attendance and verifies by re-reading.' +
        ATTRIBUTION_NOTE,
      annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: true, openWorldHint: true },
      inputSchema: {
        setlistId: z.string().describe('Setlist ID to remove from your attended shows'),
        confirm: z.boolean().optional().describe('Must be true to actually remove attendance; omit for a dry-run preview.'),
      },
    },
    async ({ setlistId, confirm }) => textResult(await setAttendance(setlistId, false, confirm === true)),
  );
}
