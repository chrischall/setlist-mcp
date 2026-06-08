import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { client } from '../../src/client.js';
import { webClient } from '../../src/web-client.js';
import { registerAttendanceTools, parseAttendance } from '../../src/tools/attendance.js';
import { createTestHarness } from '../helpers.js';

const NOT_ATTENDED = `<div><a class="nestedInverse btn btn-primary text-uppercase" title="Add this setlist to your attended shows." onclick="var x=1;wicketAjaxGet('/?5:attend-link', function(){});return false;">I was there</a></div>`;
const ATTENDED = `<div><a class="nestedInverse btn btn-info text-uppercase" title="Remove this setlist from your attended shows." onclick="wicketAjaxGet('/?5:remove-link', function(){});return false;">I was there</a></div>`;

describe('parseAttendance', () => {
  it('reads the not-attended control', () => {
    expect(parseAttendance(NOT_ATTENDED)).toEqual({ ajaxUrl: '/?5:attend-link', attended: false });
  });
  it('reads the attended control', () => {
    expect(parseAttendance(ATTENDED)).toEqual({ ajaxUrl: '/?5:remove-link', attended: true });
  });
  it('decodes HTML entities in the url', () => {
    expect(parseAttendance(NOT_ATTENDED.replace('attend-link', 'a&amp;b'))?.ajaxUrl).toBe('/?5:a&b');
  });
  it('returns null when no control is present', () => {
    expect(parseAttendance('<html>no attendance here</html>')).toBeNull();
  });
});

describe('attendance tools', () => {
  const meta = { url: 'https://www.setlist.fm/setlist/a/2025/v-1234.html', artist: { name: 'A' }, eventDate: '2025-01-01', venue: { name: 'V', city: { name: 'C' } } };
  const mockApi = vi.spyOn(client, 'request').mockResolvedValue(meta as never);
  const mockPage = vi.spyOn(webClient, 'fetchPage').mockResolvedValue('');
  const mockAjax = vi.spyOn(webClient, 'wicketAjaxGet').mockResolvedValue('<ajax-response/>');
  let harness: Awaited<ReturnType<typeof createTestHarness>>;

  beforeEach(() => { mockApi.mockClear().mockResolvedValue(meta as never); mockPage.mockReset(); mockAjax.mockClear().mockResolvedValue('<ajax-response/>'); });
  afterAll(async () => { if (harness) await harness.close(); });
  const parse = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

  it('setup', async () => { harness = await createTestHarness((s) => registerAttendanceTools(s)); });

  it('mark (confirm) toggles when not attended and verifies via re-read', async () => {
    mockPage.mockResolvedValueOnce(NOT_ATTENDED).mockResolvedValueOnce(ATTENDED);
    const out = parse(await harness.callTool('setlist_mark_attended', { setlistId: '1234', confirm: true }));
    expect(out).toMatchObject({ setlistId: '1234', attended: true, changed: true, verified: true });
    expect(mockAjax).toHaveBeenCalledTimes(1);
    const [ajaxPath, baseUrl] = mockAjax.mock.calls[0];
    expect(ajaxPath).toBe('/?5:attend-link');
    expect(baseUrl).toBe('setlist/a/2025/v-1234.html');
  });

  it('mark is a no-op when already attended (no write)', async () => {
    mockPage.mockResolvedValue(ATTENDED);
    const out = parse(await harness.callTool('setlist_mark_attended', { setlistId: '1234', confirm: true }));
    expect(out).toMatchObject({ attended: true, changed: false });
    expect(mockAjax).not.toHaveBeenCalled();
  });

  it('mark without confirm is a dry run (no write)', async () => {
    mockPage.mockResolvedValue(NOT_ATTENDED);
    const out = parse(await harness.callTool('setlist_mark_attended', { setlistId: '1234' }));
    expect(out).toMatchObject({ dryRun: true, wouldSetAttendedTo: true, currentlyAttended: false });
    expect(mockAjax).not.toHaveBeenCalled();
  });

  it('unmark (confirm) toggles when attended', async () => {
    mockPage.mockResolvedValueOnce(ATTENDED).mockResolvedValueOnce(NOT_ATTENDED);
    const out = parse(await harness.callTool('setlist_unmark_attended', { setlistId: '1234', confirm: true }));
    expect(out).toMatchObject({ attended: false, changed: true, verified: true });
    expect(mockAjax).toHaveBeenCalledTimes(1);
  });

  it('errors clearly when the attendance control is missing (session expired)', async () => {
    mockPage.mockResolvedValue('<html>logged out</html>');
    const res = await harness.callTool('setlist_mark_attended', { setlistId: '1234', confirm: true });
    expect(res.isError).toBeTruthy();
    expect((res.content[0] as { text: string }).text).toMatch(/session|expired|control/i);
  });
});
