# Plex Now Showing — Add-on Documentation

## How it runs

This add-on runs the unified Node 20 server in **add-on mode**: it reads
`SUPERVISOR_TOKEN` from the environment and talks to HA at
`http://supervisor/core`. You don't need to create a long-lived access token.

The kiosk HTML auto-detects it's running against the server (via a one-shot
probe of `/api`) and switches to `/api/state`. Plex-only metadata calls use
`/api/media-info`, so Plex and HA tokens never leave the add-on.

## How to open the kiosk

- **Inside HA frontend** → click **Open Web UI** on the add-on page (Ingress).
- **On a standalone tablet / Fully Kiosk** → `http://<ha-ip>:8099/now_showing.html`.
  The `8099/tcp` port mapping is on by default; leave it empty in **Network**
  if you only ever want Ingress.

## Options

| Option | Default | Purpose |
|--------|---------|---------|
| `display_mode` | `now_showing` | `now_showing` for live playback, `coming_soon` for a Radarr/Sonarr upcoming-release screensaver. |
| `backend` | `plex` | Media backend to watch: `plex`, `jellyfin`, `emby`, `kodi`, `apple_tv`, `streaming`, or `kaleidescape`. Use `streaming` for Roku, Google TV, Android TV, Apple TV, or any `media_player` exposing `app_name`. |
| `player` | _empty_ | Optional exact `media_player` entity id. Leave empty to auto-detect active players for `backend`. |
| `plex_url` | _empty_ | e.g. `https://plex.example.com:32400`. Needed for the info panel. |
| `plex_token` | _empty_ | Plex `X-Plex-Token`. Required together with `plex_url`. |
| `plex_username` | _empty_ | Optional filter for `media_player.plex_*` entities. Leave empty to show the first active Plex player. |
| `plex_player` | _empty_ | Legacy Plex-only player pin. Prefer `player` for new installs. |
| `landscape` | `false` | Forces landscape layout on portrait tablets. |
| `theme` | `classic-gold` | Visual theme. |
| `poll_interval` | `5000` | Kiosk poll interval (ms). |
| `state_ttl_ms` | `3000` | Server-side cache for `/api/state`. Smooths multi-tablet polls. |
| `media_info_ttl_ms` | `600000` | Server-side cache for `/api/media-info/:ratingKey`. |
| `coming_soon_ttl_ms` | `900000` | Server-side cache for `/api/coming-soon`. |
| `coming_soon_title` | `Coming Soon` | Marquee text in Coming Soon mode. |
| `radarr_url` | _empty_ | Optional Radarr URL for upcoming movies. |
| `radarr_api_key` | _empty_ | Required with `radarr_url`. |
| `sonarr_url` | _empty_ | Optional Sonarr URL for upcoming episodes. |
| `sonarr_api_key` | _empty_ | Required with `sonarr_url`. |
| `coming_soon_movies_count` | `5` | Number of Radarr movies to include. |
| `coming_soon_shows_count` | `5` | Number of Sonarr series to include. |
| `coming_soon_cycle_interval` | `8` | Seconds each upcoming title stays on screen. |
| `coming_soon_days_offset` | `0` | Include releases from this many days in the past. |
| `coming_soon_image_type` | `poster` | `poster` or `fanart`. |
| `proxy_secret` | _empty_ | If set, requests to `/api/*` must carry `X-Proxy-Secret`. |
| `allowed_origins` | `[]` | Comma-joined allowlist for the `Origin` header on `/api/*`. Leave empty for Ingress-only. |
| `switcher_enabled` | `false` | Turn on the built-in Fully Kiosk auto-switcher. Use **this or the Blueprint (#47)** — not both. |
| `switcher_interval_ms` | `5000` | How often the switcher polls HA for play/stop edges. |
| `fully_kiosks` | `[]` | List of tablets to drive. See below. |
| `visual_progress_bar` | `false` | Slim gold progress bar along the bottom of the poster. See **Visual toggles** below. |
| `visual_ratings_badges` | `false` | IMDb / Rotten Tomatoes / audience badges on the info panel. Needs `plex_url` + `plex_token`. |
| `visual_genre_chips` | `false` | Genre pills (Action, Sci-Fi, …) next to the content rating in the info panel. Needs `plex_url` + `plex_token`. |
| `visual_info_panel_mode` | `on_tap` | When to show the info panel. `on_tap` (default), `on_pause` (pinned while paused), `always` (pinned whenever media is active). |
| `visual_frame_style` | `bulbs` | Screen-edge frame style: `bulbs` (animated marquee bulbs), `gold-line` (thin accent double border), or `none`. |
| `visual_marquee_font` | `bebas-neue` | NOW SHOWING banner font: `bebas-neue`, `anton`, `oswald`, `monoton`, or `playfair-display`. |
| `visual_use_backdrops` | `false` | Master switch for the backdrop-art feature. Needs `plex_url` + `plex_token`. |
| `visual_backdrop_style` | `fullscreen` | `fullscreen` (landscape-only crossfade after `visual_backdrop_delay_ms`) or `ambient` (blurred fanart behind the poster, both orientations). |
| `visual_backdrop_delay_ms` | `10000` | Pause threshold before the fullscreen backdrop fades in (ms, clamped 1000–600000). |
| `visual_burn_in_mitigation` | `false` | Master switch for burn-in mitigation (pixel nudge + optional night mode overlay). |
| `visual_nudge_interval_ms` | `60000` | How often the UI shifts by a few pixels, in ms. Clamped to `5000` – `600000`. |
| `visual_nudge_amplitude_px` | `4` | Maximum shift in pixels. Clamped to `1` – `16`. |
| `visual_night_mode_entity` | _empty_ | Optional HA `input_boolean` / `switch` / `binary_sensor`. When `on`, dims the kiosk. Leave empty to fall back to the OS `prefers-color-scheme: dark` media query. |
| `visual_night_mode_opacity` | `0.4` | Dim overlay opacity when night mode is active. Clamped to `0` – `0.95`. |
| `visual_theme` | `classic-gold` | Theme preset — one of `classic-gold` / `art-deco-silver` / `neon-80s` / `minimalist-dark`. Reskins the bulbs, marquee glow, progress bar, and ratings badges. |
| `visual_accent_color` | _empty_ | Optional `#RRGGBB` hex (e.g. `#ff5500`) that overrides the active theme's accent ramp. Empty = use theme default. Strict format — short form, names, and `rgb()` are rejected. |
| `log_level` | `info` | s6 / add-on log verbosity. |

### Visual toggles (V2)

Every new visual feature is **opt-in** so existing installs keep the
original look until you choose otherwise. Toggles flow from add-on options
through to the browser automatically — no rebuild, no per-tablet config.

| Toggle | What it does |
|--------|--------------|
| `visual_progress_bar` | Adds a slim gold playback bar along the bottom of the poster. Tracks HA's `media_position`, interpolated between polls so it moves smoothly. Dimmed while paused, hidden while idle. |
| `visual_ratings_badges` | Adds IMDb, Rotten Tomatoes (fresh/rotten), and audience score chips on the info panel that slides up when you tap the kiosk. Scores are pulled server-side from Plex's `/library/metadata/{id}` via the existing `/api/media-info/:ratingKey` endpoint — requires `plex_url` + `plex_token` to be set. |
| `visual_genre_chips` | Adds genre pills (Action, Sci-Fi, …) next to the content rating in the info panel. Tags are pulled from Plex metadata (`item.Genre[]`) via `/api/media-info/:ratingKey` — requires `plex_url` + `plex_token`. Personal media libraries without metadata agents will simply render nothing, which is fine. Capped at 6 chips to keep the meta row tidy. |
| `visual_info_panel_mode` | Controls **when** the whole info panel appears. `on_tap` (default) matches v1 behaviour — hidden until you tap the poster, auto-hides after 8 s. `on_pause` pins the panel open whenever the player is paused (tap-to-peek still works during playback). `always` keeps the panel open the entire time media is active; tap is suppressed. Combine with `visual_ratings_badges` if you want ratings visible on pause or always. |
| `visual_frame_style` | Frame style picker (#65). `bulbs` keeps the existing animated outer bulb string. `gold-line` hides the bulbs and draws a quiet double border around the screen edge using the active accent colour, including `visual_accent_color` overrides. `none` removes the decorative frame entirely and stops the bulb animation timer. |
| `visual_marquee_font` | Marquee font picker (#62/#63). `bebas-neue` preserves the original v1 banner. `anton` and `oswald` are clean bold alternatives, `monoton` gives the marquee a neon sign feel, and `playfair-display` is a more editorial serif option. |
| `visual_use_backdrops` / `visual_backdrop_style` / `visual_backdrop_delay_ms` | Backdrop art on pause (#21). **Master switch** is `visual_use_backdrops`. **Style** picks between `fullscreen` (after the item has been paused for `visual_backdrop_delay_ms`, the poster view crossfades to the Plex fanart — landscape orientations only, portrait is silently skipped because fanart crops look bad there) and `ambient` (a blurred + darkened copy of the fanart replaces the yellow bulb-lit background whenever media is active; works on both orientations because the blur makes aspect ratio moot). Images are proxied through the server at `/api/plex-art?path=…` so the Plex token never leaves the server. Requires `plex_url` + `plex_token`. |
| `visual_burn_in_mitigation` | Master switch for long-running-kiosk protection. When on, the whole UI drifts by a few pixels every minute (configurable via `visual_nudge_interval_ms` + `visual_nudge_amplitude_px`) using a smooth 400 ms GPU transform, and a dim overlay can be triggered by an HA entity or the OS dark-mode media query. Off by default. |
| `visual_night_mode_entity` | Optional HA entity id (`input_boolean`, `switch`, or `binary_sensor`). When its state is `on`, the kiosk fades in a dim overlay (opacity from `visual_night_mode_opacity`, default 40%). Leave empty and the kiosk uses `window.matchMedia('(prefers-color-scheme: dark)')` instead — handy for tablets that flip themselves at night. Requires `visual_burn_in_mitigation: true`. |
| `visual_theme` / `visual_accent_color` | Top-level look-and-feel (#23 + #66). `visual_theme` picks one of four presets via `<body data-theme>`: `classic-gold` (default, original warm bulb look), `art-deco-silver` (cooler chrome highlights and brushed-metal glow), `neon-80s` (hot pink + cyan with magenta bulbs), or `minimalist-dark` (clean dark UI, ornament backed off). `visual_accent_color` is an optional strict `#RRGGBB` override (e.g. `#ff5500`) that re-derives the four-stop accent ramp via CSS `color-mix(in srgb, ...)` — leave blank to use the theme's default ramp. Both are presentation-only; nothing on the server changes. |

HACS-only users (no add-on / server) can open `#setup`, switch to the
**Display** tab, and configure every visual toggle without editing code. The
form writes the same per-tablet `pns.*` keys the kiosk reads at runtime.
Advanced users can still set `pns.visualProgressBar=true` /
`pns.visualRatingsBadges=true` / `pns.visualGenreChips=true` /
`pns.visualInfoPanelMode=on_pause` / `pns.visualFrameStyle=gold-line` /
`pns.visualMarqueeFont=anton` /
`pns.visualUseBackdrops=true` / `pns.visualBackdropStyle=ambient` /
`pns.visualBurnInMitigation=true` (with optional
`pns.visualNudgeIntervalMs`, `pns.visualNudgeAmplitudePx`,
`pns.visualNightModeEntity`, `pns.visualNightModeOpacity`) /
`pns.visualTheme=art-deco-silver` / `pns.visualAccentColor=#ff5500` in
`localStorage`, or add the matching
`#visualProgressBar=true` / `#visualRatingsBadges=true` /
`#visualGenreChips=true` / `#visualInfoPanelMode=always` /
`#visualFrameStyle=none` /
`#visualMarqueeFont=monoton` /
`#visualUseBackdrops=true` / `#visualBackdropStyle=ambient` /
`#visualBurnInMitigation=true` /
`#visualTheme=neon-80s` / `#visualAccentColor=%23ff5500`
to the kiosk URL hash.

The setup page also includes an **Automation** tab. It links to the Home
Assistant Blueprint import/download flow and can generate the equivalent
add-on options / Docker env for the built-in Fully Kiosk switcher. The switcher
itself runs server-side, so paste the generated values into the add-on options
or Docker `.env`, then restart the add-on/container.

### Fully Kiosk auto-switcher (#48)

If you’d rather not touch HA automations, flip `switcher_enabled: true` and
add one `fully_kiosks` entry per tablet:

| Field | Required | Example |
|-------|----------|---------|
| `host` | yes | `http://tablet.lan:2323` |
| `password` | yes | Fully → Settings → Remote Admin → “Set Password” |
| `playing_url` | yes | `http://<ha-ip>:8099/now_showing.html` |
| `stopped_url` | no | Any URL to return to when media stops; leave empty to use Fully’s start URL |

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
   Fully Kiosk auto-switcher (#48) so the tablet only shows the UI when media
   is playing.

## Troubleshooting

- **Web UI is blank / `/api/state` returns 502** — HA API is unreachable.
  Check the add-on log for `HA /api/states returned ...`. Supervisor sets
  `SUPERVISOR_TOKEN` automatically; this usually only breaks if HA itself is
  restarting.
- **Info panel missing codec / HDR info** — `plex_url` + `plex_token` are
  required. Without them the server returns `503 plex_not_configured` from
  `/api/media-info/:ratingKey` and the HTML falls back to the bare player
  attributes it already had.
- **Artwork doesn't load** — check that the HA `media_player` entity
  has `entity_picture`. If it's a remote URL the server passes it through
  untouched; if it's HA-relative the server serves it via `/api/artwork`.
- **I want to use this without the add-on** — either run the Docker Compose
  example (#46) or use the HACS frontend-only path (path C in `DEV_README.md`).
