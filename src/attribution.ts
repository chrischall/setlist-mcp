// setlist.fm's API terms (https://www.setlist.fm/help/api-terms) require
// *followable* attribution wherever their data is shown: "Use the attribution
// link provided in each API response ... You may not tag links to Setlist.fm
// with a nofollow attribute." Every setlist/artist/venue object the API returns
// carries a `url` field, and `textResult` passes the full JSON through verbatim —
// so the attribution link is always present in a tool's output. This note is
// appended to each data-returning tool's description so the model is told to
// surface that `url` as a real source link whenever it presents the data. It is
// NOT added to setlist_healthcheck (which returns no setlist.fm data).
export const ATTRIBUTION_NOTE =
  ' Results include a setlist.fm `url`; when you present this data, cite it as a clickable source link to setlist.fm (their API terms require followable attribution — no nofollow). If a result has no `url`, link to https://www.setlist.fm instead.';
