# Plex Now Showing — Docker Compose install

For **HA Container** users (or anyone on plain Docker). Same image as the HA
add-on, just self-hosted. If you're on HA OS or Supervised, use the add-on
instead — it's one click and doesn't need an HA token.

## Quick start

```bash
cd docker
cp .env.example .env
$EDITOR .env                             # fill HA_URL / HA_TOKEN
docker compose -f docker-compose.example.yml up -d
```

Open <http://HOST:8099/now_showing.html>.

## Checking health

```bash
curl http://localhost:8099/healthz        # liveness
curl http://localhost:8099/api            # mode + version + endpoints
curl http://localhost:8099/api/state      # current payload
```

## Updating

```bash
docker compose -f docker-compose.example.yml pull
docker compose -f docker-compose.example.yml up -d
```

Pin `TAG=2.1.0` in `.env` to stay on this release instead of `latest`.

Display settings are configured in `.env` with the `VISUAL_*` variables, for
example `VISUAL_THEME`, `VISUAL_FRAME_STYLE`, `VISUAL_MARQUEE_FONT`,
`VISUAL_MARQUEE_BG_COLOR`, `VISUAL_PROGRESS_BAR`, and the backdrop /
burn-in toggles.

## Colocating with Home Assistant Container

If your HA Container runs on the same Docker host, join its network so the
server can reach HA as `http://homeassistant:8123`:

1. In `docker-compose.example.yml`, uncomment both the service-level
   `networks:` and the top-level `networks:` block.
2. Confirm your HA network is called `homeassistant` (or edit accordingly):
   ```bash
   docker network ls | grep home
   ```
3. In `.env`, set `HA_URL=http://homeassistant:8123`.

## Exposing to the LAN

The defaults bind `HOST_PORT=8099` on all interfaces. If you publish beyond
your LAN, set **both**:

- `PROXY_SECRET` → every `/api/*` request must carry `X-Proxy-Secret: <value>`.
  The kiosk HTML injects it when running against the server.
- `ALLOWED_ORIGINS` → comma-separated list of tablet origins, e.g.
  `http://kiosk1.lan:8099,http://kiosk2.lan:8099`.

## Why not run a separate reverse proxy?

You can — any nginx/Caddy/Traefik in front of `8099` works. The server's
built-in hardening (shared secret + origin allowlist) is there so the simple
case stays simple; the reverse-proxy case still works the same way.

## Where's the image published?

`ghcr.io/rusty4444/plex-now-showing-{arch}` — same registry the HA add-on
uses. See the [CI workflow](../.github/workflows/build-addon.yml) for the
full tag matrix.
