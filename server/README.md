# plex-now-showing-server

Unified backend that serves the Now Showing HTML **and** proxies Home
Assistant + Plex so API tokens never leave the server. This is the shared
runtime used by:

- **#addon-2** — the Home Assistant add-on wrapper
- **#addon-4** — the Docker Compose example for HA Container users

Standalone (HACS-only) installs continue to work against the unmodified
`www/now_showing.html` — the server is opt-in.

## Endpoints

| Method | Path                              | Purpose                                                 |
|-------:|-----------------------------------|---------------------------------------------------------|
| GET    | `/now_showing.html`               | The kiosk UI (served from `STATIC_DIR`, default `../www`) |
| GET    | `/api`                            | Version + mode + endpoint listing                        |
| GET    | `/api/state`                      | Normalised now-playing payload (3 s TTL cache)          |
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
| `PLEX_URL` / `PLEX_TOKEN` | – | Required together if you want `/api/media-info/:ratingKey` |
| `PLEX_USERNAME` | – | Filters which `media_player.plex_*` entities count as "yours" |
| `PLEX_PLAYER` | – | Pin to one entity id, e.g. `media_player.plex_plex_for_lg_tv` |
| `LANDSCAPE` | `false` | Passed through to the HTML |
| `THEME` | `classic-gold` | Passed through to the HTML |
| `POLL` | `5000` | Kiosk poll interval in ms |
| `STATE_TTL_MS` | `3000` | Server-side `/api/state` cache |
| `MEDIA_INFO_TTL_MS` | `600000` | Server-side media-info cache |
| `PROXY_SECRET` | – | If set, requests to `/api/*` must carry `X-Proxy-Secret` |
| `ALLOWED_ORIGINS` | – | Comma-separated allowlist for `Origin` on `/api/*` |
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
