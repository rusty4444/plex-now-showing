# Plex Now Showing — Home Assistant Add-on

Cinema-style now-playing kiosk for Plex, installed straight from the Home
Assistant add-on store. One click, no long-lived access token, no Docker
command line.

## What this is

This add-on wraps the unified Node 20 server (`../../server/`) and serves:

- `/now_showing.html` — the kiosk UI (opens via Ingress or on port `8099`)
- `/api/state` — normalised now-playing payload (no HA token in the browser)
- `/api/media-info/:ratingKey` — Plex metadata proxy
- `/api/artwork` — same-origin artwork proxy
- `/healthz` — liveness probe

Supervisor injects `SUPERVISOR_TOKEN`, so the add-on talks to Home Assistant
at `http://supervisor/core` with **no user-created HA token required**.

## Installation

Once this repository is published as a Home Assistant add-on repository
(tracked in #45), adding it is:

1. Settings → Add-ons → Add-on store → **⋮** → **Repositories**
2. Paste `https://github.com/rusty4444/plex-now-showing`
3. Install **Plex Now Showing**
4. Start it, then click **Open Web UI**

## Documentation

Full option reference lives in [`DOCS.md`](./DOCS.md). HA renders it on the
add-on's **Documentation** tab.
