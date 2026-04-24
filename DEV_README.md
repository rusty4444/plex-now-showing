# Plex Now Showing — V2 Development

This document tracks the V2 roadmap for `plex-now-showing`. V1 is the single‑file `www/now_showing.html` distribution. V2 is a packaged, secure, extensible release with a proper build pipeline, HACS distribution, and a richer feature set.

All V2 work happens on the `dev` branch. Each roadmap item is tracked by a GitHub issue and lands via a feature branch → PR → squash‑merge into `dev`. When `dev` stabilises it is merged into `main` and tagged as `v2.0.0`.

---

## Guiding principles

- **Two install paths, one codebase.** Most HA users are on HA OS / Supervised and don't think in Docker. They get a one-click Add-on. HA Container users (like the maintainer) get the same image via `docker compose`. A "just the HTML" path stays supported for HACS users who don't want any server-side piece.
- **No tokens in the browser when it matters.** With the Add-on, tokens live server-side (the add-on uses the Supervisor token — no user-created HA token required). For the HTML-only path, tokens live in `localStorage` via a first-run setup page, never hard-coded.
- **Auto-switching is optional and user-choice.** Two ways to switch a Fully Kiosk tablet between marquee and dashboard: an HA Blueprint (HA-native, compose your own rules) or the Add-on's built-in Fully Kiosk auto-switcher (zero HA automation). Users pick one.
- **Unify the family.** `plex-`, `jellyfin-`, `emby-` and `kodi-now-showing` converge behind a `backend:` switch so fixes ship once.
- **Cinema feel first.** Every visual change must still look like a real marquee on a wall-mounted tablet. No dashboards, no chrome.

---

## Install paths (shipped side-by-side)

| Path | Who it's for | What they install |
|------|--------------|-------------------|
| **A. Home Assistant Add-on** (recommended) | HA OS / Supervised users — the majority | One click in the HA Add-on Store. Config via a form. Tokens live server-side. |
| **B. Docker Compose** (same image) | HA Container users | One `docker compose up -d` with `.env` file. Same image as the add-on. |
| **C. HACS frontend only** | Users who don't want any server-side piece | Drop `now_showing.html` in `/config/www`. Tokens handled by first-run setup page in `localStorage`. |

A, B and C share the same `now_showing.html` code. The add-on / compose just adds a thin server that proxies HA+Plex and serves the HTML on a dedicated port.

---

## Roadmap

The roadmap is grouped into four milestones. Each item maps to a GitHub issue — see the Issues tab for status, owners and linked PRs.

### Milestone 1 — Packaging & security (V2.0)

Goal: make V2 installable from the HA Add-on Store, from HACS, or via Docker Compose — with tokens handled safely in each case.

**Add-on (path A & B)**
- [ ] **#addon-1 — Unified server: serve HTML + proxy HA/Plex.** One lightweight Node (or Go) service. Uses `$SUPERVISOR_TOKEN` when running as an add-on (no user-created HA token needed); falls back to `HA_URL` + `HA_TOKEN` env vars for plain Docker.
- [ ] **#addon-2 — HA Add-on wrapper.** `addon/config.yaml` + `Dockerfile` + `build.yaml` + `rootfs/` + icon/logo, multi-arch (amd64 / aarch64 / armv7), schema-backed options form.
- [ ] **#addon-3 — Publish to GHCR + HA Add-on custom repository.** `.github/workflows/addon-build.yml` on tag push, `repository.yaml`, one-click "Add to my Home Assistant" badge.
- [ ] **#addon-4 — Docker Compose example.** `docker-compose.example.yml` using the same GHCR image, `.env` pattern. For HA Container users.

**Auto-switching (pick one)**
- [ ] **#addon-5 — Blueprint + one-click import.** HA-native option. Convert the existing automation to a Blueprint with selectors for sensor / device / dashboard URL. `my.home-assistant.io` import badge.
- [ ] **#addon-6 — Built-in Fully Kiosk auto-switcher (opt-in).** Zero-HA-automation option. Add-on watches Plex state and calls Fully Kiosk's REST API directly. Toggled from the add-on config form.

**Multi-tablet**
- [ ] **#addon-7 — Multi-tablet provisioning helper.** Script + docs for pushing the startup URL to N tablets via Fully Kiosk Remote Admin.

**Frontend (path C)**
- [x] **#1 — Move tokens out of the HTML source.** Hard-coded `HA_TOKEN` / `PLEX_TOKEN` constants removed. Tokens are read in priority order: URL hash fragment → `localStorage` → `window.NOW_SHOWING_CONFIG` → URL query (with warning). Shipped in PR #41.
- [x] **#2 — First-run setup page.** `#setup` renders a form that collects HA URL / HA token / Plex info, stores them in `localStorage`, strips the hash, and launches the display. Gear icon on the live display reopens setup. Shipped in PR #42.
- [ ] **#pkg-1 — Split the monolith.** `src/index.html` + `src/styles.css` + `src/app.js` + `src/plex.js` + `src/ha.js` + `src/bulbs.js`, bundled with Vite to a single `dist/now_showing.html` (inlined CSS+JS) for easy drop-in, plus an un-inlined `dist/` for HACS.
- [ ] **#pkg-2 — HACS distribution.** Add `hacs.json`, `info.md`, LICENSE (MIT), GitHub Release workflow that attaches `now_showing.html` and a zipped `dist/` to each tag.
- [ ] **#pkg-4 — Runtime config file.** Optional `www/now_showing.config.js` with non-sensitive defaults. Tokens deliberately not supported here — they go via setup page.
- [ ] **#pkg-5 — URL-param driven multi-tablet.** Every non-sensitive config key can be overridden by a URL param.

> **~~#security-3 / #security-4~~** (standalone proxy + CSRF hardening) — **closed.** Superseded by the unified add-on (#addon-1 ... #addon-4), which solves the same problem with a single install. Shared-secret + origin allow-list are rolled into #addon-1.
>
> **~~#pkg-3~~** (standalone Blueprint) — **superseded** by #addon-5, which ships the Blueprint alongside the add-on plus a one-click import button.

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

Milestone 1 is in flight.

- Shipped: `#1` (token resolver) and `#2` (setup page) — PRs #41 and #42 on `dev`.
- Next: `#addon-1` (unified server) + `#addon-2` (add-on wrapper). These land together on a new `feature/addon-*` branch.
- After that: `#addon-5` (Blueprint) and `#addon-6` (built-in auto-switcher) ship in parallel so users have both options when V2.0 tags.
