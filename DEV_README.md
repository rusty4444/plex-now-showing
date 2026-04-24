# Plex Now Showing — V2 Development

This document tracks the V2 roadmap for `plex-now-showing`. V1 is the single‑file `www/now_showing.html` distribution. V2 is a packaged, secure, extensible release with a proper build pipeline, HACS distribution, and a richer feature set.

All V2 work happens on the `dev` branch. Each roadmap item is tracked by a GitHub issue and lands via a feature branch → PR → squash‑merge into `dev`. When `dev` stabilises it is merged into `main` and tagged as `v2.0.0`.

---

## Guiding principles

- **No tokens in source.** A user should never have to paste a Home Assistant long‑lived token or a Plex token into a file that sits in `/config/www`.
- **One‑file install should still work.** A casual user dropping `now_showing.html` into `www/` must still get a working display — configured via a sibling `now_showing.config.js` or URL parameters.
- **Power users get Docker + HACS.** Advanced users get a HACS plugin, a Docker image that proxies HA/Plex, and a Home Assistant Blueprint for the automation.
- **Unify the family.** `plex-`, `jellyfin-`, `emby-` and `kodi-now-showing` converge behind a `backend:` switch so fixes ship once.
- **Cinema feel first.** Every visual change must still look like a real marquee on a wall‑mounted tablet. No dashboards, no chrome.

---

## Roadmap

The roadmap is grouped into four milestones. Each item maps to a GitHub issue — see the Issues tab for status, owners and linked PRs.

### Milestone 1 — Packaging & config (V2.0)

Goal: make V2 installable from HACS, configurable without editing HTML, and safe to expose on a LAN.

- [ ] **#security-1 — Move tokens out of the HTML source.** Hard‑coded `HA_TOKEN` / `PLEX_TOKEN` constants are removed. Tokens are read from (in priority order) URL hash fragment → `localStorage` → `config.json` → URL query param. Query‑param fallback logs a console warning about referrer leakage.
- [ ] **#security-2 — First‑run setup page.** `now_showing.html#setup` renders a form that collects HA URL / HA token / Plex username / optional Plex URL+token, stores them in `localStorage`, and redirects back to the display. No more Developer‑Tools detective work.
- [ ] **#security-3 — Optional backend proxy (`plex-now-showing-proxy` Docker image).** A tiny Caddy/Node container keeps tokens server‑side and exposes only the two endpoints the page needs (`/state` and `/media-info/:ratingKey`). Config via env vars. Ships with a `docker-compose.yml` example.
- [ ] **#security-4 — CSRF / origin hardening.** When running behind the proxy, require a shared secret header set at container start. Reject state requests from unexpected origins.
- [ ] **#pkg-1 — Split the monolith.** `src/index.html` + `src/styles.css` + `src/app.js` + `src/plex.js` + `src/ha.js` + `src/bulbs.js`, bundled with Vite to a single `dist/now_showing.html` (inlined CSS+JS) for easy drop‑in, plus an un‑inlined `dist/` for HACS.
- [ ] **#pkg-2 — HACS distribution.** Add `hacs.json`, `info.md`, LICENSE (MIT), GitHub Release workflow that attaches `now_showing.html` and a zipped `dist/` to each tag. Register as a HACS custom repository.
- [ ] **#pkg-3 — Home Assistant Blueprint.** Convert `automations/plex_now_showing_display.yaml` to a Blueprint with dropdown selectors for `sensor` / `device` / `dashboard_url`. Add a `my.home-assistant.io` import badge to the README.
- [ ] **#pkg-4 — Runtime config file.** `www/now_showing.config.js` (a single `window.NOW_SHOWING_CONFIG = {...}` object) is loaded before the app script. If missing, the app falls back to URL params / setup page.
- [ ] **#pkg-5 — URL‑param driven multi‑tablet.** Every config key becomes a URL param so one HTML can drive several tablets with different `player=` / `landscape=` / `theme=` settings.

### Milestone 2 — Architecture & reliability (V2.1)

Goal: make the app responsive, lighter on HA, and debuggable.

- [ ] **#arch-1 — WebSocket subscription instead of `/api/states` polling.** Subscribe to `state_changed` events for Plex `media_player` entities. Fallback to 15 s polling when WS is unavailable.
- [ ] **#arch-2 — Backoff when idle.** Poll at 5 s while playing, 15 s after 2 min idle, 60 s after 10 min idle. Immediate poke on WS event.
- [ ] **#arch-3 — TTL on `cachedMediaInfo`.** Cache entries expire after 10 min and are keyed by `ratingKey + sessionKey` so transcode decisions stay fresh.
- [ ] **#arch-4 — Defensive `ratingKey` parsing.** `media_content_id` is not always a ratingKey; parse Plex URIs (`plex://…`, `/library/metadata/N`, bare ID) before hitting `/library/metadata/{id}`.
- [ ] **#arch-5 — Robust user filtering.** Replace the `plex_for_` / `plex_web_` heuristic with a direct Plex `/status/sessions` lookup keyed on `Session.User.title`.
- [ ] **#arch-6 — Connection status indicator.** Tiny corner dots (HA + Plex) — green/amber/red. `?debug=1` flips on an on‑screen console.
- [ ] **#arch-7 — CSS‑driven chase animation.** Replace `setInterval(animateChase, 500)` with `@keyframes` + per‑bulb `animation-delay`. Smoother on low‑end tablets, no GC churn.

### Milestone 3 — Visual wow (V2.2)

Goal: make the display feel unmistakably cinematic.

- [ ] **#viz-1 — Progress bar.** Thin gold line driven by `media_position` + `media_position_updated_at`.
- [ ] **#viz-2 — Ratings badges.** IMDb / RT / Audience badges on the info panel (`item.rating`, `item.audienceRating`).
- [ ] **#viz-3 — Cast strip.** First 3–5 cast photos from `/library/metadata/{id}?includePeople=1`.
- [ ] **#viz-4 — Genre chips.** Next to content rating in the info panel.
- [ ] **#viz-5 — Backdrop art.** When paused >10 s, fade to Plex `art` backdrop; optionally cycle `/library/metadata/{id}/arts`. Config flag `USE_BACKDROPS`.
- [ ] **#viz-6 — Ken Burns pan.** Slow scale + translate on the poster.
- [ ] **#viz-7 — Theme presets.** `classic-gold` (default), `art-deco-silver`, `neon-80s`, `minimalist-dark`. Swapped by a `<body data-theme="…">` attribute.
- [ ] **#viz-8 — Coming Up Next.** Next episode / next playlist item strip (ties into `coming-soon-card`).
- [ ] **#viz-9 — Music‑type UI.** Spinning vinyl visual when `contentType === 'music'`.
- [ ] **#viz-10 — Reel‑change transition.** White flash / slide between titles instead of cross‑fade.
- [ ] **#viz-11 — Film‑grain overlay.** 5% opacity noise texture.
- [ ] **#viz-12 — Burn‑in mitigation.** Nudge marquee text every 60 s; optional overnight dim.

### Milestone 4 — Functional depth (V2.3)

Goal: beyond one session, one server, one language.

- [ ] **#fn-1 — Multi‑session support.** Split‑screen or carousel when >1 session is active.
- [ ] **#fn-2 — Transcoding badge.** Show transcode status + reason.
- [ ] **#fn-3 — Local history.** `localStorage` log of recent titles at `#history`.
- [ ] **#fn-4 — HA webhook listener.** Optional push endpoint to zero out poll latency.
- [ ] **#fn-5 — Idle screensaver.** Rotating "coming soon" carousel (Radarr/Sonarr).
- [ ] **#fn-6 — Backend abstraction.** Single codebase driving Plex / Jellyfin / Emby / Kodi via `backend:` config. Retire the sibling repos after parity.
- [ ] **#fn-7 — i18n.** Dictionary for "NOW SHOWING", "Waiting for playback", "Paused", "Tap to dismiss". Start with en, ja.

### Repo hygiene (ongoing)

- [ ] **#repo-1 — LICENSE (MIT).**
- [ ] **#repo-2 — `CHANGELOG.md`, `CONTRIBUTING.md`, issue & PR templates.**
- [ ] **#repo-3 — GitHub Actions:** lint (HTML/CSS/JS), Playwright screenshot smoke test, release bundle.
- [ ] **#repo-4 — Discoverability:** topic tags, `info.md` for HACS, README badges for HACS / release / license.
- [ ] **#repo-5 — Self‑hosted fonts** so the display survives internet outages.

---

## Branching & workflow

- `main` — current V1, stable.
- `dev` — V2 integration branch. All feature branches PR into `dev`.
- `feature/<issue-slug>` — one branch per issue. Squash‑merge.
- `fix/<issue-slug>` — for bug fixes against V2.

PR checklist:

- [ ] References the tracking issue (`Closes #N`)
- [ ] Updates `CHANGELOG.md` under `## [Unreleased]`
- [ ] Updates this `DEV_README.md` checkbox
- [ ] No tokens, secrets, or personal URLs in the diff
- [ ] Screenshots (if visual) or recording (if interaction)

---

## Local dev

V2 build pipeline lands with **#pkg-1**. Until then, edit `www/now_showing.html` directly and test against your HA by opening `http://YOUR_HA_IP:8123/local/now_showing.html?token=...`.

---

## Current status

Milestone 1 is in flight. Security issues (`#security-1` … `#security-4`) are the first PRs against `dev`.
