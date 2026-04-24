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
- Backdrop art on pause (closes #21). Opt-in via `visual_use_backdrops:
  true`. Two styles: `fullscreen` (default) crossfades the poster view to
  the Plex fanart after `visual_backdrop_delay_ms` of sustained pause on
  landscape devices; `ambient` replaces the yellow bulb-lit background
  with a blurred and darkened copy of the fanart whenever media is active,
  and works in both orientations because the blur makes aspect ratio moot.
  Fanart is proxied through a new `/api/plex-art?path=…` endpoint so the
  Plex token never reaches the browser; the proxy rejects any path that
  doesn't start with `/library/` to block SSRF-style abuse. Requires
  `plex_url` + `plex_token`.
- Burn-in mitigation (closes #28). Opt-in via
  `visual_burn_in_mitigation: true`. Combines two subsystems: (1) a pixel
  nudge that shifts the whole UI by ±N pixels every N ms via a 400 ms GPU
  transform (tunable via `visual_nudge_interval_ms` 5 000–600 000 and
  `visual_nudge_amplitude_px` 1–16, defaults 60 000 / 4), and (2) an
  optional night-mode dim overlay driven by an HA
  `input_boolean` / `switch` / `binary_sensor`
  (`visual_night_mode_entity`) with the OS `prefers-color-scheme: dark`
  media query as automatic fallback; overlay opacity tunable via
  `visual_night_mode_opacity` (0–0.95, default 0.4). New `GET
  /api/night-mode` endpoint surfaces entity state to the kiosk.
- Theme presets (closes #23). New `visual_theme` option — one of
  `classic-gold` (default, original bulb look), `art-deco-silver` (cooler
  chrome accents), `neon-80s` (hot pink + cyan), or `minimalist-dark`
  (clean dark UI, ornament off). Drives `<body data-theme>` so all
  accent-derived elements (bulbs, marquee text glow, progress bar,
  ratings badges) reskin together. Existing installs default to
  `classic-gold` so nothing changes until the user picks another preset.
- Accent colour picker (closes #66). Opt-in `visual_accent_color` — a
  strict `#RRGGBB` hex (e.g. `#ff5500`) that overrides the active theme's
  accent ramp via `--accent-override`; the four-stop ramp is derived with
  CSS `color-mix(in srgb, ...)`. Empty value (the default) leaves the
  theme's ramp untouched. Short form (`#abc`) and named colours are
  rejected at both server and client validation layers.
