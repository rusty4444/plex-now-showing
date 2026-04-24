# Changelog

All notable changes to the Plex Now Showing add-on will be documented here.
The project follows [Semantic Versioning](https://semver.org/).

## 0.1.0 — Unreleased

### Added
- Initial add-on wrapper for the unified Node 20 server (closes #44).
- Ingress support (`ingress: true`, entry `/now_showing.html`).
- User options for Plex URL/token/username/player, theme, landscape, poll
  interval, cache TTLs, proxy secret, and origin allowlist.
- Multi-arch Dockerfile (`amd64`, `aarch64`, `armv7`, `armhf`, `i386`).
- s6-overlay service that forwards `/data/options.json` → env and runs
  `node src/server.js`.
- HEALTHCHECK against `/healthz` so Supervisor can detect a stuck process.
- Built-in Fully Kiosk auto-switcher (closes #48). Opt-in via
  `switcher_enabled: true`; configure one entry per tablet under
  `fully_kiosks`. Alternative to the HA Blueprint (#47 / PR #51) — pick one,
  not both.
- Playback progress bar (closes #17). Opt-in via `visual_progress_bar: true`
  — a slim gold bar along the bottom of the poster that tracks HA's
  `media_position`, interpolated between polls for smooth motion. Freezes
  while paused, hides when idle. Off by default; every other v2 visual
  feature will follow the same toggle pattern.
- Server now exposes `GET /api/config` so the browser can read runtime
  visual toggles without a rebuild.
- Ratings badges (closes #18). Opt-in via `visual_ratings_badges: true` —
  IMDb, Rotten Tomatoes (fresh/rotten critic), and audience (RT upright/
  spilled or TMDB fallback) chips on the info panel. Scores are pulled
  server-side from `/library/metadata` and cached with the existing
  media-info TTL. Requires `plex_url` + `plex_token`.
- Info panel visibility mode (`visual_info_panel_mode`). Three choices:
  `on_tap` (default, current behaviour), `on_pause` (panel pinned open
  whenever the player is paused; tap-to-peek still works while playing),
  and `always` (panel pinned open the entire time media is active).
- Genre chips (closes #20). Opt-in via `visual_genre_chips: true` — genre
  pills (Action, Sci-Fi, …) appended to the content-rating row on the
  info panel. Tags read from Plex metadata (`item.Genre[]`) via the
  existing media-info pipeline; requires `plex_url` + `plex_token`. Capped
  at 6 entries and deduped so a long sub-genre list can't blow out the
  layout.
