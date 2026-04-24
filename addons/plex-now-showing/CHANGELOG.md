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
