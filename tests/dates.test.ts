import { describe, it, expect } from 'vitest';
import { isoToApiDate, apiDateToIso, isoToApiTimestamp, withIsoEventDates } from '../src/dates.js';

describe('isoToApiDate', () => {
  it('converts ISO yyyy-MM-dd to the API dd-MM-yyyy', () => {
    expect(isoToApiDate('2025-08-28')).toBe('28-08-2025');
  });
  it('passes a dd-MM-yyyy value through (the API accepts it)', () => {
    expect(isoToApiDate('28-08-2025')).toBe('28-08-2025');
  });
  it('trims and passes non-date strings through', () => {
    expect(isoToApiDate('  not-a-date ')).toBe('not-a-date');
  });
});

describe('apiDateToIso', () => {
  it('converts the API dd-MM-yyyy to ISO yyyy-MM-dd', () => {
    expect(apiDateToIso('28-08-2025')).toBe('2025-08-28');
  });
  it('is idempotent on an already-ISO value', () => {
    expect(apiDateToIso('2025-08-28')).toBe('2025-08-28');
  });
});

describe('isoToApiTimestamp', () => {
  it('expands a bare ISO date to yyyyMMddHHmmss with zero time', () => {
    expect(isoToApiTimestamp('2025-01-31')).toBe('20250131000000');
  });
  it('converts an ISO datetime', () => {
    expect(isoToApiTimestamp('2025-01-31T14:30:00')).toBe('20250131143000');
    expect(isoToApiTimestamp('2025-01-31T14:30')).toBe('20250131143000');
  });
  it('passes an already-yyyyMMddHHmmss value through', () => {
    expect(isoToApiTimestamp('20250131143000')).toBe('20250131143000');
  });
});

describe('withIsoEventDates', () => {
  it('rewrites nested eventDate fields to ISO and leaves everything else alone', () => {
    const input = {
      total: 1,
      setlist: [
        {
          id: 'abc',
          eventDate: '28-08-2025',
          lastUpdated: '2025-10-06T14:57:49.806+0000',
          url: 'https://www.setlist.fm/setlist/oasis/2025/...html',
          venue: { name: 'Soldier Field' },
        },
      ],
    };
    const out = withIsoEventDates(input);
    expect(out.setlist[0].eventDate).toBe('2025-08-28');
    expect(out.setlist[0].lastUpdated).toBe('2025-10-06T14:57:49.806+0000'); // untouched
    expect(out.setlist[0].url).toContain('/2025/'); // untouched
    expect(out.total).toBe(1);
  });
  it('handles undefined (empty/204 responses)', () => {
    expect(withIsoEventDates(undefined)).toBeUndefined();
  });
});
