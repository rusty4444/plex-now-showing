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
  };
}
