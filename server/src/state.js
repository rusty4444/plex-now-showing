// State normaliser — direct port of fetchPlexData() in www/now_showing.html so
// the /api/state endpoint returns exactly the same shape the HTML already
// consumes. The browser path will then be:
//
//   HACS-only install  → HTML calls HA directly (today's behaviour, unchanged)
//   Add-on / Compose   → HTML calls /api/state on the server, and tokens never
//                        leave the box.

const PLAYING = new Set(['playing', 'paused']);

export function normalise(states, { plexPlayer = '', plexUsername = '' } = {}) {
  if (!Array.isArray(states)) return null;

  // Specific player pinned in config → use only that one.
  if (plexPlayer) {
    const playerState = states.find(s => s.entity_id === plexPlayer);
    if (!playerState || !PLAYING.has(playerState.state)) return null;
    return shape(playerState);
  }

  // Otherwise pick from active Plex media_player entities, filtered to this
  // user where possible.
  const active = states.filter(s =>
    typeof s.entity_id === 'string'
    && s.entity_id.startsWith('media_player.plex_')
    && PLAYING.has(s.state),
  );
  if (active.length === 0) return null;

  const mine = active.filter(p => {
    const attrs = p.attributes || {};
    if (attrs.username) return attrs.username === plexUsername;
    const id = p.entity_id.replace('media_player.plex_', '');
    return id.startsWith('plex_for_') || id.startsWith('plex_web_');
  });
  if (mine.length === 0) return null;

  return shape(mine[0]);
}

function shape(playerState) {
  const attrs = playerState.attributes || {};
  // Rewrite HA-relative artwork paths to our own proxy so the browser can
  // load them same-origin (without an HA token). Absolute URLs pass through.
  const rawArt = attrs.entity_picture || '';
  const artwork = rawArt && !/^https?:\/\//i.test(rawArt)
    ? `/api/artwork?path=${encodeURIComponent(rawArt)}`
    : rawArt;
  // Progress bar (#17) needs both current position and the timestamp HA last
  // updated it, so the browser can interpolate smoothly between polls when
  // playing. positionUpdatedAt is an ISO8601 string in HA state JSON.
  const position = Number.isFinite(attrs.media_position)
    ? attrs.media_position
    : 0;
  const positionUpdatedAt = attrs.media_position_updated_at || '';
  return {
    title: attrs.media_title || 'Unknown Title',
    seriesTitle: attrs.media_series_title || '',
    contentType: attrs.media_content_type || 'video',
    artwork,
    playerName: attrs.friendly_name || playerState.entity_id,
    state: playerState.state,
    season: attrs.media_season || '',
    episode: attrs.media_episode || '',
    contentRating: attrs.media_content_rating || '',
    duration: attrs.media_duration || 0,
    position,
    positionUpdatedAt,
    summary: attrs.media_summary || '',
    ratingKey: attrs.media_content_id || '',
  };
}
