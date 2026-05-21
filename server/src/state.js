// State normaliser. The /api/state endpoint returns the same shape the HTML
// consumes in direct-to-HA mode, with provider-specific player discovery kept
// behind the backend rules below.

import { getBackendRule, normaliseBackend } from './backends.js';

const PLAYING = new Set(['playing', 'paused']);

export function normalise(states, {
  backend = 'plex',
  player = '',
  plexPlayer = '',
  plexUsername = '',
} = {}) {
  if (!Array.isArray(states)) return null;

  const backendId = normaliseBackend(backend);
  const rule = getBackendRule(backendId);
  const pinnedPlayer = player || plexPlayer || rule.defaultPlayer || '';

  // Specific player pinned in config -> use only that one.
  if (pinnedPlayer) {
    const playerState = states.find(s => s.entity_id === pinnedPlayer);
    if (!playerState || !PLAYING.has(playerState.state)) return null;
    return shape(playerState);
  }

  // Otherwise pick from active media_player entities for the configured
  // backend. Plex only filters by username when one is configured; blank
  // means "show the first active Plex player". The other providers use the
  // first active matching player, mirroring their standalone repos.
  const active = states.filter(s => isBackendPlayer(s, rule) && PLAYING.has(s.state));
  if (active.length === 0) return null;

  if (backendId !== 'plex') return shape(active[0]);

  const wantedUser = String(plexUsername || '').trim();
  if (!wantedUser) return shape(active[0]);

  const mine = active.filter(p => {
    const attrs = p.attributes || {};
    if (attrs.username) return attrs.username === wantedUser;
    const id = p.entity_id.replace('media_player.plex_', '');
    return id.startsWith('plex_for_') || id.startsWith('plex_web_');
  });
  if (mine.length === 0) return null;

  return shape(mine[0]);
}

function isBackendPlayer(state, rule) {
  if (!state || typeof state.entity_id !== 'string') return false;
  if ((rule.requiredAttributes || []).some(name => !(state.attributes || {})[name])) {
    return false;
  }
  // Exact entity_id match has highest priority
  if (rule.exactEntities.includes(state.entity_id)) return true;
  // Prefix match
  if (state.entity_id.startsWith(rule.entityPrefix)) return true;
  // Substring match in entity_id
  if ((rule.entityIncludes || []).some(token => state.entity_id.includes(token))) return true;
  // Attribute match: if the rule specifies an appIdMatch, check the entity's
  // app_id or source_list for a match. Catches cases where the entity_id
  // doesn't follow the naming convention (e.g. Shield -> media_player.shield_4
  // running the Jellyfin Android TV app).
  if (rule.appIdMatch) {
    const attrs = state.attributes || {};
    const appId = (attrs.app_id || '').toLowerCase();
    if (appId.includes(rule.appIdMatch)) return true;
    const source = (attrs.source || '').toLowerCase();
    if (source.includes(rule.appIdMatch)) return true;
    const appName = (attrs.app_name || '').toLowerCase();
    if (appName.includes(rule.appIdMatch)) return true;
  }
  return false;
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
    appName: attrs.app_name || '',
    appId: attrs.app_id || '',
  };
}
