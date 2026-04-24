# Home Assistant add-on image for Plex Now Showing.
#
# Uses HA's official Alpine base so we inherit their s6-overlay, bashio, and
# ffmpeg-free slim image. Node 20 is installed from Alpine's repository
# (nodejs-current would be newer; nodejs 20.x is LTS and matches the server's
# engines field).
#
# The build context is the REPO ROOT (not this directory) so we can COPY both
# ../../server and ../../www in. The GitHub Actions workflow in #addon-3
# invokes `docker build --file addons/plex-now-showing/Dockerfile .` from the
# repo root; local builds should do the same.

ARG BUILD_FROM=ghcr.io/hassio-addons/base:16.0.1
FROM ${BUILD_FROM}

ARG BUILD_ARCH
ARG BUILD_VERSION

ENV LANG=C.UTF-8 \
    NODE_ENV=production \
    PORT=8099 \
    STATIC_DIR=/app/www

# ---- Node 20 + tini (s6-overlay already runs PID 1, tini not needed) ----
RUN apk add --no-cache nodejs=~20 npm=~10

WORKDIR /app

# ---- Install runtime deps only ----
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force

# ---- App code ----
COPY server/src ./src
COPY www ./www

# ---- s6 service: run.sh is the long-running process ----
COPY addons/plex-now-showing/rootfs/etc/services.d/plex-now-showing/run /etc/services.d/plex-now-showing/run
COPY addons/plex-now-showing/rootfs/etc/services.d/plex-now-showing/finish /etc/services.d/plex-now-showing/finish
RUN chmod +x /etc/services.d/plex-now-showing/run \
             /etc/services.d/plex-now-showing/finish

# ---- Labels (add-on store + OCI) ----
LABEL \
  io.hass.name="Plex Now Showing" \
  io.hass.description="Cinema-style now-playing kiosk for Plex" \
  io.hass.arch="${BUILD_ARCH}" \
  io.hass.type="addon" \
  io.hass.version="${BUILD_VERSION}" \
  maintainer="rusty4444" \
  org.opencontainers.image.title="Plex Now Showing add-on" \
  org.opencontainers.image.description="HA add-on that serves the Plex Now Showing kiosk and proxies HA/Plex" \
  org.opencontainers.image.source="https://github.com/rusty4444/plex-now-showing" \
  org.opencontainers.image.licenses="MIT"

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8099/healthz >/dev/null || exit 1
