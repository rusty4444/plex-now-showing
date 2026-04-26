# plex-now-showing-server

Unified backend that serves the Now Showing HTML **and** proxies Home
Assistant + the selected media backend so API tokens never leave the server.
This is the shared
runtime used by:

- **#addon-2** — the Home Assistant add-on wrapper
- **#addon-4** — the Docker Compose example for HA Container users

Standalone (HACS-only) installs continue to work against the unmodified
`www/now_showing.html` — the server is opt-in.

## Endpoints

| Method | Path                              | Purpose                                                 |
|-------:|-----------------------------------|---------------------------------------------------------|
| GET    | `/now_showing.html`               | The kiosk UI (served from `STATIC_DIR`, default `../www`) |
| GET    | `/api`                            | Version + mode + backend + endpoint listing              |
| GET    | `/api/state`                      | Normalised now-playing payload (3 s TTL cache)          |
| GET    | `/api/config`                     | Browser-safe runtime flags (visual toggles)              |
| GET    | `/api/night-mode`                 | `{configured, on}` for the optional night-mode HA entity |
| GET    | `/api/media-info/:ratingKey`      | Plex metadata for the info panel (10 min TTL cache)      |
| GET    | `/healthz`                        | Liveness probe (doesn't call upstream)                   |

## Run modes

The server auto-detects which mode it's in:

### 1. HA Add-on mode (recommended)

Supervisor provides `SUPERVISOR_TOKEN` and the HA API is reachable at
`http://supervisor/core`. **No user-created long-lived access token needed.**

### 2. Standalone mode

For HA Container users running via Docker Compose. Set:

| Env var | Required | Notes |
|---------|----------|-------|
| `HA_URL`   | yes | e.g. `https://ha.example.com:8123` (trailing slash ok) |
| `HA_TOKEN` | yes | Long-lived access token |

## All environment variables

| Env var | Default | Purpose |
|---------|---------|---------|
| `PORT` | `8099` | Listen port |
| `SUPERVISOR_TOKEN` | – | Set by Supervisor; switches to add-on mode |
| `HA_URL` / `HA_TOKEN` | – | Standalone mode |
| `BACKEND` | `plex` | Media backend to watch: `plex`, `jellyfin`, `emby`, or `kodi` |
| `PLAYER` | – | Optional exact `media_player` entity id. Leave empty to auto-detect active players for `BACKEND` |
| `PLEX_URL` / `PLEX_TOKEN` | – | Required together if you want `/api/media-info/:ratingKey` |
| `PLEX_USERNAME` | – | Filters which `media_player.plex_*` entities count as "yours" |
| `PLEX_PLAYER` | – | Legacy Plex-only player pin; prefer `PLAYER` for new installs |
| `LANDSCAPE` | `false` | Passed through to the HTML |
| `THEME` | `classic-gold` | Passed through to the HTML |
| `POLL` | `5000` | Kiosk poll interval in ms |
| `STATE_TTL_MS` | `3000` | Server-side `/api/state` cache |
| `MEDIA_INFO_TTL_MS` | `600000` | Server-side media-info cache |
| `PROXY_SECRET` | – | If set, requests to `/api/*` must carry `X-Proxy-Secret` |
| `ALLOWED_ORIGINS` | – | Comma-separated allowlist for `Origin` on `/api/*` |
| `SWITCHER_ENABLED` | `false` | Turn on the built-in Fully Kiosk auto-switcher (#48) |
| `SWITCHER_INTERVAL_MS` | `5000` | How often the switcher polls HA for play/stop edges |
| `FULLY_KIOSKS` | – | One kiosk per line: `host|password|playing_url[|stopped_url]` |
| `VISUAL_PROGRESS_BAR` | `false` | Show a slim gold progress bar along the bottom of the poster |
| `VISUAL_RATINGS_BADGES` | `false` | Show IMDb / Rotten Tomatoes / audience score badges in the info panel (needs `PLEX_URL` + `PLEX_TOKEN`) |
| `VISUAL_GENRE_CHIPS` | `false` | Show genre pills next to the content rating in the info panel (needs `PLEX_URL` + `PLEX_TOKEN`) |
| `VISUAL_INFO_PANEL_MODE` | `on_tap` | When to show the info panel: `on_tap`, `on_pause`, or `always` |
| `VISUAL_FRAME_STYLE` | `bulbs` | Screen-edge frame style: `bulbs`, `gold-line`, or `none` |
| `VISUAL_USE_BACKDROPS` | `false` | Master switch for backdrop art on pause (#21). Needs `PLEX_URL` + `PLEX_TOKEN` |
| `VISUAL_BACKDROP_STYLE` | `fullscreen` | `fullscreen` (landscape-only crossfade) or `ambient` (blurred fanart behind the poster, all orientations) |
| `VISUAL_BACKDROP_DELAY_MS` | `10000` | Pause threshold for the fullscreen fade-in (ms, clamped 1000–600000) |
| `VISUAL_BURN_IN_MITIGATION` | `false` | Master switch for burn-in mitigation (pixel nudge + optional night mode overlay) |
| `VISUAL_NUDGE_INTERVAL_MS` | `60000` | Pixel-nudge interval in ms (clamped 5 000–600 000) |
| `VISUAL_NUDGE_AMPLITUDE_PX` | `4` | Maximum pixel shift (clamped 1–16) |
| `VISUAL_NIGHT_MODE_ENTITY` | _empty_ | Optional HA `input_boolean` / `switch` / `binary_sensor`; when `on`, dims the kiosk. Empty → fall back to `prefers-color-scheme: dark` |
| `VISUAL_NIGHT_MODE_OPACITY` | `0.4` | Dim overlay opacity (clamped 0–0.95) |
| `VISUAL_THEME` | `classic-gold` | Theme preset — one of `classic-gold` / `art-deco-silver` / `neon-80s` / `minimalist-dark`. Drives `<body data-theme>` |
| `VISUAL_ACCENT_COLOR` | _empty_ | Optional `#RRGGBB` accent override applied on top of the theme. Strict (no `#abc`, no named colours, no `rgb()`) |
| `STATIC_DIR` | `../www` | Override where `now_showing.html` is served from |

## Local development

```bash
cd server
npm install
HA_URL=http://192.168.1.10:8123 HA_TOKEN=... npm run dev
# http://localhost:8099/now_showing.html
```

Run the tests (no network, fully offline):

```bash
npm test
```

## Docker

```bash
docker build -t plex-now-showing-server server/
docker run --rm -p 8099:8099 \
  -e HA_URL=http://192.168.1.10:8123 \
  -e HA_TOKEN=... \
  plex-now-showing-server
```

A full Compose example with HA Container + this image lives under `#addon-4`.
