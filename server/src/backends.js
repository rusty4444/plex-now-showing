export const BACKENDS = Object.freeze(['plex', 'jellyfin', 'emby', 'kodi']);

export const BACKEND_RULES = Object.freeze({
  plex: Object.freeze({
    id: 'plex',
    label: 'Plex',
    entityPrefix: 'media_player.plex_',
    exactEntities: Object.freeze([]),
    defaultPlayer: '',
  }),
  jellyfin: Object.freeze({
    id: 'jellyfin',
    label: 'Jellyfin',
    entityPrefix: 'media_player.jellyfin_',
    exactEntities: Object.freeze(['media_player.jellyfin']),
    defaultPlayer: '',
  }),
  emby: Object.freeze({
    id: 'emby',
    label: 'Emby',
    entityPrefix: 'media_player.emby_',
    exactEntities: Object.freeze(['media_player.emby']),
    defaultPlayer: '',
  }),
  kodi: Object.freeze({
    id: 'kodi',
    label: 'Kodi',
    entityPrefix: 'media_player.kodi_',
    exactEntities: Object.freeze(['media_player.kodi']),
    defaultPlayer: '',
  }),
});

export function normaliseBackend(value, defaultValue = 'plex') {
  const fallback = BACKENDS.includes(defaultValue) ? defaultValue : 'plex';
  if (value == null || value === '') return fallback;
  const key = String(value).trim().toLowerCase();
  return BACKENDS.includes(key) ? key : fallback;
}

export function getBackendRule(value) {
  return BACKEND_RULES[normaliseBackend(value)];
}
