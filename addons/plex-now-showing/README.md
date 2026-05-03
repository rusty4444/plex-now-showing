# Now Showing - Home Assistant Add-on

Cinema-style now-playing and coming-soon kiosk for Home Assistant, installed
straight from the Home Assistant add-on store. One click, no long-lived access
token, no Docker command line.

## What's new in 2.1.0

- The add-on is now presented as **Now Showing**.
- Apple TV, generic streaming-device, and Kaleidescape backends join Plex,
  Jellyfin, Emby, and Kodi.
- `coming_soon` mode turns Radarr/Sonarr upcoming movies and episodes into a
  Fully Kiosk-friendly screensaver.
- The setup UI can load compatible players, configure Coming Soon sources, and
  preview display changes before saving.
- New visual controls include frame style, marquee font, theme preset, accent
  color, marquee background color, corner radius, progress bar, ratings,
  genre chips, info-panel mode, backdrops, burn-in nudge, and night dimming.
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
