import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fetchComingSoonItems, formatCountdown, formatReleaseDate } from '../src/comingSoon.js';
import { createCache } from '../src/cache.js';

function response(body, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

function tmdbReleaseDates({ region = 'AU', digital, physical, theatrical } = {}) {
  const dates = [];
  if (theatrical) dates.push({ type: 3, release_date: theatrical });
  if (digital) dates.push({ type: 4, release_date: digital });
  if (physical) dates.push({ type: 5, release_date: physical });
  return { results: [{ iso_3166_1: region, release_dates: dates }] };
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

test('Radarr matches physicalRelease when only physicalRelease is set', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 30,
          title: 'Physical Only',
          year: 2026,
          physicalRelease: '2026-06-01T00:00:00Z',
          hasFile: false,
        },
      ]);
    }
    return response([]);
  };

  const items = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Physical Only');
  assert.equal(items[0].releaseDate, '2026-06-01T00:00:00Z');
});

test('Radarr prefers earliest qualifying release when both digital and physical are set', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 31,
          title: 'Both Dates',
          digitalRelease: '2026-07-01T00:00:00Z',
          physicalRelease: '2026-06-15T00:00:00Z',
          hasFile: false,
        },
      ]);
    }
    return response([]);
  };

  const [item] = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });

  assert.equal(item.releaseDate, '2026-06-15T00:00:00Z');
});

test('Radarr falls back to digitalRelease when physicalRelease is outside the window', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 32,
          title: 'Physical Far Future',
          digitalRelease: '2026-06-01T00:00:00Z',
          physicalRelease: '2027-06-01T00:00:00Z',
          hasFile: false,
        },
      ]);
    }
    return response([]);
  };

  const [item] = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });

  assert.equal(item.releaseDate, '2026-06-01T00:00:00Z');
});

test('Radarr falls back to inCinemas when only inCinemas is set and within window (#87)', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 33,
          title: 'Theatrical Only',
          inCinemas: '2026-05-20T00:00:00Z',
          hasFile: false,
        },
      ]);
    }
    return response([]);
  };

  const items = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Theatrical Only');
  assert.equal(items[0].releaseDate, '2026-05-20T00:00:00Z');
  assert.equal(items[0].releaseType, 'cinema');
});

test('Radarr ignores inCinemas when it falls outside the look-ahead window (#87)', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 35,
          title: 'Cinema Far Future',
          inCinemas: '2027-06-01T00:00:00Z',
          hasFile: false,
        },
      ]);
    }
    return response([]);
  };

  const items = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });

  assert.deepEqual(items, []);
});

test('Radarr prefers earliest qualifying home date even when inCinemas is earlier (#90)', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 36,
          title: 'All Three Dates',
          inCinemas: '2026-05-15T00:00:00Z',
          digitalRelease: '2026-07-01T00:00:00Z',
          physicalRelease: '2026-06-15T00:00:00Z',
          hasFile: false,
        },
      ]);
    }
    return response([]);
  };

  const [item] = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });

  assert.equal(item.title, 'All Three Dates');
  // Cinema date is earliest, but display prefers the earliest home date.
  assert.equal(item.releaseDate, '2026-06-15T00:00:00Z');
  assert.equal(item.releaseType, 'home');
  assert.equal(item.releaseLabel, '15th of June 2026');
});

test('Radarr labels cinema-only fallback so the footer is not misleading (#90)', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 50,
          title: 'Theatrical Only',
          inCinemas: '2026-05-20T00:00:00Z',
          hasFile: false,
        },
      ]);
    }
    return response([]);
  };

  const [item] = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });

  assert.equal(item.releaseType, 'cinema');
  assert.equal(item.releaseDate, '2026-05-20T00:00:00Z');
  assert.equal(item.releaseLabel, 'In cinemas: 20th of May 2026');
});

test('Radarr falls back to in-window cinema when home dates are out of window (#90)', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 51,
          title: 'Cinema Now Home Later',
          inCinemas: '2026-05-25T00:00:00Z',
          digitalRelease: '2027-06-01T00:00:00Z',
          physicalRelease: '2027-08-01T00:00:00Z',
          hasFile: false,
        },
      ]);
    }
    return response([]);
  };

  const [item] = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });

  assert.equal(item.releaseType, 'cinema');
  assert.equal(item.releaseDate, '2026-05-25T00:00:00Z');
  assert.equal(item.releaseLabel, 'In cinemas: 25th of May 2026');
});

test('Radarr uses home date even when cinema is in-window and home is also in-window but later (#90)', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 52,
          title: 'Home Later Same Window',
          inCinemas: '2026-05-15T00:00:00Z',
          digitalRelease: '2026-07-20T00:00:00Z',
          hasFile: false,
        },
      ]);
    }
    return response([]);
  };

  const [item] = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });

  assert.equal(item.releaseType, 'home');
  assert.equal(item.releaseDate, '2026-07-20T00:00:00Z');
  assert.equal(item.releaseLabel, '20th of July 2026');
});

test('Radarr inCinemas movie with hasFile=true is still excluded (#87)', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 37,
          title: 'Cinema But Downloaded',
          inCinemas: '2026-05-20T00:00:00Z',
          hasFile: true,
        },
      ]);
    }
    return response([]);
  };

  const items = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });

  assert.deepEqual(items, []);
});

test('hasFile movies are still excluded with the new release-date logic', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 34,
          title: 'Already Downloaded',
          digitalRelease: '2026-06-01T00:00:00Z',
          physicalRelease: '2026-06-15T00:00:00Z',
          hasFile: true,
        },
      ]);
    }
    return response([]);
  };

  const items = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });

  assert.deepEqual(items, []);
});

test('configurable lookaheadDays widens the request window', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.includes('radarr')) {
      return response([
        {
          id: 40,
          title: 'Far Future',
          digitalRelease: '2026-09-15T00:00:00Z',
          hasFile: false,
        },
      ]);
    }
    return response([]);
  };

  // Default 90-day window: the 2026-09-15 release falls outside.
  const defaultRun = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });
  assert.deepEqual(defaultRun, []);
  assert.ok(calls[0].includes('end=2026-07-31'));

  // Widened to 180 days: the same release qualifies.
  const widened = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 180,
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });
  assert.equal(widened.length, 1);
  assert.equal(widened[0].title, 'Far Future');
});

// ---- TMDB enrichment (#91) ------------------------------------------------

test('TMDB is not called when tmdb_api_key is empty (no enrichment)', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.includes('radarr')) {
      return response([
        {
          id: 100,
          title: 'No Home Date',
          tmdbId: 99,
          inCinemas: '2026-06-01T00:00:00Z',
          hasFile: false,
        },
      ]);
    }
    if (url.includes('themoviedb')) {
      throw new Error('TMDB should not be called when api key is empty');
    }
    return response([]);
  };
  const items = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].releaseType, 'cinema');
  assert.ok(!calls.some(u => u.includes('themoviedb')));
});

test('TMDB enrichment fills in a missing digital date so the entry becomes home', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 200,
          title: 'Cinema Now Digital Soon',
          tmdbId: 9000,
          inCinemas: '2026-05-15T00:00:00Z',
          hasFile: false,
        },
      ]);
    }
    if (url.includes('/movie/9000/release_dates')) {
      return response(tmdbReleaseDates({
        region: 'AU',
        digital: '2026-06-20T00:00:00Z',
      }));
    }
    return response([]);
  };
  const [item] = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
        tmdb: { apiKey: 'k', region: 'AU' },
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });
  assert.equal(item.releaseType, 'home');
  assert.equal(item.releaseDate, '2026-06-20T00:00:00Z');
  assert.equal(item.releaseLabel, '20th of June 2026');
});

test('TMDB region preference picks AU dates over US dates', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 201,
          title: 'Region Aware',
          tmdbId: 9001,
          hasFile: false,
        },
      ]);
    }
    if (url.includes('/movie/9001/release_dates')) {
      return response({
        results: [
          {
            iso_3166_1: 'US',
            release_dates: [{ type: 4, release_date: '2026-05-30T00:00:00Z' }],
          },
          {
            iso_3166_1: 'AU',
            release_dates: [{ type: 4, release_date: '2026-06-25T00:00:00Z' }],
          },
        ],
      });
    }
    return response([]);
  };
  const [item] = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
        tmdb: { apiKey: 'k', region: 'AU' },
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });
  assert.equal(item.releaseType, 'home');
  assert.equal(item.releaseDate, '2026-06-25T00:00:00Z');
});

test('TMDB falls back to a labelled cinema date when only theatrical is available', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 202,
          title: 'Theatrical Only',
          tmdbId: 9002,
          // Radarr knows nothing about this movie's dates.
          hasFile: false,
        },
      ]);
    }
    if (url.includes('/movie/9002/release_dates')) {
      return response(tmdbReleaseDates({
        region: 'AU',
        theatrical: '2026-06-05T00:00:00Z',
      }));
    }
    return response([]);
  };
  const [item] = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
        tmdb: { apiKey: 'k', region: 'AU' },
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });
  assert.equal(item.releaseType, 'cinema');
  assert.equal(item.releaseDate, '2026-06-05T00:00:00Z');
  assert.equal(item.releaseLabel, 'In cinemas: 5th of June 2026');
});

test('TMDB API failure does not break Coming Soon — Radarr cinema fallback still shows', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 203,
          title: 'TMDB Down',
          tmdbId: 9003,
          inCinemas: '2026-05-20T00:00:00Z',
          hasFile: false,
        },
      ]);
    }
    if (url.includes('themoviedb')) {
      return response({}, false, 500);
    }
    return response([]);
  };
  const [item] = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
        tmdb: { apiKey: 'k', region: 'AU' },
      },
    },
    fetchImpl,
    logger: { warn() {}, info() {} },
    now: new Date('2026-05-02T12:00:00Z'),
  });
  assert.equal(item.releaseType, 'cinema');
  assert.equal(item.releaseDate, '2026-05-20T00:00:00Z');
});

test('TMDB enrichment is skipped for movies with hasFile=true', async () => {
  let tmdbCalls = 0;
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 204,
          title: 'Already Downloaded',
          tmdbId: 9004,
          inCinemas: '2026-05-20T00:00:00Z',
          hasFile: true,
        },
      ]);
    }
    if (url.includes('themoviedb')) {
      tmdbCalls += 1;
      return response(tmdbReleaseDates({ digital: '2026-06-01T00:00:00Z' }));
    }
    return response([]);
  };
  const items = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
        tmdb: { apiKey: 'k', region: 'AU' },
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });
  assert.deepEqual(items, []);
  assert.equal(tmdbCalls, 0);
});

test('TMDB enrichment is skipped when Radarr already provides a home release date', async () => {
  let tmdbCalls = 0;
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 205,
          title: 'Already Has Home Date',
          tmdbId: 9005,
          digitalRelease: '2026-06-01T00:00:00Z',
          hasFile: false,
        },
      ]);
    }
    if (url.includes('themoviedb')) {
      tmdbCalls += 1;
      return response(tmdbReleaseDates({ digital: '2026-05-10T00:00:00Z' }));
    }
    return response([]);
  };
  const [item] = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
        tmdb: { apiKey: 'k', region: 'AU' },
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });
  assert.equal(item.releaseType, 'home');
  assert.equal(item.releaseDate, '2026-06-01T00:00:00Z');
  assert.equal(tmdbCalls, 0);
});

test('TMDB lookups are cached across movies in the same Coming Soon refresh', async () => {
  let tmdbCalls = 0;
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        { id: 1, title: 'A', tmdbId: 7777, inCinemas: '2026-05-15T00:00:00Z', hasFile: false },
      ]);
    }
    if (url.includes('themoviedb')) {
      tmdbCalls += 1;
      return response(tmdbReleaseDates({ digital: '2026-06-01T00:00:00Z' }));
    }
    return response([]);
  };
  const cache = createCache(60000);
  const args = {
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
        tmdb: { apiKey: 'k', region: 'AU' },
      },
    },
    fetchImpl,
    tmdbCache: cache,
    now: new Date('2026-05-02T12:00:00Z'),
  };
  await fetchComingSoonItems(args);
  await fetchComingSoonItems(args);
  await fetchComingSoonItems(args);
  assert.equal(tmdbCalls, 1);
});

test('TMDB digital date out of look-ahead window is ignored', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('radarr')) {
      return response([
        {
          id: 206,
          title: 'Far Out Digital',
          tmdbId: 9006,
          inCinemas: '2026-05-20T00:00:00Z',
          hasFile: false,
        },
      ]);
    }
    if (url.includes('themoviedb')) {
      return response(tmdbReleaseDates({ digital: '2027-08-01T00:00:00Z' }));
    }
    return response([]);
  };
  const [item] = await fetchComingSoonItems({
    config: {
      comingSoon: {
        radarrUrl: 'http://radarr.local:7878',
        radarrApiKey: 'rk',
        moviesCount: 5,
        showsCount: 5,
        lookaheadDays: 90,
        tmdb: { apiKey: 'k', region: 'AU' },
      },
    },
    fetchImpl,
    now: new Date('2026-05-02T12:00:00Z'),
  });
  // Out-of-window TMDB date is dropped; Radarr's cinema fallback wins.
  assert.equal(item.releaseType, 'cinema');
  assert.equal(item.releaseDate, '2026-05-20T00:00:00Z');
});
