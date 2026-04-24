// Plex helpers.
//
// parseRatingKey  — closes #arch-4 bonus. `media_content_id` from HA is not
//                   always a bare ratingKey:
//                     • Movies/episodes:  '12345'
//                     • New Plex client:  'plex://movie/5e161e4...' or
//                                         'plex://episode/...'
//                     • Older integration:'/library/metadata/12345'
//                     • Music:            'plex://track/...'  (not useful)
//                   Only numeric ratingKeys work against /library/metadata/{id},
//                   so extract a numeric id when possible and return null
//                   otherwise instead of firing a guaranteed-404 request.
//
// fetchMediaInfo  — port of fetchPlexMediaInfo() from now_showing.html so the
//                   browser can switch to /api/media-info/:ratingKey and keep
//                   the same info-panel behaviour.

export function parseRatingKey(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // Bare numeric id
  if (/^\d+$/.test(s)) return s;

  // /library/metadata/12345  (optional leading slash, optional trailing parts)
  const libMatch = s.match(/\/library\/metadata\/(\d+)/);
  if (libMatch) return libMatch[1];

  // plex://movie/<guid> or plex://episode/<guid> — these are GUIDs, not
  // ratingKeys. Returning null is the correct behaviour; the caller will skip
  // the Plex round-trip rather than issue a 404.
  if (s.startsWith('plex://')) return null;

  // Last-ditch: if the string ends with digits, take them.
  const tail = s.match(/(\d+)\s*$/);
  return tail ? tail[1] : null;
}

// parseRatings  — #18 Ratings badges. Plex exposes ratings two ways:
//
//   1. Legacy scalars on the Metadata item:
//        - `rating`          critic score (usually IMDb-sourced, 0–10)
//        - `audienceRating`  audience score (0–10)
//
//   2. A `Rating` array when the Plex agent supplies multi-provider data:
//        [ { image: 'imdb://image.rating',                value: 7.8, type: 'audience'|'critic' },
//          { image: 'rottentomatoes://image.rating.ripe', value: 8.5, type: 'critic' },
//          { image: 'rottentomatoes://image.rating.rotten', value: 3.2, type: 'critic' },
//          { image: 'rottentomatoes://image.rating.upright', value: 8.9, type: 'audience' },
//          { image: 'rottentomatoes://image.rating.spilled', value: 4.5, type: 'audience' },
//          { image: 'themoviedb://image.rating',          value: 7.6, type: 'audience' } ]
//
// We prefer the Rating[] array (it's unambiguous) and fall back to the legacy
// scalars. Each slot is null when unavailable so the frontend can skip the
// widget cleanly.
export function parseRatings(item) {
  if (!item || typeof item !== 'object') return { imdb: null, rottenTomatoes: null, audience: null };

  const out = { imdb: null, rottenTomatoes: null, audience: null };
  const ratings = Array.isArray(item.Rating) ? item.Rating : [];

  for (const r of ratings) {
    if (!r || typeof r.image !== 'string') continue;
    const img = r.image.toLowerCase();
    const val = Number(r.value);
    // Treat missing / non-numeric / zero values as unknown so we don't render
    // a "0.0" badge when Plex simply hasn't fetched a score yet.
    if (!Number.isFinite(val) || val <= 0) continue;
    const type = (r.type || '').toLowerCase();

    if (img.startsWith('imdb://')) {
      // IMDb scores are on a 0–10 scale.
      if (out.imdb == null) out.imdb = { value: val, scale: 10, source: 'imdb' };
    } else if (img.startsWith('rottentomatoes://')) {
      // RT publishes on 0–10 in Plex's feed. Map the badge variant so the
      // frontend can pick the right icon (fresh vs rotten, upright vs spilled).
      const fresh = img.includes('ripe') || img.includes('upright');
      const rotten = img.includes('rotten') || img.includes('spilled');
      const isAudience = type === 'audience' || img.includes('upright') || img.includes('spilled');
      const slot = isAudience ? 'audience' : 'rottenTomatoes';
      if (out[slot] == null) {
        out[slot] = {
          value: val,
          scale: 10,
          source: isAudience ? 'rt_audience' : 'rt_critic',
          fresh: fresh || (!rotten && val >= 6),
        };
      }
    } else if (img.startsWith('themoviedb://')) {
      // TMDB is primarily audience-sourced — only use as an audience fallback.
      if (out.audience == null) {
        out.audience = { value: val, scale: 10, source: 'tmdb' };
      }
    }
  }

  // Legacy fallbacks. `item.rating` is typically the IMDb-sourced critic score
  // when the Plex agent is the default IMDb/TMDB combo, so use it to fill the
  // IMDb slot if the Rating[] array didn't already populate it.
  if (out.imdb == null) {
    const legacy = Number(item.rating);
    if (Number.isFinite(legacy) && legacy > 0) {
      out.imdb = { value: legacy, scale: 10, source: 'legacy_rating' };
    }
  }
  if (out.audience == null) {
    const legacyAud = Number(item.audienceRating);
    if (Number.isFinite(legacyAud) && legacyAud > 0) {
      out.audience = { value: legacyAud, scale: 10, source: 'legacy_audience_rating' };
    }
  }

  return out;
}

// parseGenres — #20 Genre chips. Plex exposes genres via `item.Genre` when the
// metadata agent has scraped them:
//
//   [ { id: 1, filter: 'genre=1', tag: 'Action' },
//     { id: 2, filter: 'genre=2', tag: 'Adventure' }, ... ]
//
// Some libraries omit the array entirely (music, personal media); others have
// duplicate tags from multiple agents. We normalise to a deduped array of
// non-empty strings in original order, preserving Plex's ranking (the first
// entry is typically the primary genre). Capped at 6 to stop a long metal
// album's 17 sub-genres from wrapping onto three lines in the info panel.
export function parseGenres(item, { max = 6 } = {}) {
  if (!item || !Array.isArray(item.Genre)) return [];
  const seen = new Set();
  const out = [];
  for (const g of item.Genre) {
    if (!g || typeof g.tag !== 'string') continue;
    const tag = g.tag.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= max) break;
  }
  return out;
}

export async function fetchMediaInfo({ plexUrl, plexToken, ratingKey, fetchImpl = globalThis.fetch }) {
  if (!plexUrl || !plexToken || !ratingKey) return null;

  const url = `${plexUrl}/library/metadata/${encodeURIComponent(ratingKey)}?X-Plex-Token=${encodeURIComponent(plexToken)}`;
  const resp = await fetchImpl(url, { headers: { Accept: 'application/json' } });
  if (!resp.ok) return null;

  const data = await resp.json();
  const item = data?.MediaContainer?.Metadata?.[0];
  if (!item || !item.Media || !item.Media[0]) return null;

  const media = item.Media[0];
  const part = media.Part?.[0];
  const videoStream = part?.Stream?.find(s => s.streamType === 1);
  const audioStream = part?.Stream?.find(s => s.streamType === 2);

  return {
    videoResolution: media.videoResolution ? String(media.videoResolution).toUpperCase() : '',
    videoCodec: (media.videoCodec || '').toUpperCase(),
    videoProfile: media.videoProfile || '',
    videoBitDepth: videoStream?.bitDepth || '',
    hdr: videoStream?.DOVIPresent
      ? 'Dolby Vision'
      : (videoStream?.colorTrc === 'smpte2084' || videoStream?.colorTrc === 'arib-std-b67')
        ? 'HDR'
        : '',
    audioCodec: (media.audioCodec || '').toUpperCase(),
    audioChannels: media.audioChannels || '',
    audioTitle: audioStream?.displayTitle || '',
    bitrate: media.bitrate || 0,
    container: (media.container || '').toUpperCase(),
    fileSize: part?.size || 0,
    width: media.width || 0,
    height: media.height || 0,
    ratings: parseRatings(item),
    genres: parseGenres(item),
  };
}
