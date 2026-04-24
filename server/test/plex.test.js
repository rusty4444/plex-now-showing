import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { parseRatingKey, fetchMediaInfo, parseRatings } from '../src/plex.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const metadata = JSON.parse(
  readFileSync(join(__dirname, '..', 'fixtures', 'plex_metadata_12345.json'), 'utf8'),
);

test('parseRatingKey: bare numeric id', () => {
  assert.equal(parseRatingKey('12345'), '12345');
});

test('parseRatingKey: /library/metadata/N form', () => {
  assert.equal(parseRatingKey('/library/metadata/67890'), '67890');
  assert.equal(parseRatingKey('/library/metadata/67890/children'), '67890');
});

test('parseRatingKey: plex:// GUID returns null (unresolvable)', () => {
  assert.equal(parseRatingKey('plex://movie/5e161e4c8f3f5a00401b5af1'), null);
  assert.equal(parseRatingKey('plex://episode/abc'), null);
});

test('parseRatingKey: empty / nullish inputs', () => {
  assert.equal(parseRatingKey(''), null);
  assert.equal(parseRatingKey(null), null);
  assert.equal(parseRatingKey(undefined), null);
});

test('parseRatingKey: trailing digits fallback', () => {
  assert.equal(parseRatingKey('whatever-42'), '42');
});

test('fetchMediaInfo: maps the canned Plex response correctly', async () => {
  const fetchImpl = async (url) => {
    assert.ok(url.includes('/library/metadata/12345'));
    assert.ok(url.includes('X-Plex-Token=tok'));
    return {
      ok: true,
      async json() { return metadata; },
    };
  };

  const info = await fetchMediaInfo({
    plexUrl: 'https://plex.example:32400',
    plexToken: 'tok',
    ratingKey: '12345',
    fetchImpl,
  });

  assert.equal(info.videoResolution, '4K');
  assert.equal(info.videoCodec, 'HEVC');
  assert.equal(info.videoBitDepth, 10);
  assert.equal(info.hdr, 'HDR');
  assert.equal(info.audioCodec, 'EAC3');
  assert.equal(info.audioChannels, 6);
  assert.equal(info.audioTitle, 'English (EAC3 5.1)');
  assert.equal(info.container, 'MKV');
  assert.equal(info.width, 3840);
  assert.equal(info.height, 2160);
  assert.equal(info.fileSize, 12500000000);
});

test('fetchMediaInfo: returns null when plex url/token missing', async () => {
  assert.equal(await fetchMediaInfo({ plexUrl: '', plexToken: 't', ratingKey: '1' }), null);
  assert.equal(await fetchMediaInfo({ plexUrl: 'u', plexToken: '', ratingKey: '1' }), null);
});

test('fetchMediaInfo: returns null on non-ok response', async () => {
  const fetchImpl = async () => ({ ok: false, status: 404, async json() { return {}; } });
  const info = await fetchMediaInfo({
    plexUrl: 'u', plexToken: 't', ratingKey: '1', fetchImpl,
  });
  assert.equal(info, null);
});

// ----- #18 parseRatings ---------------------------------------------------

test('parseRatings: returns all-null for falsy input', () => {
  assert.deepEqual(parseRatings(null), { imdb: null, rottenTomatoes: null, audience: null });
  assert.deepEqual(parseRatings(undefined), { imdb: null, rottenTomatoes: null, audience: null });
  assert.deepEqual(parseRatings({}), { imdb: null, rottenTomatoes: null, audience: null });
});

test('parseRatings: pulls imdb + RT critic + RT audience from Rating[]', () => {
  const r = parseRatings({
    Rating: [
      { image: 'imdb://image.rating', value: 7.8, type: 'audience' },
      { image: 'rottentomatoes://image.rating.ripe', value: 8.5, type: 'critic' },
      { image: 'rottentomatoes://image.rating.upright', value: 9.1, type: 'audience' },
    ],
  });
  assert.equal(r.imdb.value, 7.8);
  assert.equal(r.imdb.source, 'imdb');
  assert.equal(r.rottenTomatoes.value, 8.5);
  assert.equal(r.rottenTomatoes.fresh, true);
  assert.equal(r.audience.value, 9.1);
  assert.equal(r.audience.source, 'rt_audience');
});

test('parseRatings: RT rotten/spilled mark fresh=false', () => {
  const r = parseRatings({
    Rating: [
      { image: 'rottentomatoes://image.rating.rotten', value: 3.2, type: 'critic' },
      { image: 'rottentomatoes://image.rating.spilled', value: 4.1, type: 'audience' },
    ],
  });
  assert.equal(r.rottenTomatoes.fresh, false);
  assert.equal(r.audience.fresh, false);
});

test('parseRatings: falls back to legacy scalars when Rating[] missing', () => {
  const r = parseRatings({ rating: 7.3, audienceRating: 8.2 });
  assert.equal(r.imdb.value, 7.3);
  assert.equal(r.imdb.source, 'legacy_rating');
  assert.equal(r.audience.value, 8.2);
  assert.equal(r.audience.source, 'legacy_audience_rating');
  assert.equal(r.rottenTomatoes, null);
});

test('parseRatings: Rating[] wins over legacy scalars for imdb slot', () => {
  const r = parseRatings({
    rating: 5.0,
    Rating: [{ image: 'imdb://image.rating', value: 8.9 }],
  });
  assert.equal(r.imdb.value, 8.9);
  assert.equal(r.imdb.source, 'imdb');
});

test('parseRatings: TMDB fills audience slot only when empty', () => {
  const r = parseRatings({
    Rating: [{ image: 'themoviedb://image.rating', value: 7.6 }],
  });
  assert.equal(r.audience.source, 'tmdb');
  assert.equal(r.audience.value, 7.6);
});

test('parseRatings: ignores entries with bad/missing values', () => {
  const r = parseRatings({
    Rating: [
      { image: 'imdb://image.rating' },
      { image: 'imdb://image.rating', value: 'abc' },
      { image: 'imdb://image.rating', value: 0 },
      { value: 5, type: 'critic' }, // no image
    ],
    rating: 0,          // 0 is treated as "unknown"
    audienceRating: 0,
  });
  assert.deepEqual(r, { imdb: null, rottenTomatoes: null, audience: null });
});

test('fetchMediaInfo: surfaces ratings from the canned fixture', async () => {
  const fetchImpl = async () => ({ ok: true, async json() { return metadata; } });
  const info = await fetchMediaInfo({
    plexUrl: 'u', plexToken: 't', ratingKey: '12345', fetchImpl,
  });
  assert.ok(info.ratings);
  assert.equal(info.ratings.imdb.value, 8.4);
  assert.equal(info.ratings.rottenTomatoes.value, 9.3);
  assert.equal(info.ratings.rottenTomatoes.fresh, true);
  assert.equal(info.ratings.audience.value, 9.1);
});
