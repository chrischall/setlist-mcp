import { describe, it, expect } from 'vitest';
import { viewResponse, SETLIST_VIEWS } from '../src/view.js';

const parse = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

describe('the rungs', () => {
  it('offers compact and full, and not raw — full already IS the upstream payload', () => {
    expect(SETLIST_VIEWS).toEqual(['compact', 'full']);
  });

  it('defaults to compact when no view is given', () => {
    const data = { id: 1, photo: 'https://cdn/x.png' };
    expect(parse(viewResponse(undefined, data))).toEqual({ id: 1 });
  });
});

describe('what compact does — and what it deliberately does not', () => {
  it('strips image and avatar URLs', () => {
    const data = { users: [{ id: 7, name: 'A', avatar: 'https://cdn/a.png', photoUrl: 'https://cdn/b.jpg' }] };
    expect(parse(viewResponse('compact', data))).toEqual({ users: [{ id: 7, name: 'A' }] });
  });

  it('keeps EVERY other field, because nothing here knows which Setlist.fm fields matter', () => {
    // The honest ceiling for this repo: no schema, no fixture, no documented
    // shape, no live tenant. A field list invented here could drop something a
    // caller needs, and the record would come back with holes in it looking
    // like a verified answer.
    const record = {
      id: 's1', eventDate: '01-10-2026', artist: { name: 'Band' }, venue: { name: 'Hall' }, sets: { set: [] }, tour: null,
      somethingNobodyAnticipated: 'kept',
    };
    expect(parse(viewResponse('compact', { data: [record] }))).toEqual({ data: [record] });
  });

  it('keeps null — an absent key and a null one are different facts', () => {
    expect(parse(viewResponse('compact', { endedAt: null }))).toEqual({ endedAt: null });
  });

  it('keeps a page URL', () => {
    const d = { link: 'https://www.setlist.fm/setlist/s1.html' };
    expect(parse(viewResponse('compact', d))).toEqual(d);
  });
});

describe('full', () => {
  it('returns the payload untouched, images included', () => {
    const data = { id: 1, photo: 'https://cdn/x.png' };
    expect(parse(viewResponse('full', data))).toEqual(data);
  });
});

describe('whitespace', () => {
  it('emits none of its own, and never touches whitespace inside a value', () => {
    const description = 'Line one.\n\n  Indented.   ';
    const text = viewResponse('compact', { description }).content[0].text;
    expect(text.split('\n')).toHaveLength(1);
    expect(JSON.parse(text).description).toBe(description);
  });
});

describe('`view` never reaches setlist.fm', () => {
  /**
   * The bug this guards. Three search tools built their upstream query by
   * spreading the whole args object, so adding a `view` parameter to their
   * schema silently started sending `view=compact` to the live API on every
   * call. It is our parameter, not setlist.fm's.
   *
   * The auto-review caught this and I initially doubted it — the destructuring
   * tools nearby are clean, and a first scan for the pattern excluded object
   * spreads. `{ ...args }` and `{ query: args }` are exactly how it got out.
   */
  it('is destructured out of the query for every search tool', async () => {
    const { readFile } = await import('node:fs/promises');
    for (const f of ['setlists.ts', 'venues.ts', 'geo.ts']) {
      const src = await readFile(new URL(`../src/tools/${f}`, import.meta.url), 'utf8');
      // no handler may forward its whole args object once `view` is in scope
      expect(src).not.toMatch(/async \(args\) => \{[\s\S]*?query: args/);
      expect(src).not.toMatch(/async \(args\) => \{[\s\S]*?\{ \.\.\.args \}/);
    }
  });
});
