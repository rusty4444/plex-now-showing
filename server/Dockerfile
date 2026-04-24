# Multi-stage build: trims dev deps out of the final image so the add-on layer
# stays small (~35 MB incl. node:20-alpine base).

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

FROM node:20-alpine AS runtime
WORKDIR /app

# Dumb-init keeps Ctrl-C / Supervisor's SIGTERM clean.
RUN apk add --no-cache dumb-init \
    && addgroup -S app && adduser -S app -G app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
# The add-on wrapper (#addon-2) mounts the www/ directory at /app/www; for the
# Docker Compose path we bake it in so the image is self-contained.
COPY ../www ./www

ENV NODE_ENV=production \
    PORT=8099 \
    STATIC_DIR=/app/www

USER app
EXPOSE 8099

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8099/healthz >/dev/null || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/server.js"]
