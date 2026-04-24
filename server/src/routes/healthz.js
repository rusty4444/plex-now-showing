// Simple liveness probe. Doesn't touch HA/Plex so it stays green even if
// upstream is briefly down — that's what /api/state's cache status is for.

import { Router } from 'express';

export function healthzRoute({ config, version }) {
  const r = Router();
  r.get('/healthz', (_req, res) => {
    res.json({
      ok: true,
      mode: config.mode,
      version,
      uptime: process.uptime(),
    });
  });
  return r;
}
