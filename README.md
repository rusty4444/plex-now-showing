# Plex Now Showing

<p align="center">
  <a href="https://buymeacoffee.com/rusty4" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50">
  </a>
</p>

> **v2.0** — No config files required. Everything is set up through the built-in browser UI.

A full-screen cinema marquee display for Home Assistant showing what is
currently playing on Plex, Jellyfin, Emby, or Kodi. Designed for wall-mounted
tablets running Fully Kiosk Browser, but works in any modern browser.

![Platform](https://img.shields.io/badge/Platform-Home_Assistant-blue)

<p align="center">
  <img src="screenshots/now-showing.jpg" alt="Now Showing Marquee" width="300">
  &nbsp;&nbsp;
  <img src="screenshots/info-overlay.jpg" alt="Tap for Info Overlay" width="300">
</p>

<p align="center">
  <img src="screenshots/v2-now-showing-euphoria.png" alt="V2 bulb frame theme with poster art" width="260">
  &nbsp;&nbsp;
  <img src="screenshots/v2-now-showing-gold-line.png" alt="V2 gold-line frame style" width="260">
</p>

<p align="center">
  <img src="screenshots/landscape-mode.jpg" alt="Landscape Mode with Blurred Background" width="620">
</p>

---

## ✨ Setup is done in the browser

In v2.0, **you don't need to edit any config files to get started.** When you open the kiosk page for the first time, a setup UI opens automatically in your browser.

The setup UI has three tabs:

| Tab | What you configure |
|-----|--------------------|
| **Connection** | Home Assistant URL, HA long-lived token, media backend, optional player pin, optional Plex URL/token, landscape mode |
| **Display** | Theme preset, accent color, frame style, marquee font, progress bar, ratings badges, genre chips, info-panel mode, backdrops, burn-in mitigation, and night dimming |
| **Automation** | Import or download the tablet-switching Blueprint, or configure the built-in Fully Kiosk switcher |

Once saved, your settings are stored in the browser and the kiosk starts immediately. You can reopen the setup UI at any time using the **gear icon**.

<p align="center">
  <img src="screenshots/v2-setup-connection.png" alt="Setup Connection tab" width="300">
  &nbsp;&nbsp;
  <img src="screenshots/v2-setup-display.png" alt="Setup Display tab" width="300">
</p>

---

## Install Paths

Choose the install path that fits your Home Assistant setup. All three use the same kiosk UI and the same browser-based setup.

| Path | Best for | Token handling |
|------|----------|----------------|
| **[Home Assistant Add-on](#setup-a-home-assistant-add-on)** | HA OS / Supervised | Supervisor supplies the token server-side — no token stored in the browser |
| **[Docker Compose](#setup-b-docker-compose)** | HA Container / plain Docker | Token stays in a `.env` file on the server, not in the browser |
| **[Frontend-only / Manual](#setup-c-frontend-only--manual)** | HACS-style or copy-to-`www` installs | Token stored in browser `localStorage` via the setup UI |

---

## Setup A: Home Assistant Add-on

> **Recommended for HA OS and HA Supervised.** The Supervisor token is handled server-side — you don't enter it in the browser.

1. In Home Assistant go to **Settings → Add-ons → Add-on Store → ⋮ → Repositories**.
2. Add this repository URL:
   ```
   https://github.com/rusty4444/plex-now-showing
   ```
   To track the `dev` branch before it is promoted to `main`:
   ```
   https://github.com/rusty4444/plex-now-showing#dev
   ```
3. Install **Plex Now Showing** from the store.
4. Start the add-on — **no config file editing required**.
5. Click **Open Web UI** (Ingress), or open directly:
   ```
   http://<ha-ip>:8099/now_showing.html
   ```
6. The browser setup UI opens automatically. Fill in your settings and click **Save**.

> The direct `8099/tcp` port is useful for Fully Kiosk tablets. Leave the port blank in add-on Network settings if you only need Ingress.

For the full list of add-on configuration options see
[`addons/plex-now-showing/DOCS.md`](addons/plex-now-showing/DOCS.md).

---

## Setup B: Docker Compose

> **For HA Container or any plain Docker host.**

1. Copy the example files and fill in your credentials:
   ```bash
   cd docker
   cp .env.example .env
   # edit .env — set HA_URL and HA_TOKEN at minimum
   ```
2. Start the container:
   ```bash
   docker compose -f docker-compose.example.yml up -d
   ```
3. Open the kiosk in your browser:
   ```
   http://<docker-host>:8099/now_showing.html
   ```
4. The browser setup UI opens automatically. Adjust any visual or automation settings and click **Save**.

Minimum required `.env` values:
```env
HA_URL=http://homeassistant.local:8123
HA_TOKEN=YOUR_LONG_LIVED_ACCESS_TOKEN
BACKEND=plex
```

Common optional values:
```env
PLAYER=
PLEX_URL=http://192.168.1.10:32400
PLEX_TOKEN=
PLEX_USERNAME=
LANDSCAPE=false
VISUAL_THEME=classic-gold
VISUAL_FRAME_STYLE=bulbs
VISUAL_MARQUEE_FONT=bebas-neue
VISUAL_PROGRESS_BAR=false
```

Use `TAG=latest` for the stable v2 release, `TAG=2.0.0` to pin a specific
release, or `TAG=dev` for the rolling dev branch.

Health and debug endpoints:
```bash
curl http://localhost:8099/healthz
curl http://localhost:8099/api
curl http://localhost:8099/api/state
```

More Docker notes: [`docker/README.md`](docker/README.md).

---

## Setup C: Frontend-Only / Manual

> **Closest to v1.x.** No Node server required. The HA token is stored in the tablet browser via the setup UI.

1. Copy the kiosk file into Home Assistant:
   ```
   www/now_showing.html → <config>/www/now_showing.html
   ```
2. Open it in your browser:
   ```
   http://<ha-ip>:8123/local/now_showing.html
   ```
3. The browser setup UI opens automatically. Fill in your Connection, Display, and Automation settings, then click **Save**.
4. Settings are stored in the browser's `localStorage` and the kiosk starts.

> **Settings not sticking?** If the tablet browser blocks or clears `localStorage`, use a `now_showing.config.js` file or URL hash parameters instead (see below).

### Optional: Runtime Config File

For installs where `localStorage` is unavailable (e.g. some kiosk browsers), you can ship a static config file instead:

```bash
cp www/now_showing.config.example.js www/now_showing.config.js
```

Edit `now_showing.config.js` then copy it to Home Assistant alongside `now_showing.html`:

```javascript
window.NOW_SHOWING_CONFIG = {
  haUrl: 'http://homeassistant.local:8123',
  haToken: 'YOUR_LONG_LIVED_ACCESS_TOKEN',
  backend: 'plex', // plex | jellyfin | emby | kodi
  player: '',
  plexUsername: '',
  plexUrl: '',
  plexToken: '',
  landscape: false,
  poll: 5000,
  visualTheme: 'classic-gold',
  visualFrameStyle: 'bulbs',
  visualMarqueeFont: 'bebas-neue',
  visualProgressBar: false,
};
```

### Optional: URL Hash Parameters

For multi-tablet setups or one-off overrides, settings can be passed directly in the URL:

```
http://<ha-ip>:8123/local/now_showing.html#haToken=...&backend=jellyfin&player=media_player.jellyfin_living_room
```

URL hash values always override saved `localStorage` settings, making them useful for per-tablet customisation.

---

## Features

- Cinema marquee with animated bulb frame, title overlays, idle state, and portrait/landscape layouts.
- Playback support for Plex, Jellyfin, Emby, and Kodi `media_player` entities.
- Optional exact player pinning via `player`.
- Plex username filtering for shared servers.
- Tap-for-info panel with synopsis, rating, duration, progress, and Plex media-file details.
- Optional progress bar driven by HA `media_position`.
- Optional IMDb / Rotten Tomatoes / audience badges and genre chips (Plex metadata).
- Info-panel modes: `on_tap`, `on_pause`, or `always`.
- Backdrop art on pause — fullscreen landscape fade or ambient blurred fanart.
- OLED-friendly burn-in mitigation with pixel nudge and night-mode dimming.
- Theme presets: `classic-gold`, `art-deco-silver`, `neon-80s`, `minimalist-dark`.
- Strict `#RRGGBB` accent colour override that reskins the active theme.
- Frame styles: animated `bulbs`, quiet `gold-line`, or `none`.
- Marquee fonts: `bebas-neue`, `anton`, `oswald`, `monoton`, `playfair-display`.
- Fully Kiosk Browser auto-switching between your dashboard and the Now Showing page.
- **No-code setup** — all configuration is available through the browser setup UI.

## Requirements

- Home Assistant with at least one supported media integration: Plex, Jellyfin, Emby, or Kodi.
- One or more active `media_player` entities from that integration.
- Fully Kiosk Browser (optional) for automatic wall-tablet switching.
- Plex URL + Plex token (optional) for enhanced Plex metadata: codec/HDR details, ratings, genre chips, and backdrop art.

---

## What Changed From v1.x

| Area | v2.0.0 adds |
|------|-----------------|
| **Browser setup UI** | First-run setup wizard opens automatically; gear icon reopens it any time. Connection, Display, and Automation tabs replace manual config editing. |
| Safer config | Hard-coded tokens removed from `now_showing.html`. Runtime config comes from the add-on/server, browser `localStorage`, URL hash, or `now_showing.config.js`. |
| Home Assistant add-on | Wraps the server as a Supervisor add-on with Ingress, multi-arch GHCR images, and optional direct port `8099`. |
| Docker Compose | `docker/docker-compose.example.yml` + `.env.example` for HA Container users. |
| Unified server | `server/` serves the kiosk and exposes `/api/state`, `/api/config`, `/api/media-info/:ratingKey`, `/api/artwork`, `/api/night-mode`, and `/healthz`. |
| Multi-backend support | `backend` selects `plex`, `jellyfin`, `emby`, or `kodi`; `player` pins any exact `media_player` entity. |
| Fully Kiosk switching | Bundled HA Blueprint or the add-on/server's built-in Fully Kiosk REST switcher. |
| Visual toggles | Progress bar, ratings badges, genre chips, info-panel modes, pause backdrops, burn-in mitigation, night dimming, frame styles, marquee font picker, theme presets, and accent colour overrides. |

---

## Core Configuration Reference

Most users set these through the setup UI. The table below shows the equivalent option for each install path.

| Purpose | Add-on option | Docker env | Frontend key | Values |
|---------|---------------|------------|--------------|--------|
| Media backend | `backend` | `BACKEND` | `backend` | `plex`, `jellyfin`, `emby`, `kodi` |
| Exact player pin | `player` | `PLAYER` | `player` | Any `media_player.*` entity ID |
| Plex username filter | `plex_username` | `PLEX_USERNAME` | `plexUsername` | Optional |
| Legacy Plex player pin | `plex_player` | `PLEX_PLAYER` | `plexPlayer` | Use `player` for new installs |
| Plex server URL | `plex_url` | `PLEX_URL` | `plexUrl` | Optional; enables Plex metadata |
| Plex token | `plex_token` | `PLEX_TOKEN` | `plexToken` | Required with `plex_url` |
| Landscape mode | `landscape` | `LANDSCAPE` | `landscape` | `true` / `false` |
| Poll interval | `poll_interval` | `POLL` | `poll` | ms, default `5000` |
| State cache | `state_ttl_ms` | `STATE_TTL_MS` | Server only | Default `3000` |
| Media-info cache | `media_info_ttl_ms` | `MEDIA_INFO_TTL_MS` | Server only | Default `600000` |
| API shared secret | `proxy_secret` | `PROXY_SECRET` | Server only | Optional hardening |
| Origin allowlist | `allowed_origins` | `ALLOWED_ORIGINS` | Server only | Comma-separated origins |

## Visual Configuration Reference

All visual features are opt-in (except the default `classic-gold` theme and `bulbs` frame). Set these in the **Display** tab of the setup UI, or via the options below.

| Feature | Add-on option | Docker env | Frontend key | Values |
|---------|---------------|------------|--------------|--------|
| Progress bar | `visual_progress_bar` | `VISUAL_PROGRESS_BAR` | `visualProgressBar` | `true` / `false` |
| Ratings badges | `visual_ratings_badges` | `VISUAL_RATINGS_BADGES` | `visualRatingsBadges` | Plex metadata required |
| Genre chips | `visual_genre_chips` | `VISUAL_GENRE_CHIPS` | `visualGenreChips` | Plex metadata required |
| Info panel mode | `visual_info_panel_mode` | `VISUAL_INFO_PANEL_MODE` | `visualInfoPanelMode` | `on_tap`, `on_pause`, `always` |
| Frame style | `visual_frame_style` | `VISUAL_FRAME_STYLE` | `visualFrameStyle` | `bulbs`, `gold-line`, `none` |
| Marquee font | `visual_marquee_font` | `VISUAL_MARQUEE_FONT` | `visualMarqueeFont` | `bebas-neue`, `anton`, `oswald`, `monoton`, `playfair-display` |
| Backdrops | `visual_use_backdrops` | `VISUAL_USE_BACKDROPS` | `visualUseBackdrops` | Plex metadata required |
| Backdrop style | `visual_backdrop_style` | `VISUAL_BACKDROP_STYLE` | `visualBackdropStyle` | `fullscreen`, `ambient` |
| Backdrop delay | `visual_backdrop_delay_ms` | `VISUAL_BACKDROP_DELAY_MS` | `visualBackdropDelayMs` | `1000`–`600000` ms |
| Burn-in mitigation | `visual_burn_in_mitigation` | `VISUAL_BURN_IN_MITIGATION` | `visualBurnInMitigation` | `true` / `false` |
| Pixel nudge interval | `visual_nudge_interval_ms` | `VISUAL_NUDGE_INTERVAL_MS` | `visualNudgeIntervalMs` | `5000`–`600000` ms |
| Pixel nudge amplitude | `visual_nudge_amplitude_px` | `VISUAL_NUDGE_AMPLITUDE_PX` | `visualNudgeAmplitudePx` | `1`–`16` px |
| Night-mode entity | `visual_night_mode_entity` | `VISUAL_NIGHT_MODE_ENTITY` | `visualNightModeEntity` | HA on/off entity ID |
| Night opacity | `visual_night_mode_opacity` | `VISUAL_NIGHT_MODE_OPACITY` | `visualNightModeOpacity` | `0`–`0.95` |
| Theme preset | `visual_theme` | `VISUAL_THEME` | `visualTheme` | `classic-gold`, `art-deco-silver`, `neon-80s`, `minimalist-dark` |
| Accent colour | `visual_accent_color` | `VISUAL_ACCENT_COLOR` | `visualAccentColor` | Strict `#RRGGBB`, empty for theme default |

---

## Backend Behaviour

When `player` is blank, Now Showing scans active HA media players for the selected backend:

| Backend | Matching entities |
|---------|-------------------|
| Plex | `media_player.plex_*` |
| Jellyfin | `media_player.jellyfin_*` or `media_player.jellyfin` |
| Emby | `media_player.emby_*` or `media_player.emby` |
| Kodi | `media_player.kodi_*` or `media_player.kodi` |

If `player` is set, that exact entity is used regardless of backend prefix.
For Plex, `plex_username` still filters auto-detected sessions to your user.

---

## Fully Kiosk Switching

Automate tablet navigation using either method below. **Do not run both for the same tablet**, or each playback transition will fire twice.

**Option 1 — Home Assistant Blueprint:**
`blueprints/automation/rusty4444/plex_now_showing_display.yaml`

**Option 2 — Built-in switcher (add-on / Docker):**
Enable `switcher_enabled` / `SWITCHER_ENABLED` and configure one or more Fully Kiosk targets.

The **Automation** tab of the setup UI has a Blueprint import/download button and a built-in switcher helper that generates the correct add-on or Docker config for you. Copy the generated values into your add-on options or `.env` and restart.

Add-on options:

| Option | Purpose |
|--------|---------|
| `switcher_enabled` | Turns on the built-in switcher |
| `switcher_interval_ms` | Poll interval for play/stop edges |
| `fully_kiosks` | List of tablet `host`, `password`, `playing_url`, and optional `stopped_url` |

Docker env:
```env
SWITCHER_ENABLED=true
SWITCHER_INTERVAL_MS=5000
FULLY_KIOSKS=http://tablet.lan:2323|fully_password|http://ha.lan:8099/now_showing.html|http://ha.lan:8123/lovelace/0
```

---

## Tap for Info

Tap the poster while media is active to show the info panel. Depending on the
backend and configured metadata, it can show:

- Title, series, season/episode, and playback state
- Synopsis, content rating, duration, and player name
- Playback progress
- Plex media-file details: resolution, codec, audio, bitrate, and file size
- Optional ratings badges and genre chips

`visual_info_panel_mode` controls whether the panel is hidden until tap (`on_tap`), pinned while paused (`on_pause`), or always visible while media is active (`always`).

---

## Troubleshooting

- **Add-on opens but shows no media** — confirm the selected `backend` matches your HA integration and that a matching `media_player` is in `playing` or `paused`.
- **Docker returns 502 from `/api/state`** — check `HA_URL` and `HA_TOKEN` in `.env`, then run `curl http://localhost:8099/healthz`.
- **Setup opens every time (frontend-only)** — `localStorage` may be blocked or cleared by the tablet browser. Use `now_showing.config.js` or a URL hash instead.
- **Plex ratings, genres, codec info, or backdrops are missing** — set both `plex_url` and `plex_token`. These are Plex-only enhanced metadata features.
- **Another Plex user's playback appears** — set `plex_username`, or pin `player` to the exact entity you want.
- **Visual options don't change (frontend-only)** — open the setup gear, go to the Display tab, save, and let the page reload. URL hash values override saved settings for one-off testing.
- **Fully Kiosk switches twice** — disable either the Blueprint or the built-in switcher for that tablet.

---

## Important Files

| Path | Purpose |
|------|---------|
| `www/now_showing.html` | The kiosk UI |
| `www/now_showing.config.example.js` | Frontend-only runtime config example |
| `server/` | Unified Node server for add-on and Docker installs |
| `addons/plex-now-showing/` | Home Assistant add-on package |
| `addons/plex-now-showing/DOCS.md` | Full add-on option documentation |
| `docker/` | Docker Compose install path |
| `blueprints/automation/rusty4444/plex_now_showing_display.yaml` | HA Blueprint for tablet switching |
| `repository.yaml` | Home Assistant add-on repository manifest |
| `.github/workflows/build-addon.yml` | Multi-arch add-on image build and publish workflow |

---

## Related

Looking for a dashboard card showing recently added media? Check out
[recently-added-media-card](https://github.com/rusty4444/recently-added-media-card),
a unified Lovelace card that supports Plex, Kodi, Jellyfin, and Emby.

Want to show upcoming movies and TV episodes alongside your recently added
media? Check out
[coming-soon-card](https://github.com/rusty4444/coming-soon-card), a companion
card powered by Radarr, Sonarr, and Trakt.

The older standalone Kodi, Jellyfin, and Emby Now Showing repos are being
folded into this V2 multi-backend codebase via the `backend` setting.

## Credits

Built by Sam Russell. AI used in development.
