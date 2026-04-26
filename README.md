# Plex Now Showing

<p align="center">
  <a href="https://buymeacoffee.com/rusty4" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50">
  </a>
</p>

> This README describes the `dev` branch / V2 work. The `main` branch is the
> stable V1 Plex-only, single-file release.

A full-screen cinema marquee display for Home Assistant that shows what is
currently playing on Plex, Jellyfin, Emby, or Kodi. It is designed for
wall-mounted tablets running Fully Kiosk Browser, but it also works in any
modern browser.

V2 keeps the original marquee feel while adding a secure server/add-on path,
Docker support, multi-backend playback detection, tablet switching, visual
presets, optional metadata panels, and kiosk-friendly burn-in controls.

![Platform](https://img.shields.io/badge/Platform-Home_Assistant-blue)

<p align="center">
  <img src="screenshots/now-showing.jpg" alt="Now Showing Marquee" width="300">
  &nbsp;&nbsp;
  <img src="screenshots/info-overlay.jpg" alt="Tap for Info Overlay" width="300">
</p>

<p align="center">
  <img src="screenshots/landscape-mode.jpg" alt="Landscape Mode with Blurred Background" width="620">
</p>

## Install Paths

| Path | Best for | Secret handling | Start here |
|------|----------|-----------------|------------|
| Home Assistant add-on | HA OS / Supervised | Uses Supervisor token server-side; no HA long-lived token in the browser | Add the repo in the Add-on Store and open the add-on Web UI |
| Docker Compose | HA Container / plain Docker | Uses `HA_URL` + `HA_TOKEN` from `.env`; tokens stay server-side | `docker/.env.example` + `docker/docker-compose.example.yml` |
| Frontend-only / manual | HACS-style or copy-to-`www` installs | Uses local device storage, hash config, or `now_showing.config.js` | Copy `www/now_showing.html` into Home Assistant `www` |

All three paths use the same kiosk UI. The add-on and Docker paths add the
Node server that proxies Home Assistant and Plex metadata so API tokens are
not exposed to the tablet browser.

## What Is New On `dev` Vs `main`

| Area | V2 / `dev` adds |
|------|-----------------|
| Safer config | Hard-coded tokens were removed from `now_showing.html`. Runtime config now comes from the add-on/server, `localStorage`, URL hash, or `now_showing.config.js`. |
| First-run setup | Frontend-only installs open a `#setup` form when no HA token is found. The gear icon reopens setup later. |
| Home Assistant add-on | `addons/plex-now-showing` wraps the server as a Supervisor add-on with Ingress, a config form, logs, multi-arch GHCR images, and optional direct port `8099`. |
| Docker Compose | `docker/docker-compose.example.yml` and `.env.example` run the same image for HA Container users. |
| Unified server | `server/` serves the kiosk and exposes `/api/state`, `/api/config`, `/api/media-info/:ratingKey`, `/api/artwork`, `/api/night-mode`, and `/healthz`. |
| Multi-backend support | `backend` selects `plex`, `jellyfin`, `emby`, or `kodi`; `player` can pin any exact `media_player` entity. Plex-specific `plex_player` is still accepted for compatibility. |
| Fully Kiosk switching | Use either the bundled HA Blueprint or the add-on/server's built-in Fully Kiosk REST switcher. |
| Visual toggles | Progress bar, ratings badges, genre chips, info-panel display modes, pause backdrops, burn-in mitigation, night dimming, frame styles, theme presets, and accent color overrides. |
| CI / release plumbing | Multi-arch add-on builds, config linting, Docker image publishing, server tests, add-on docs, and examples. |

## Features

- Cinema marquee display with animated bulb frame, title overlays, idle state,
  and portrait or landscape layouts.
- Playback support for Plex, Jellyfin, Emby, and Kodi Home Assistant
  `media_player` entities.
- Optional exact player pinning via `player`.
- Plex username filtering so shared Plex servers can show only your sessions.
- Tap-for-info panel with synopsis, player, rating, duration, progress, and
  Plex media-file details when `plex_url` + `plex_token` are configured.
- Optional progress bar driven by Home Assistant `media_position`.
- Optional IMDb / Rotten Tomatoes / audience badges and genre chips from Plex
  metadata.
- Optional info-panel modes: `on_tap`, `on_pause`, or `always`.
- Optional backdrop art on pause, either fullscreen landscape fade or ambient
  blurred fanart.
- Optional OLED-friendly burn-in mitigation with pixel nudge and night-mode
  dimming.
- Theme presets: `classic-gold`, `art-deco-silver`, `neon-80s`, and
  `minimalist-dark`.
- Strict `#RRGGBB` accent color override that reskins the active theme.
- Frame style picker: animated `bulbs`, quiet `gold-line`, or `none`.
- Optional Fully Kiosk Browser auto-switching between your dashboard and the
  Now Showing page.

## Requirements

- Home Assistant with at least one supported media integration configured:
  Plex, Jellyfin, Emby, or Kodi.
- One or more active `media_player` entities from that integration.
- Fully Kiosk Browser if you want automatic wall-tablet switching.
- Plex URL + Plex token only if you want Plex-only enhanced metadata such as
  codec/HDR details, ratings, genre chips, or Plex backdrop art.

## Setup A: Home Assistant Add-on

Use this path for HA OS or HA Supervised. It is the recommended V2 install
because Home Assistant Supervisor supplies the API token automatically.

1. Open Home Assistant.
2. Go to **Settings -> Add-ons -> Add-on Store -> ... -> Repositories**.
3. Add this repository URL:

   ```text
   https://github.com/rusty4444/plex-now-showing
   ```

   While testing the `dev` branch before it is promoted to `main`, use the
   branch-suffixed repository URL:

   ```text
   https://github.com/rusty4444/plex-now-showing#dev
   ```

   Home Assistant supports the `#branch` suffix for stable/canary add-on
   repositories:
   https://developers.home-assistant.io/docs/add-ons/presentation/#offering-stable-and-canary-version

4. Install **Plex Now Showing**.
5. Configure the add-on:
   - `backend`: `plex`, `jellyfin`, `emby`, or `kodi`
   - `player`: optional exact entity ID, for example `media_player.kodi`
   - `plex_url` and `plex_token`: optional, Plex enhanced metadata only
   - visual options such as `visual_theme`, `visual_frame_style`, and
     `visual_progress_bar`
6. Start the add-on.
7. Click **Open Web UI** for Ingress, or open:

   ```text
   http://<ha-ip>:8099/now_showing.html
   ```

The direct `8099/tcp` port is useful for Fully Kiosk tablets. Leave the port
empty in the add-on Network settings if you only want Ingress access.

Full add-on option docs live in
[`addons/plex-now-showing/DOCS.md`](addons/plex-now-showing/DOCS.md).

## Setup B: Docker Compose

Use this path for Home Assistant Container or any plain Docker host.

```bash
cd docker
cp .env.example .env
# edit .env and fill HA_URL + HA_TOKEN
docker compose -f docker-compose.example.yml up -d
```

Open:

```text
http://<docker-host>:8099/now_showing.html
```

For the current `dev` branch image, set this in `docker/.env`:

```env
TAG=dev
```

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
VISUAL_PROGRESS_BAR=false
```

Health and debug endpoints:

```bash
curl http://localhost:8099/healthz
curl http://localhost:8099/api
curl http://localhost:8099/api/state
```

More Docker notes live in [`docker/README.md`](docker/README.md).

## Setup C: Frontend-Only / Manual

Use this path if you only want to copy the HTML into Home Assistant's `www`
folder. This is closest to V1 and does not require the Node server, but the
tablet browser must hold the HA token.

1. Copy the kiosk file:

   ```text
   www/now_showing.html -> <config>/www/now_showing.html
   ```

2. Open:

   ```text
   http://<ha-ip>:8123/local/now_showing.html
   ```

3. If no token is configured, the page opens `#setup`. Fill:
   - **Connection**: Home Assistant URL, HA token, backend, optional player,
     optional Plex URL/token, and landscape mode
   - **Display**: theme preset, accent color, frame style, progress bar,
     ratings badges, genre chips, info-panel mode, backdrops, burn-in
     mitigation, pixel nudge, and night dimming

4. Save and launch. Values are stored in that browser's `localStorage`.

You can also use a local runtime config file:

```bash
cp www/now_showing.config.example.js www/now_showing.config.js
```

Then edit `now_showing.config.js` before copying it to Home Assistant:

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
};
```

For multi-tablet setups, non-secret and secret values can also be supplied in
the URL hash:

```text
http://<ha-ip>:8123/local/now_showing.html#haToken=...&backend=jellyfin&player=media_player.jellyfin_living_room
```

The setup form writes the same `pns.*` keys the kiosk reads at runtime. URL
hash and manual `localStorage` values still work as advanced overrides, for
example:

```javascript
localStorage.setItem('pns.visualTheme', 'neon-80s');
localStorage.setItem('pns.visualFrameStyle', 'gold-line');
localStorage.setItem('pns.visualProgressBar', 'true');
localStorage.setItem('pns.visualAccentColor', '#ff5500');
```

Equivalent URL hash example:

```text
#visualTheme=minimalist-dark&visualFrameStyle=none&visualProgressBar=true&visualAccentColor=%23ff5500
```

## Core Configuration

| Purpose | Add-on option | Docker env | Frontend key | Values |
|---------|---------------|------------|--------------|--------|
| Media backend | `backend` | `BACKEND` | `backend` | `plex`, `jellyfin`, `emby`, `kodi` |
| Exact player pin | `player` | `PLAYER` | `player` | Any `media_player.*` entity ID |
| Plex username filter | `plex_username` | `PLEX_USERNAME` | `plexUsername` | Optional Plex username; blank shows the first active Plex player |
| Legacy Plex player pin | `plex_player` | `PLEX_PLAYER` | `plexPlayer` | Prefer `player` for new installs |
| Plex server URL | `plex_url` | `PLEX_URL` | `plexUrl` | Optional; enables Plex metadata |
| Plex token | `plex_token` | `PLEX_TOKEN` | `plexToken` | Required with `plex_url` |
| Landscape mode | `landscape` | `LANDSCAPE` | `landscape` | `true` / `false` |
| Poll interval | `poll_interval` | `POLL` | `poll` | Milliseconds, default `5000` |
| State cache | `state_ttl_ms` | `STATE_TTL_MS` | Server only | Default `3000` |
| Media-info cache | `media_info_ttl_ms` | `MEDIA_INFO_TTL_MS` | Server only | Default `600000` |
| API shared secret | `proxy_secret` | `PROXY_SECRET` | Server only | Optional `X-Proxy-Secret` hardening |
| Origin allowlist | `allowed_origins` | `ALLOWED_ORIGINS` | Server only | Comma-separated origins |

## Visual Configuration

All visual features are opt-in except the default `classic-gold` theme and
`bulbs` frame, so existing V1-looking installs stay familiar until you enable
something.

| Feature | Add-on option | Docker env | Frontend key | Values |
|---------|---------------|------------|--------------|--------|
| Progress bar | `visual_progress_bar` | `VISUAL_PROGRESS_BAR` | `visualProgressBar` | `true` / `false` |
| Ratings badges | `visual_ratings_badges` | `VISUAL_RATINGS_BADGES` | `visualRatingsBadges` | Plex metadata required |
| Genre chips | `visual_genre_chips` | `VISUAL_GENRE_CHIPS` | `visualGenreChips` | Plex metadata required |
| Info panel mode | `visual_info_panel_mode` | `VISUAL_INFO_PANEL_MODE` | `visualInfoPanelMode` | `on_tap`, `on_pause`, `always` |
| Frame style | `visual_frame_style` | `VISUAL_FRAME_STYLE` | `visualFrameStyle` | `bulbs`, `gold-line`, `none` |
| Backdrops | `visual_use_backdrops` | `VISUAL_USE_BACKDROPS` | `visualUseBackdrops` | Plex metadata required |
| Backdrop style | `visual_backdrop_style` | `VISUAL_BACKDROP_STYLE` | `visualBackdropStyle` | `fullscreen`, `ambient` |
| Backdrop delay | `visual_backdrop_delay_ms` | `VISUAL_BACKDROP_DELAY_MS` | `visualBackdropDelayMs` | `1000` to `600000` ms |
| Burn-in mitigation | `visual_burn_in_mitigation` | `VISUAL_BURN_IN_MITIGATION` | `visualBurnInMitigation` | `true` / `false` |
| Pixel nudge interval | `visual_nudge_interval_ms` | `VISUAL_NUDGE_INTERVAL_MS` | `visualNudgeIntervalMs` | `5000` to `600000` ms |
| Pixel nudge amplitude | `visual_nudge_amplitude_px` | `VISUAL_NUDGE_AMPLITUDE_PX` | `visualNudgeAmplitudePx` | `1` to `16` px |
| Night-mode entity | `visual_night_mode_entity` | `VISUAL_NIGHT_MODE_ENTITY` | `visualNightModeEntity` | HA on/off entity ID |
| Night opacity | `visual_night_mode_opacity` | `VISUAL_NIGHT_MODE_OPACITY` | `visualNightModeOpacity` | `0` to `0.95` |
| Theme preset | `visual_theme` | `VISUAL_THEME` | `visualTheme` | `classic-gold`, `art-deco-silver`, `neon-80s`, `minimalist-dark` |
| Accent color | `visual_accent_color` | `VISUAL_ACCENT_COLOR` | `visualAccentColor` | Strict `#RRGGBB`, empty for theme default |

## Backend Behavior

When `player` is blank, Now Showing scans active Home Assistant media players
for the selected backend:

| Backend | Matching entities |
|---------|-------------------|
| Plex | `media_player.plex_*` |
| Jellyfin | `media_player.jellyfin_*` or `media_player.jellyfin` |
| Emby | `media_player.emby_*` or `media_player.emby` |
| Kodi | `media_player.kodi_*` or `media_player.kodi` |

If `player` is set, that exact entity is used regardless of backend prefix.
For Plex, `plex_username` still filters auto-detected sessions to your user.

## Fully Kiosk Switching

You can automate tablet navigation in either of two ways:

1. **Home Assistant Blueprint**:
   `blueprints/automation/rusty4444/plex_now_showing_display.yaml`
2. **Built-in add-on/server switcher**:
   enable `switcher_enabled` / `SWITCHER_ENABLED` and configure one or more
   Fully Kiosk targets.

Do not run both for the same tablet, or each playback transition will fire
twice.

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

## Tap For Info

Tap the poster while media is active to show the info panel. Depending on the
backend and configured metadata, it can show:

- title, series, season/episode, and playback state
- synopsis, content rating, duration, and player name
- playback progress
- Plex media-file details such as resolution, codec, audio, bitrate, and file
  size
- optional ratings badges and genre chips

`visual_info_panel_mode` can keep the panel hidden until tap, pinned while
paused, or always visible while media is active.

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

## Troubleshooting

- **The add-on opens but shows no media**: confirm the selected `backend`
  matches your HA integration and that a matching `media_player` is in
  `playing` or `paused`.
- **Docker returns 502 from `/api/state`**: check `HA_URL` and `HA_TOKEN`, then
  run `curl http://localhost:8099/healthz`.
- **Frontend-only page opens setup every time**: localStorage may be blocked or
  cleared by the tablet browser. Use `now_showing.config.js` or a URL hash.
- **Plex ratings, genres, codec info, or backdrops are missing**: set both
  `plex_url` and `plex_token`. These are Plex-only enhanced metadata features.
- **Only another Plex user's playback appears**: set `plex_username`, or set
  `player` to the exact player entity you want.
- **Visual options do not change in frontend-only mode**: open the setup gear,
  switch to the Display tab, save, and let the page reload. URL hash values
  still override saved settings for one-off testing.
- **Fully Kiosk switches twice**: disable either the Blueprint or the built-in
  switcher for that tablet.

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
