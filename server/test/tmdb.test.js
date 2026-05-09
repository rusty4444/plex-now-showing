import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fetchTmdbReleaseDates, hasTmdb, pickReleaseDates } from '../src/tmdb.js';
import { createCache } from '../src/cache.js';

const silentLogger = { warn() {}, info() {} };

function jsonResponse(body, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

function configWithTmdb({ apiKey = 'demo-v3-key', region = 'AU' } = {}) {
  return {
    comingSoon: {
      tmdb: { apiKey, region },
    },
  };
}

const SAMPLE_RELEASE_DATES = {
  results: [
    {
      iso_3166_1: 'AU',
      release_dates: [
        { type: 3, release_date: '2026-06-15T00:00:00.000Z', note: 'wide' },
        { type: 4, release_date: '2026-08-01T00:00:00.000Z' },
      ],
    },
    {
      iso_3166_1: 'US',
      release_dates: [
        { type: 3, release_date: '2026-05-30T00:00:00.000Z' },
        { type: 4, release_date: '2026-07-15T00:00:00.000Z' },
        { type: 5, release_date: '2026-09-15T00:00:00.000Z' },
      ],
    },
  ],
};

test('hasTmdb is false when no API key is set', () => {
  assert.equal(hasTmdb({}), false);
  assert.equal(hasTmdb({ comingSoon: {} }), false);
  assert.equal(hasTmdb({ comingSoon: { tmdb: {} } }), false);
  assert.equal(hasTmdb({ comingSoon: { tmdb: { apiKey: '' } } }), false);
});

test('hasTmdb is true once an API key is supplied', () => {
  assert.equal(hasTmdb(configWithTmdb()), true);
});

test('pickReleaseDates picks earliest typed dates for the requested region', () => {
  const picked = pickReleaseDates(SAMPLE_RELEASE_DATES, 'US');
  assert.equal(picked.theatrical, '2026-05-30T00:00:00.000Z');
  assert.equal(picked.digital, '2026-07-15T00:00:00.000Z');
  assert.equal(picked.physical, '2026-09-15T00:00:00.000Z');
  assert.equal(picked.region, 'US');
});

test('pickReleaseDates falls back to first listed region when configured region is missing', () => {
  const onlyJp = {
    results: [
      {
        iso_3166_1: 'JP',
        release_dates: [{ type: 3, release_date: '2026-06-01T00:00:00.000Z' }],
      },
    ],
  };
  const picked = pickReleaseDates(onlyJp, 'AU');
  assert.equal(picked.theatrical, '2026-06-01T00:00:00.000Z');
  assert.equal(picked.region, 'JP');
});

test('pickReleaseDates returns nulls when payload has no usable results', () => {
  assert.deepEqual(pickReleaseDates({ results: [] }, 'AU'), {
    digital: null, physical: null, theatrical: null, region: null,
  });
  assert.deepEqual(pickReleaseDates(null, 'AU'), {
    digital: null, physical: null, theatrical: null, region: null,
  });
});

test('fetchTmdbReleaseDates short-circuits when TMDB is not configured', async () => {
  let called = false;
  const fetchImpl = async () => { called = true; return jsonResponse({}); };
  const dates = await fetchTmdbReleaseDates({
    config: { comingSoon: {} },
    radarrItem: { tmdbId: 1234 },
    fetchImpl,
    logger: silentLogger,
  });
  assert.equal(called, false);
  assert.deepEqual(dates, { digital: null, physical: null, theatrical: null, region: null });
});

test('fetchTmdbReleaseDates uses Radarr tmdbId directly and returns AU dates', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, headers: options?.headers || {} });
    if (url.includes('/movie/9001/release_dates')) {
      return jsonResponse(SAMPLE_RELEASE_DATES);
    }
    throw new Error(`unexpected url: ${url}`);
  };
  const dates = await fetchTmdbReleaseDates({
    config: configWithTmdb({ region: 'AU' }),
    radarrItem: { tmdbId: 9001 },
    fetchImpl,
    cache: createCache(60000),
    logger: silentLogger,
  });
  assert.equal(dates.region, 'AU');
  assert.equal(dates.theatrical, '2026-06-15T00:00:00.000Z');
  assert.equal(dates.digital, '2026-08-01T00:00:00.000Z');
  assert.equal(dates.physical, null);
  assert.equal(calls.length, 1);
  // v3 keys go in the query string, not the Authorization header.
  assert.ok(calls[0].url.includes('api_key=demo-v3-key'));
  assert.equal(calls[0].headers.Authorization, undefined);
});

test('fetchTmdbReleaseDates uses Authorization header for v4 read tokens', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, headers: options?.headers || {} });
    return jsonResponse(SAMPLE_RELEASE_DATES);
  };
  // Three-segment JWT shape; the value doesn't need to be valid.
  const v4 = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.signature';
  await fetchTmdbReleaseDates({
    config: configWithTmdb({ apiKey: v4 }),
    radarrItem: { tmdbId: 5 },
    fetchImpl,
    logger: silentLogger,
  });
  assert.equal(calls[0].headers.Authorization, `Bearer ${v4}`);
  assert.ok(!calls[0].url.includes('api_key='));
});

test('fetchTmdbReleaseDates resolves IMDb id via /find when tmdbId is missing', async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    if (url.includes('/find/tt')) {
      return jsonResponse({ movie_results: [{ id: 4242 }] });
    }
    if (url.includes('/movie/4242/release_dates')) {
      return jsonResponse(SAMPLE_RELEASE_DATES);
    }
    throw new Error(`unexpected url: ${url}`);
  };
  const dates = await fetchTmdbReleaseDates({
    config: configWithTmdb(),
    radarrItem: { imdbId: 'tt7654321' },
    fetchImpl,
    cache: createCache(60000),
    logger: silentLogger,
  });
  assert.equal(dates.theatrical, '2026-06-15T00:00:00.000Z');
  assert.equal(urls.length, 2);
  assert.ok(urls[0].includes('/find/tt7654321'));
  assert.ok(urls[1].includes('/movie/4242/release_dates'));
});

test('fetchTmdbReleaseDates does not call when neither tmdbId nor imdbId is present', async () => {
  let called = false;
  const fetchImpl = async () => { called = true; return jsonResponse({}); };
  const dates = await fetchTmdbReleaseDates({
    config: configWithTmdb(),
    radarrItem: { title: 'Mystery Movie' },
    fetchImpl,
    logger: silentLogger,
  });
  assert.equal(called, false);
  assert.deepEqual(dates, { digital: null, physical: null, theatrical: null, region: null });
});

test('fetchTmdbReleaseDates caches release_dates by tmdbId+region', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return jsonResponse(SAMPLE_RELEASE_DATES); };
  const cache = createCache(60000);
  const args = {
    config: configWithTmdb(),
    radarrItem: { tmdbId: 7 },
    fetchImpl,
    cache,
    logger: silentLogger,
  };
  await fetchTmdbReleaseDates(args);
  await fetchTmdbReleaseDates(args);
  await fetchTmdbReleaseDates(args);
  assert.equal(calls, 1);
});

test('fetchTmdbReleaseDates returns nulls (and does not throw) on auth failure', async () => {
  const fetchImpl = async () => jsonResponse({ status_message: 'Invalid API key' }, false, 401);
  const warnings = [];
  const dates = await fetchTmdbReleaseDates({
    config: configWithTmdb(),
    radarrItem: { tmdbId: 9001 },
    fetchImpl,
    cache: createCache(60000),
    logger: { warn: (m) => warnings.push(m), info() {} },
  });
  assert.deepEqual(dates, { digital: null, physical: null, theatrical: null, region: null });
  assert.ok(warnings.some(w => w.includes('auth rejected')));
});

test('fetchTmdbReleaseDates returns nulls on network errors thrown by fetch', async () => {
  const fetchImpl = async () => { throw new Error('boom'); };
  const warnings = [];
  const dates = await fetchTmdbReleaseDates({
    config: configWithTmdb(),
    radarrItem: { tmdbId: 9001 },
    fetchImpl,
    logger: { warn: (m) => warnings.push(m), info() {} },
  });
  assert.deepEqual(dates, { digital: null, physical: null, theatrical: null, region: null });
  assert.ok(warnings.some(w => w.includes('release_dates fetch failed')));
});
