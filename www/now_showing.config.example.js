// Plex Now Showing - runtime config example
//
// Copy this file to `now_showing.config.js` (in the same directory) and edit
// the values below. The real file is git-ignored so your tokens never end up
// in source control.
//
// All keys are optional. Any value can also be supplied via:
//   - URL hash fragment:   /local/now_showing.html#haToken=abc&backend=jellyfin
//   - localStorage:        pns.haToken, pns.backend, pns.player, ...
//   - URL query string:    ?player=media_player.plex_lg_tv  (avoid for tokens)
//
// Precedence: hash > localStorage > this file > query string > defaults.

window.NOW_SHOWING_CONFIG = {
  // Home Assistant
  // haUrl:   'http://homeassistant.local:8123',   // defaults to the page's origin
  // haToken: 'PASTE_LONG_LIVED_TOKEN_HERE',        // better: store in localStorage via #setup

  // Backend selection
  backend: 'plex',    // plex | jellyfin | emby | kodi
  player:  '',        // optional: lock to a specific media_player entity id

  // Plex filtering
  plexUsername: '',   // your Plex username - filters to only your playback

  // Optional direct Plex API access (for the info overlay's media-file details)
  // plexUrl:   'http://192.168.1.10:32400',
  // plexToken: 'PLEX_TOKEN_HERE',

  // Display
  landscape: false,   // true = fit entire poster on widescreen displays
  poll:      5000,    // ms between HA polls
};
