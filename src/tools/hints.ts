/**
 * `_meta.mint` hints (the mcp-host context-groups contract): which canonical
 * group a tool belongs to, what kind of ask it answers, and everyday words its
 * name and description lack. Inert data to any other client.
 *
 * setlist.fm is a historical record of concerts that already happened: nothing
 * in it is a person's news, due date or upcoming schedule, so every read is a
 * `lookup`, no tool is canonical, and no argument takes a person's subject
 * (there is no listable set of people or accounts to fan out over).
 */
const DOMAIN = 'family';

type Intent = 'lookup' | 'change' | 'other';

export interface MintHint {
  domain: typeof DOMAIN;
  intent: Intent;
  aliases?: string[];
}

function meta(intent: Intent, aliases: string[]): { mint: MintHint } {
  return { mint: { domain: DOMAIN, intent, aliases } };
}

/** What people say when they ask about a show. Lowercase, ≤ 8, each ≤ 40 chars. */
const SHOW_ALIASES = ['concert', 'setlist', 'gig', 'show', 'songs played', 'tour', 'encore', 'live music'];

/** A read of a show, a setlist or an artist's shows. */
export const SHOW_LOOKUP_META = meta('lookup', SHOW_ALIASES);
/** A read of an artist record. */
export const ARTIST_LOOKUP_META = meta('lookup', ['band', 'artist', 'singer', 'musician']);
/** A read of a venue (and its shows). */
export const VENUE_LOOKUP_META = meta('lookup', ['venue', 'concert hall', 'arena', 'amphitheater', 'festival']);
/** A read of setlist.fm's city/country gazetteer. */
export const PLACE_LOOKUP_META = meta('lookup', ['city', 'country']);
/** A read of a setlist.fm user's profile or edits. */
export const USER_LOOKUP_META = meta('lookup', ['setlist.fm profile', 'user']);
/** The concerts a setlist.fm user has marked as attended. */
export const ATTENDED_LOOKUP_META = meta('lookup', ['my concerts', 'shows i went to', 'concerts i attended', 'concert history']);
/** A local parse of a pasted setlist.fm link. */
export const URL_PARSE_META = meta('other', ['setlist link', 'setlist.fm link']);
/** The "I was there" writes on the person's own setlist.fm account. */
export const ATTENDANCE_META = meta('change', ['i was there', 'attended', 'went to', 'mark attended', 'concert history']);
