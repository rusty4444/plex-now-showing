# Plex Now Showing — Add-on Documentation

## How it runs

This add-on runs the unified Node 20 server in **add-on mode**: it reads
`SUPERVISOR_TOKEN` from the environment and talks to HA at
`http://supervisor/core`. You don't need to create a long-lived access token.

The kiosk HTML auto-detects it's running against the server (via a one-shot
probe of `/api`) and switches to `/api/state` + `/api/media-info`, so Plex
and HA tokens never leave the add-on.

## How to open the kiosk

- **Inside HA frontend** → click **Open Web UI** on the add-on page (Ingress).
- **On a standalone tablet / Fully Kiosk** → `http://<ha-ip>:8099/now_showing.html`.
  The `8099/tcp` port mapping is on by default; leave it empty in **Network**
  if you only ever want Ingress.

## Options

| Option | Default | Purpose |
|--------|---------|---------|
| `plex_url` | _empty_ | e.g. `https://plex.example.com:32400`. Needed for the info panel. |
| `plex_token` | _empty_ | Plex `X-Plex-Token`. Required together with `plex_url`. |
| `plex_username` | _empty_ | Filter `media_player.plex_*` entities to your username. |
| `plex_player` | _empty_ | Pin to one entity id, e.g. `media_player.plex_plex_for_lg_tv`. Takes priority over `plex_username`. |
| `landscape` | `false` | Forces landscape layout on portrait tablets. |
| `theme` | `classic-gold` | Visual theme. |
| `poll_interval` | `5000` | Kiosk poll interval (ms). |
| `state_ttl_ms` | `3000` | Server-side cache for `/api/state`. Smooths multi-tablet polls. |
| `media_info_ttl_ms` | `600000` | Server-side cache for `/api/media-info/:ratingKey`. |
| `proxy_secret` | _empty_ | If set, requests to `/api/*` must carry `X-Proxy-Secret`. |
| `allowed_origins` | `[]` | Comma-joined allowlist for the `Origin` header on `/api/*`. Leave empty for Ingress-only. |
| `switcher_enabled` | `false` | Turn on the built-in Fully Kiosk auto-switcher. Use **this or the Blueprint (#47)** — not both. |
| `switcher_interval_ms` | `5000` | How often the switcher polls HA for play/stop edges. |
| `fully_kiosks` | `[]` | List of tablets to drive. See below. |
| `log_level` | `info` | s6 / add-on log verbosity. |

### Fully Kiosk auto-switcher (#48)

If you’d rather not touch HA automations, flip `switcher_enabled: true` and
add one `fully_kiosks` entry per tablet:

| Field | Required | Example |
|-------|----------|---------|
| `host` | yes | `http://tablet.lan:2323` |
| `password` | yes | Fully → Settings → Remote Admin → “Set Password” |
| `playing_url` | yes | `http://<ha-ip>:8099/now_showing.html` |
| `stopped_url` | no | Any URL to return to when Plex stops; leave empty to use Fully’s start URL |

Under the hood the add-on watches HA for `playing` / `paused` / idle
transitions on your pinned player (or username-filtered players) and calls
Fully’s REST API. The HA Blueprint (#47 / PR #51) does the same job if you
prefer to keep logic in HA — don’t run both or each transition will fire
twice.

### Where to get `plex_token`

Follow the [official Plex guide](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/).
It's stored only in the add-on's `/data/options.json` and never reaches the
browser.

### Multi-tablet installs

Leave `proxy_secret` and `allowed_origins` empty for LAN-only use; Ingress
already authenticates through HA. If you expose `8099/tcp` externally, set
both — the server refuses non-matching requests.

## Kiosk setup (Fully Kiosk)

1. URL to load → `http://<ha-ip>:8099/now_showing.html`
2. Enable "Keep screen on" + "Auto-reload on error"
3. Optional: pair with the Blueprint (#47 / PR #51) or the built-in
   Fully Kiosk auto-switcher (#48, landing in a later PR) so the tablet only
   shows the UI when Plex is playing.

## Troubleshooting

- **Web UI is blank / `/api/state` returns 502** — HA API is unreachable.
  Check the add-on log for `HA /api/states returned ...`. Supervisor sets
  `SUPERVISOR_TOKEN` automatically; this usually only breaks if HA itself is
  restarting.
- **Info panel missing codec / HDR info** — `plex_url` + `plex_token` are
  required. Without them the server returns `503 plex_not_configured` from
  `/api/media-info/:ratingKey` and the HTML falls back to the bare player
  attributes it already had.
- **Artwork doesn't load** — check that the HA `media_player.plex_*` entity
  has `entity_picture`. If it's a remote URL the server passes it through
  untouched; if it's HA-relative the server serves it via `/api/artwork`.
- **I want to use this without the add-on** — either run the Docker Compose
  example (#46) or use the HACS frontend-only path (path C in `DEV_README.md`).
