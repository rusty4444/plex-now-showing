import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fetchComingSoonItems, formatCountdown, formatReleaseDate } from '../src/comingSoon.js';

function response(body, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

test('fetchComingSoonItems interleaves Radarr movies and first Sonarr episode per series', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, apiKey: options.headers['X-Api-Key'] });
    if (url.includes('radarr')) {
      return response([
        {
          id: 10,
          title: 'Dune Messiah',
          year: 2026,
          digitalRelease: '2026-05-10T00:00:00Z',
          hasFile: false,
          genres: ['Sci-Fi'],
          overview: 'The next chapter.',
          images: [{ coverType: 'poster', remoteUrl: 'https://img/poster.jpg' }],
        },
        {
          id: 11,
          title: 'Already Here',
          digitalRelease: '2026-05-09T00:00:00Z',
          hasFile: true,
        },
      ]);
    }
    return response([
      {
        seriesId: 20,
        seasonNumber: 1,
        episodeNumber: 1,
        title: 'Pilot',
        airDate: '2026-05-11',
        airDateUtc: '2026-05-11T10:00:00Z',
        hasFile: false,
        overview: 'The beginning.',
        series: {
          id: 20,
          title: 'New Show',
          images: [{ coverType: 'fanart', remoteUrl: 'https://img/fanart.jpg' }],
        },
      },
      {
        seriesId: 20,
        seasonNumber: 1,
        episodeNumber: 2,
        airDateUtc: '2026-05-12T10:00:00Z',
        hasFile: false,
        series: { id: 20, title: 'New Show' },
      },
    ]);
  };

  const items = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        sonarrUrl: 'http://sonarr.local:8989',
        sonarrApiKey: 'sk',
        moviesCount: 5,
        showsCount: 5,
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].apiKey, 'rk');
  assert.equal(calls[1].apiKey, 'sk');
  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'Dune Messiah');
  assert.equal(items[0].countdown, 'In 1 week');
  assert.equal(items[0].localPosterUrl, 'http://radarr.local:7878/api/v3/MediaCover/10/poster.jpg?apikey=rk');
  assert.equal(items[1].title, 'New Show');
  assert.equal(items[1].subtitle, 'S01E01 / Pilot');
  assert.equal(items[1].localFanartUrl, 'http://sonarr.local:8989/api/v3/MediaCover/20/fanart.jpg?apikey=sk');
});

test('format helpers match coming-soon-card style', () => {
  const now = new Date('2026-05-02T12:00:00Z');
  assert.equal(formatCountdown('2026-05-02', now), 'Today');
  assert.equal(formatCountdown('2026-05-03', now), 'Tomorrow');
  assert.equal(formatCountdown('2026-05-08', now), 'In 6 days');
  assert.equal(formatReleaseDate('2026-05-10'), '10th of May 2026');
});
