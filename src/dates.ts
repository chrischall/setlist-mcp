// The MCP surface speaks ISO yyyy-MM-dd for every date, in and out. The
// setlist.fm API does not: it takes event dates as dd-MM-yyyy and the
// `lastUpdated` filter as yyyyMMddHHmmss, and returns `eventDate` as dd-MM-yyyy.
// These helpers translate at the API boundary so callers only ever see ISO.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const API_DATE = /^(\d{2})-(\d{2})-(\d{4})$/;
const ISO_DATETIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;

/** ISO yyyy-MM-dd → the API's dd-MM-yyyy. Non-ISO input passes through (an
 *  already-dd-MM-yyyy value is accepted by the API as-is). */
export function isoToApiDate(date: string): string {
  const m = ISO_DATE.exec(date.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : date.trim();
}

/** The API's dd-MM-yyyy → ISO yyyy-MM-dd. Anything else passes through. */
export function apiDateToIso(date: string): string {
  const m = API_DATE.exec(date.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : date.trim();
}

/** ISO yyyy-MM-dd (or yyyy-MM-ddTHH:mm[:ss]) → the lastUpdated filter's
 *  yyyyMMddHHmmss. A bare date gets 000000; a 14-digit value passes through. */
export function isoToApiTimestamp(value: string): string {
  const v = value.trim();
  const d = ISO_DATE.exec(v);
  if (d) return `${d[1]}${d[2]}${d[3]}000000`;
  const dt = ISO_DATETIME.exec(v);
  if (dt) return `${dt[1]}${dt[2]}${dt[3]}${dt[4]}${dt[5]}${dt[6] ?? '00'}`;
  return v;
}

/** Recursively rewrite every `eventDate` (the API emits dd-MM-yyyy) to ISO
 *  yyyy-MM-dd, in place, so responses are ISO end-to-end. Other fields — incl.
 *  ISO `lastUpdated` timestamps and `url`s — are left untouched. */
export function withIsoEventDates<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const item of value) withIsoEventDates(item);
  } else if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (key === 'eventDate' && typeof v === 'string') {
        obj[key] = apiDateToIso(v);
      } else {
        withIsoEventDates(v);
      }
    }
  }
  return value;
}
