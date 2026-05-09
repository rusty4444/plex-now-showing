// Optional TMDB enrichment for the Coming Soon feed (#91).
//
// Radarr stays the primary source: TMDB only fills in release-date metadata
// when Radarr's calendar response is missing the typed home-release dates we
// need (digitalRelease / physicalRelease) or, as a last resort, an inCinemas
// date. The kiosk works fine without TMDB — when the API token is empty
// hasTmdb() returns false and fetchTmdbReleaseDates() short-circuits with no
// network calls.
//
// Matching strategy
// -----------------
// Radarr stores the TMDB id on every movie record (`tmdbId`). We use that
// directly when present — it's the most robust identifier. If TMDB id is
// missing but we have an IMDb id we use the /find/{imdb_id} endpoint. We do
// not fall back to title-only search: Radarr's existing dates are good enough
// in that edge case, and a fuzzy title match risks pulling release dates from
// the wrong movie.
//
// Region handling
// ---------------
// TMDB exposes /movie/{id}/release_dates which returns { results: [{ iso_3166_1,
// release_dates: [{ type, release_date, ... }] }] }. The numeric `type`
// codes from the TMDB docs are:
//   1 = Premiere
//   2 = Theatrical (limited)
//   3 = Theatrical
//   4 = Digital
//   5 = Physical
//   6 = TV
// We pick the configured region first; if that region has no release_dates
// entry at all we fall back to the first region that does (typically US).
// Within a region we prefer the earliest qualifying date for each kind (a
// movie can have multiple staggered theatrical or digital releases).
//
// Caching
// -------
// Lookups for the same TMDB id + region are cached in the supplied TTL cache
// (see cache.js). Negative results (no match, auth failure) are cached too
// so a misconfigured token doesn't hammer the API every Coming Soon refresh.

const TMDB_BASE = 'https://api.themoviedb.org/3';

const TYPE_PREMIERE = 1;
const TYPE_THEATRICAL_LIMITED = 2;
const TYPE_THEATRICAL = 3;
const TYPE_DIGITAL = 4;
const TYPE_PHYSICAL = 5;

export function hasTmdb(config) {
  return !!(config?.comingSoon?.tmdb?.apiKey);
}

// Returns { digital, physical, theatrical } for the matched movie + region.
// Each value is an ISO date string or null. Failures (no token, no match,
// auth/network error) resolve to null release dates rather than throwing —
// the caller treats TMDB enrichment as best-effort.
export async function fetchTmdbReleaseDates({
  config,
  radarrItem,
  cache,
  fetchImpl = globalThis.fetch,
  logger = defaultLogger,
}) {
  const empty = { digital: null, physical: null, theatrical: null, region: null };
  if (!hasTmdb(config)) return empty;

  const tmdb = config.comingSoon.tmdb;
  const region = tmdb.region || 'AU';
  const tmdbId = await resolveTmdbId({ radarrItem, tmdb, fetchImpl, logger, cache, region });
  if (!tmdbId) return empty;

  const cacheKey = `tmdb:release_dates:${tmdbId}:${region}`;
  if (cache) {
    const hit = cache.get(cacheKey);
    if (hit !== undefined) return hit;
  }

  const url = `${TMDB_BASE}/movie/${encodeURIComponent(tmdbId)}/release_dates`;
  let payload;
  try {
    payload = await tmdbFetch(url, tmdb, fetchImpl, logger);
  } catch (err) {
    logger.warn(`[tmdb] release_dates fetch failed for tmdbId=${tmdbId}: ${err.message}`);
    if (cache) cache.set(cacheKey, empty);
    return empty;
  }
  if (!payload) {
    if (cache) cache.set(cacheKey, empty);
    return empty;
  }

  const picked = pickReleaseDates(payload, region);
  if (cache) cache.set(cacheKey, picked);
  return picked;
}

// Pick earliest digital/physical/theatrical date from /movie/{id}/release_dates
// for the requested region. Falls back to the first region that has any data
// when the requested region isn't listed at all.
export function pickReleaseDates(payload, region) {
  const empty = { digital: null, physical: null, theatrical: null, region: null };
  const results = Array.isArray(payload?.results) ? payload.results : [];
  if (!results.length) return empty;

  const upper = String(region || '').toUpperCase();
  let entry = results.find(r => String(r?.iso_3166_1 || '').toUpperCase() === upper);
  let usedRegion = upper;
  if (!entry) {
    entry = results.find(r => Array.isArray(r?.release_dates) && r.release_dates.length);
    usedRegion = entry ? String(entry.iso_3166_1 || '').toUpperCase() : null;
  }
  if (!entry) return empty;

  const dates = Array.isArray(entry.release_dates) ? entry.release_dates : [];
  const earliest = (...types) => {
    const matches = dates
      .filter(d => types.includes(Number(d.type)) && d.release_date)
      .map(d => d.release_date)
      .filter(Boolean)
      .sort();
    return matches[0] || null;
  };

  return {
    digital: earliest(TYPE_DIGITAL),
    physical: earliest(TYPE_PHYSICAL),
    // Theatrical: prefer wide-release theatrical (3) but accept limited (2)
    // and premieres (1) as a labelled cinema fallback so we don't drop a
    // movie just because the wide rollout isn't typed yet.
    theatrical: earliest(TYPE_THEATRICAL, TYPE_THEATRICAL_LIMITED, TYPE_PREMIERE),
    region: usedRegion,
  };
}

async function resolveTmdbId({ radarrItem, tmdb, fetchImpl, logger, cache, region }) {
  const direct = numberOr(radarrItem?.tmdbId, null);
  if (direct) return direct;

  const imdbId = String(radarrItem?.imdbId || '').trim();
  if (!imdbId) return null;

  const cacheKey = `tmdb:find:imdb:${imdbId}:${region}`;
  if (cache) {
    const hit = cache.get(cacheKey);
    if (hit !== undefined) return hit;
  }
  const url = `${TMDB_BASE}/find/${encodeURIComponent(imdbId)}?external_source=imdb_id`;
  let payload;
  try {
    payload = await tmdbFetch(url, tmdb, fetchImpl, logger);
  } catch (err) {
    logger.warn(`[tmdb] /find lookup failed for imdb=${imdbId}: ${err.message}`);
    if (cache) cache.set(cacheKey, null);
    return null;
  }
  const movie = Array.isArray(payload?.movie_results) ? payload.movie_results[0] : null;
  const id = movie ? numberOr(movie.id, null) : null;
  if (cache) cache.set(cacheKey, id);
  return id;
}

async function tmdbFetch(url, tmdb, fetchImpl, logger) {
  const headers = { Accept: 'application/json' };
  let finalUrl = url;
  const apiKey = String(tmdb.apiKey || '');
  if (looksLikeV4Token(apiKey)) {
    headers.Authorization = `Bearer ${apiKey}`;
  } else {
    const join = url.includes('?') ? '&' : '?';
    finalUrl = `${url}${join}api_key=${encodeURIComponent(apiKey)}`;
  }

  const resp = await fetchImpl(finalUrl, { headers });
  if (!resp.ok) {
    if (resp.status === 401 || resp.status === 403) {
      logger.warn(`[tmdb] auth rejected (HTTP ${resp.status}) — check TMDB_API_KEY`);
    } else if (resp.status === 429) {
      logger.warn('[tmdb] rate-limited (HTTP 429); backing off this lookup');
    } else if (resp.status === 404) {
      // Not an error — movie just isn't in TMDB. Don't log noisily.
      return null;
    } else {
      logger.warn(`[tmdb] HTTP ${resp.status} from ${finalUrl.replace(apiKey, '***')}`);
    }
    return null;
  }
  return resp.json();
}

function looksLikeV4Token(value) {
  // TMDB v4 read tokens are JWTs: three base64 segments separated by dots,
  // header always starts with "eyJ". v3 keys are 32 hex characters.
  return /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(value);
}

function numberOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const defaultLogger = {
  warn: (msg) => console.warn(msg),
  info: (msg) => console.info(msg),
};
