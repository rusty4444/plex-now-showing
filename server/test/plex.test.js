import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { parseRatingKey, fetchMediaInfo } from '../src/plex.js';

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
