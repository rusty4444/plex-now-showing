// Config loader for the plex-now-showing server.
//
// Two run modes:
//
//   1. HA Add-on mode  — Supervisor provides SUPERVISOR_TOKEN at startup.
//                         HA is reached via http://supervisor/core/api/.
//                         No user-created long-lived token needed.
//
//   2. Standalone mode  — HA_URL + HA_TOKEN env vars point at any HA instance.
//                         Used by HA Container users running docker compose.
//
// Plex access (plex_url + plex_token) is always optional and purely for the
// media-info endpoint.

export function loadConfig(env = process.env) {
  const supervisorToken = env.SUPERVISOR_TOKEN || '';
  const mode = supervisorToken ? 'addon' : 'standalone';

  const haUrl = mode === 'addon'
    ? 'http://supervisor/core'
    : (env.HA_URL || '').replace(/\/$/, '');
  const haToken = mode === 'addon' ? supervisorToken : (env.HA_TOKEN || '');

  const config = {
    mode,
    port: parseInt(env.PORT || '8099', 10),
    haUrl,
    haToken,
    plexUrl: (env.PLEX_URL || '').replace(/\/$/, ''),
    plexToken: env.PLEX_TOKEN || '',
    plexUsername: env.PLEX_USERNAME || '',
    plexPlayer: env.PLEX_PLAYER || '',
    landscape: parseBool(env.LANDSCAPE, false),
    theme: env.THEME || 'classic-gold',
    poll: parseInt(env.POLL || '5000', 10),
    // Optional hardening (issue #44 ships defaults that make sense in add-on mode)
    proxySecret: env.PROXY_SECRET || '',
    allowedOrigins: (env.ALLOWED_ORIGINS || '')
      .split(',').map(s => s.trim()).filter(Boolean),
    // TTLs (ms) — tuned below 1× poll interval so a second tablet doesn't re-hit HA
    stateTtl: parseInt(env.STATE_TTL_MS || '3000', 10),
    mediaInfoTtl: parseInt(env.MEDIA_INFO_TTL_MS || '600000', 10), // 10 min
    // Fully Kiosk auto-switcher (#48). Disabled by default; users who prefer
    // the HA Blueprint (#47) can leave it off and vice versa.
    switcherEnabled: parseBool(env.SWITCHER_ENABLED, false),
    switcherIntervalMs: parseInt(env.SWITCHER_INTERVAL_MS || '5000', 10),
    fullyKiosksRaw: env.FULLY_KIOSKS || '',
    // Visual toggles (v2 visual sprint). All default OFF so existing installs
    // keep the original look until the user opts in. Exposed to the browser
    // via GET /api/config.
    visual: {
      progressBar: parseBool(env.VISUAL_PROGRESS_BAR, false),
      ratingsBadges: parseBool(env.VISUAL_RATINGS_BADGES, false),
      // How the info panel (title + ratings + meta + tech) is revealed:
      //   'on_tap'   — default; hidden until the user taps the poster (8 s peek)
      //   'on_pause' — persistently shown while paused, still tappable when playing
      //   'always'   — persistently shown whenever media is playing
      infoPanelMode: parseEnum(env.VISUAL_INFO_PANEL_MODE,
        ['on_tap', 'on_pause', 'always'], 'on_tap'),
    },
    // Where the static HTML lives (overridden in tests)
    staticDir: env.STATIC_DIR || new URL('../../www', import.meta.url).pathname,
  };

  const errors = validate(config);
  return { config, errors };
}

function parseBool(v, defaultValue) {
  if (v == null || v === '') return defaultValue;
  return /^(1|true|yes|on)$/i.test(String(v));
}

function parseEnum(v, allowed, defaultValue) {
  if (v == null || v === '') return defaultValue;
  const s = String(v).trim().toLowerCase();
  return allowed.includes(s) ? s : defaultValue;
}

function validate(c) {
  const errors = [];
  if (!c.haUrl) errors.push('haUrl is required (set HA_URL or run as an add-on)');
  if (!c.haToken) errors.push('haToken is required (set HA_TOKEN or run as an add-on so SUPERVISOR_TOKEN is provided)');
  if (c.plexUrl && !c.plexToken) errors.push('plexToken is required when plexUrl is set');
  if (!Number.isFinite(c.port) || c.port < 1 || c.port > 65535) errors.push('port must be between 1 and 65535');
  if (!Number.isFinite(c.poll) || c.poll < 1000) errors.push('poll must be \u2265 1000 ms');
  if (c.switcherEnabled && !c.fullyKiosksRaw) {
    errors.push('FULLY_KIOSKS is required when SWITCHER_ENABLED is true');
  }
  if (!Number.isFinite(c.switcherIntervalMs) || c.switcherIntervalMs < 1000) {
    errors.push('switcherIntervalMs must be \u2265 1000 ms');
  }
  return errors;
}
