import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

test('addon mode is chosen when SUPERVISOR_TOKEN is present', () => {
  const { config, errors } = loadConfig({ SUPERVISOR_TOKEN: 'abc' });
  assert.equal(config.mode, 'addon');
  assert.equal(config.haUrl, 'http://supervisor/core');
  assert.equal(config.haToken, 'abc');
  assert.deepEqual(errors, []);
});

test('standalone mode requires HA_URL and HA_TOKEN', () => {
  const { errors } = loadConfig({});
  assert.ok(errors.some(e => e.includes('haUrl')));
  assert.ok(errors.some(e => e.includes('haToken')));
});

test('standalone mode strips trailing slash on HA_URL', () => {
  const { config } = loadConfig({
    HA_URL: 'https://ha.example.com:8123/',
    HA_TOKEN: 'tok',
  });
  assert.equal(config.mode, 'standalone');
  assert.equal(config.haUrl, 'https://ha.example.com:8123');
});

test('backend defaults to plex and accepts supported HA media backends', () => {
  const def = loadConfig({ SUPERVISOR_TOKEN: 'x' });
  assert.equal(def.config.backend, 'plex');

  for (const backend of ['plex', 'jellyfin', 'emby', 'kodi', 'apple_tv', 'streaming', 'kaleidescape']) {
    const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x', BACKEND: backend });
    assert.equal(config.backend, backend);
  }

  const upper = loadConfig({ SUPERVISOR_TOKEN: 'x', BACKEND: 'JELLYFIN' });
  assert.equal(upper.config.backend, 'jellyfin');

  const bogus = loadConfig({ SUPERVISOR_TOKEN: 'x', BACKEND: 'vhs' });
  assert.equal(bogus.config.backend, 'plex');
});

test('generic PLAYER is parsed separately from legacy PLEX_PLAYER', () => {
  const { config } = loadConfig({
    SUPERVISOR_TOKEN: 'x',
    PLAYER: 'media_player.living_room',
    PLEX_PLAYER: 'media_player.plex_legacy',
  });
  assert.equal(config.player, 'media_player.living_room');
  assert.equal(config.plexPlayer, 'media_player.plex_legacy');
});

test('plexUrl without plexToken is an error', () => {
  const { errors } = loadConfig({
    SUPERVISOR_TOKEN: 'x',
    PLEX_URL: 'https://plex.example.com:32400',
  });
  assert.ok(errors.some(e => e.includes('plexToken')));
});

test('ALLOWED_ORIGINS is parsed as a list', () => {
  const { config } = loadConfig({
    SUPERVISOR_TOKEN: 'x',
    ALLOWED_ORIGINS: 'https://a.example, https://b.example',
  });
  assert.deepEqual(config.allowedOrigins, ['https://a.example', 'https://b.example']);
});

test('TTL defaults match spec (3 s state, 10 min media-info)', () => {
  const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x' });
  assert.equal(config.stateTtl, 3000);
  assert.equal(config.mediaInfoTtl, 600000);
  assert.equal(config.comingSoonTtl, 900000);
});

test('display mode defaults to now_showing and accepts coming_soon', () => {
  const def = loadConfig({ SUPERVISOR_TOKEN: 'x' });
  assert.equal(def.config.displayMode, 'now_showing');

  const comingSoon = loadConfig({
    SUPERVISOR_TOKEN: 'x',
    DISPLAY_MODE: 'coming_soon',
    RADARR_URL: 'http://radarr.local:7878',
    RADARR_API_KEY: 'rk',
  });
  assert.equal(comingSoon.config.displayMode, 'coming_soon');
  assert.deepEqual(comingSoon.errors, []);

  const invalid = loadConfig({ SUPERVISOR_TOKEN: 'x', DISPLAY_MODE: 'lobby' });
  assert.equal(invalid.config.displayMode, 'now_showing');
});

test('coming soon config parses source settings and validates required source', () => {
  const missing = loadConfig({ SUPERVISOR_TOKEN: 'x', DISPLAY_MODE: 'coming_soon' });
  assert.ok(missing.errors.some(e => e.includes('Coming Soon source')));

  const { config, errors } = loadConfig({
    SUPERVISOR_TOKEN: 'x',
    RADARR_URL: 'http://radarr.local:7878/',
    RADARR_API_KEY: 'rk',
    SONARR_URL: 'http://sonarr.local:8989/',
    SONARR_API_KEY: 'sk',
    COMING_SOON_TITLE: 'Next Releases',
    COMING_SOON_MOVIES_COUNT: '9',
    COMING_SOON_SHOWS_COUNT: '3',
    COMING_SOON_CYCLE_INTERVAL: '12',
    COMING_SOON_DAYS_OFFSET: '2',
    COMING_SOON_IMAGE_TYPE: 'fanart',
  });

  assert.deepEqual(errors, []);
  assert.equal(config.comingSoon.title, 'Next Releases');
  assert.equal(config.comingSoon.radarrUrl, 'http://radarr.local:7878');
  assert.equal(config.comingSoon.sonarrUrl, 'http://sonarr.local:8989');
  assert.equal(config.comingSoon.moviesCount, 9);
  assert.equal(config.comingSoon.showsCount, 3);
  assert.equal(config.comingSoon.cycleInterval, 12);
  assert.equal(config.comingSoon.daysOffset, 2);
  assert.equal(config.comingSoon.imageType, 'fanart');
});

test('visual toggles all default to false', () => {
  const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x' });
  assert.equal(config.visual.progressBar, false);
  assert.equal(config.visual.ratingsBadges, false);
  assert.equal(config.visual.genreChips, false);
});

test('VISUAL_PROGRESS_BAR=true flips the progress-bar toggle on', () => {
  const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_PROGRESS_BAR: 'true' });
  assert.equal(config.visual.progressBar, true);
});

test('VISUAL_RATINGS_BADGES=true flips the ratings-badges toggle on', () => {
  const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_RATINGS_BADGES: 'true' });
  assert.equal(config.visual.ratingsBadges, true);
  assert.equal(config.visual.progressBar, false);
});

test('VISUAL_GENRE_CHIPS=true flips the genre-chips toggle on', () => {
  const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_GENRE_CHIPS: 'true' });
  assert.equal(config.visual.genreChips, true);
  assert.equal(config.visual.progressBar, false);
  assert.equal(config.visual.ratingsBadges, false);
});

test('VISUAL_INFO_PANEL_MODE defaults to on_tap', () => {
  const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x' });
  assert.equal(config.visual.infoPanelMode, 'on_tap');
});

test('VISUAL_INFO_PANEL_MODE accepts on_pause and always', () => {
  const pause = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_INFO_PANEL_MODE: 'on_pause' });
  assert.equal(pause.config.visual.infoPanelMode, 'on_pause');
  const always = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_INFO_PANEL_MODE: 'always' });
  assert.equal(always.config.visual.infoPanelMode, 'always');
});

test('VISUAL_INFO_PANEL_MODE falls back to on_tap on unknown values', () => {
  const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_INFO_PANEL_MODE: 'bogus' });
  assert.equal(config.visual.infoPanelMode, 'on_tap');
});

test('VISUAL_INFO_PANEL_MODE is case-insensitive', () => {
  const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_INFO_PANEL_MODE: 'ON_PAUSE' });
  assert.equal(config.visual.infoPanelMode, 'on_pause');
});

// ===== #21 backdrop config =====

test('backdrop config defaults — off, fullscreen, 10 s', () => {
  const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x' });
  assert.equal(config.visual.useBackdrops, false);
  assert.equal(config.visual.backdropStyle, 'fullscreen');
  assert.equal(config.visual.backdropDelayMs, 10000);
});

test('VISUAL_USE_BACKDROPS=true flips the master switch on', () => {
  const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_USE_BACKDROPS: 'true' });
  assert.equal(config.visual.useBackdrops, true);
});

test('VISUAL_BACKDROP_STYLE accepts fullscreen and ambient, rejects others', () => {
  const ambient = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_BACKDROP_STYLE: 'ambient' });
  assert.equal(ambient.config.visual.backdropStyle, 'ambient');
  const fullscreen = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_BACKDROP_STYLE: 'fullscreen' });
  assert.equal(fullscreen.config.visual.backdropStyle, 'fullscreen');
  const bogus = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_BACKDROP_STYLE: 'parallax' });
  assert.equal(bogus.config.visual.backdropStyle, 'fullscreen');
});

// ===== #65 frame style =====

test('VISUAL_FRAME_STYLE defaults to bulbs and accepts the three frame modes', () => {
  const def = loadConfig({ SUPERVISOR_TOKEN: 'x' });
  assert.equal(def.config.visual.frameStyle, 'bulbs');

  for (const s of ['bulbs', 'gold-line', 'none']) {
    const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_FRAME_STYLE: s });
    assert.equal(config.visual.frameStyle, s);
  }

  const upper = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_FRAME_STYLE: 'GOLD-LINE' });
  assert.equal(upper.config.visual.frameStyle, 'gold-line');

  const bogus = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_FRAME_STYLE: 'bulb-ish' });
  assert.equal(bogus.config.visual.frameStyle, 'bulbs');
});

test('VISUAL_MARQUEE_FONT defaults to Bebas Neue and accepts supported fonts', () => {
  const def = loadConfig({ SUPERVISOR_TOKEN: 'x' });
  assert.equal(def.config.visual.marqueeFont, 'bebas-neue');

  for (const s of ['bebas-neue', 'anton', 'oswald', 'monoton', 'playfair-display']) {
    const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_MARQUEE_FONT: s });
    assert.equal(config.visual.marqueeFont, s);
  }

  const upper = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_MARQUEE_FONT: 'OSWALD' });
  assert.equal(upper.config.visual.marqueeFont, 'oswald');

  const bogus = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_MARQUEE_FONT: 'comic-sans' });
  assert.equal(bogus.config.visual.marqueeFont, 'bebas-neue');
});

test('VISUAL_BACKDROP_DELAY_MS is clamped to [1000, 600000]', () => {
  const ok = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_BACKDROP_DELAY_MS: '15000' });
  assert.equal(ok.config.visual.backdropDelayMs, 15000);
  const tooSmall = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_BACKDROP_DELAY_MS: '0' });
  assert.equal(tooSmall.config.visual.backdropDelayMs, 1000);
  const tooBig = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_BACKDROP_DELAY_MS: '9999999' });
  assert.equal(tooBig.config.visual.backdropDelayMs, 600000);
  const garbage = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_BACKDROP_DELAY_MS: 'soon' });
  assert.equal(garbage.config.visual.backdropDelayMs, 10000);
});

// ===== #28 burn-in mitigation config =====

test('burn-in mitigation defaults to off with sane sub-defaults', () => {
  const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x' });
  assert.equal(config.visual.burnInMitigation, false);
  assert.equal(config.visual.nudgeIntervalMs, 60000);
  assert.equal(config.visual.nudgeAmplitudePx, 4);
  assert.equal(config.visual.nightModeEntity, '');
  assert.equal(config.visual.nightModeOpacity, 0.4);
});

test('VISUAL_BURN_IN_MITIGATION=true flips master switch', () => {
  const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_BURN_IN_MITIGATION: 'true' });
  assert.equal(config.visual.burnInMitigation, true);
});

test('VISUAL_NUDGE_INTERVAL_MS clamps to [5000, 600000]', () => {
  const tooLow  = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_NUDGE_INTERVAL_MS: '100' });
  assert.equal(tooLow.config.visual.nudgeIntervalMs, 5000);
  const tooHigh = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_NUDGE_INTERVAL_MS: '999999999' });
  assert.equal(tooHigh.config.visual.nudgeIntervalMs, 600000);
  const ok      = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_NUDGE_INTERVAL_MS: '30000' });
  assert.equal(ok.config.visual.nudgeIntervalMs, 30000);
});

test('VISUAL_NUDGE_AMPLITUDE_PX clamps to [1, 16] and ignores garbage', () => {
  const garbage = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_NUDGE_AMPLITUDE_PX: 'banana' });
  assert.equal(garbage.config.visual.nudgeAmplitudePx, 4); // default
  const huge    = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_NUDGE_AMPLITUDE_PX: '999' });
  assert.equal(huge.config.visual.nudgeAmplitudePx, 16);
  const ok      = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_NUDGE_AMPLITUDE_PX: '8' });
  assert.equal(ok.config.visual.nudgeAmplitudePx, 8);
});

test('VISUAL_NIGHT_MODE_OPACITY clamps to [0, 0.95]', () => {
  const tooLow  = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_NIGHT_MODE_OPACITY: '-1' });
  assert.equal(tooLow.config.visual.nightModeOpacity, 0);
  const tooHigh = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_NIGHT_MODE_OPACITY: '5' });
  assert.equal(tooHigh.config.visual.nightModeOpacity, 0.95);
  const ok      = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_NIGHT_MODE_OPACITY: '0.6' });
  assert.equal(ok.config.visual.nightModeOpacity, 0.6);
});

test('VISUAL_NIGHT_MODE_ENTITY round-trips into config', () => {
  const { config } = loadConfig({
    SUPERVISOR_TOKEN: 'x',
    VISUAL_NIGHT_MODE_ENTITY: 'input_boolean.bedroom_kiosk_dim',
  });
  assert.equal(config.visual.nightModeEntity, 'input_boolean.bedroom_kiosk_dim');
});

// ===== #23 theme presets + #66 accent colour =====

test('VISUAL_THEME defaults to classic-gold and accepts the four presets', () => {
  const def = loadConfig({ SUPERVISOR_TOKEN: 'x' });
  assert.equal(def.config.visual.theme, 'classic-gold');

  for (const t of ['classic-gold', 'art-deco-silver', 'neon-80s', 'minimalist-dark']) {
    const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_THEME: t });
    assert.equal(config.visual.theme, t);
  }

  const bogus = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_THEME: 'rainbow-puke' });
  assert.equal(bogus.config.visual.theme, 'classic-gold');
});

test('VISUAL_ACCENT_COLOR defaults to empty string (theme owns it)', () => {
  const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x' });
  assert.equal(config.visual.accentColor, '');
});

test('VISUAL_ACCENT_COLOR accepts #RRGGBB and rejects everything else', () => {
  const lower = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_ACCENT_COLOR: '#c0ffee' });
  assert.equal(lower.config.visual.accentColor, '#c0ffee');

  const upper = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_ACCENT_COLOR: '#FF8800' });
  assert.equal(upper.config.visual.accentColor, '#ff8800'); // normalised lower-case

  const padded = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_ACCENT_COLOR: '  #aabbcc  ' });
  assert.equal(padded.config.visual.accentColor, '#aabbcc');

  // 3-digit short form is intentionally rejected (no auto-expand) so users
  // don't get surprised by lossy hex conversion.
  const short = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_ACCENT_COLOR: '#abc' });
  assert.equal(short.config.visual.accentColor, '');

  const named = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_ACCENT_COLOR: 'gold' });
  assert.equal(named.config.visual.accentColor, '');

  const noHash = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_ACCENT_COLOR: 'aabbcc' });
  assert.equal(noHash.config.visual.accentColor, '');

  const garbage = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_ACCENT_COLOR: 'rgb(255,0,0)' });
  assert.equal(garbage.config.visual.accentColor, '');
});

test('switcher is off by default, on requires FULLY_KIOSKS', () => {
  const off = loadConfig({ SUPERVISOR_TOKEN: 'x' });
  assert.equal(off.config.switcherEnabled, false);
  assert.equal(off.errors.filter(e => e.includes('FULLY_KIOSKS')).length, 0);

  const enabledNoKiosks = loadConfig({ SUPERVISOR_TOKEN: 'x', SWITCHER_ENABLED: 'true' });
  assert.equal(enabledNoKiosks.config.switcherEnabled, true);
  assert.ok(enabledNoKiosks.errors.some(e => e.includes('FULLY_KIOSKS')));

  const enabled = loadConfig({
    SUPERVISOR_TOKEN: 'x',
    SWITCHER_ENABLED: 'true',
    FULLY_KIOSKS: 'http://t:2323|pw|http://srv/a',
  });
  assert.deepEqual(enabled.errors, []);
});
