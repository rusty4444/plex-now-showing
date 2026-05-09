# Now Showing - Home Assistant Add-on

Cinema-style now-playing and coming-soon kiosk for Home Assistant, installed
straight from the Home Assistant add-on store. One click, no long-lived access
token, no Docker command line.

## What's new in 2.1.3

- Optional TMDB enrichment for Coming Soon. Set `tmdb_api_key` (and
  optionally `tmdb_region`, default `AU`) to let the server fill in
  digital, physical, or theatrical release dates that Radarr's calendar
  is missing. Disabled by default — leave the key blank to keep Coming
  Soon fully Radarr-driven. Both v3 keys and v4 read-tokens work.
- Radarr stays the primary source. TMDB is only consulted when Radarr
  has no usable home-release date inside the look-ahead window. A TMDB
  digital or physical date upgrades the entry to a `home` release; a
  theatrical-only TMDB date is used as a labelled cinema fallback.
- Lookups are cached for `tmdb_ttl_ms` (default 6 h) and TMDB failures
  (auth, rate limit, network, no match) are logged and silently
  swallowed, so Coming Soon never breaks because TMDB is unreachable.
- The Coming Soon footer now prefers the earliest qualifying
  home-release date for Radarr movies and only falls back to
  `inCinemas` when no home date qualifies. Cinema-only items are
  prefixed with `In cinemas: <date>` so the footer is not mistaken for
  home availability.
- `hasFile === false`, monitored filtering, and the configurable
  `coming_soon_lookahead_days` window are still respected.

## What's new in 2.1.2

- Radarr Coming Soon eligibility now also accepts `inCinemas` as a release-date
  fallback alongside `digitalRelease` and `physicalRelease`. When more than one
  date is populated, the earliest qualifying date inside the configured
  look-ahead window wins.
- Already-downloaded movies still drop out (`hasFile === false` and monitored
  filtering are unchanged), and the configurable
  `coming_soon_lookahead_days` window is still respected.

## What's new in 2.1.1

- Configurable Coming Soon look-ahead via `coming_soon_lookahead_days`
  (1–365 days, default **90**), so Coming Soon can reach further out without
  changing existing installs.
- Radarr eligibility began including `physicalRelease` alongside
  `digitalRelease`, with the earliest qualifying date inside the window
  selected.

## What's new in 2.1.0

- The add-on is now presented as **Now Showing**.
- Apple TV, generic streaming-device, and Kaleidescape backends join Plex,
  Jellyfin, Emby, and Kodi.
- `coming_soon` mode turns Radarr/Sonarr upcoming movies and episodes into a
  Fully Kiosk-friendly screensaver.
- The setup UI can load compatible players, configure Coming Soon sources, and
  preview display changes before saving, with a corrected bulb-frame preview.
- Setup now opens at the top and scrolls correctly inside Home Assistant
  Ingress, so tall setup tabs no longer require browser zoom.
- New visual controls include frame style, bulb size, marquee font, theme
  preset, accent color, marquee background color, corner radius, progress bar,
  ratings, genre chips, info-panel mode, backdrops, burn-in nudge, and night
  dimming.
- The docs cover using Now Showing and Coming Soon at the same time with two
  display URLs or instances.

## What this is

This add-on wraps the unified Node 20 server (`../../server/`) and serves:

- `/now_showing.html` - the kiosk UI (opens via Ingress or on port `8099`)
- `/api/state` - normalised now-playing payload (no HA token in the browser)
- `/api/media-info/:ratingKey` - Plex metadata proxy when `backend: plex`
- `/api/artwork` - same-origin artwork proxy
- `/api/coming-soon` - Radarr/Sonarr upcoming-release payload
- `/healthz` - liveness probe

Supervisor injects `SUPERVISOR_TOKEN`, so the add-on talks to Home Assistant
at `http://supervisor/core` with **no user-created HA token required**.

## Installation

Once this repository is published as a Home Assistant add-on repository, adding
it is:

1. Settings -> Add-ons -> Add-on store -> ... -> Repositories
2. Paste `https://github.com/rusty4444/now-showing-ha`
3. Install **Now Showing**
4. Start it, then click **Open Web UI**

## Documentation

Full option reference lives in [`DOCS.md`](./DOCS.md). HA renders it on the
add-on's **Documentation** tab.
