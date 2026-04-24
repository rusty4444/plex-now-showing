// GET /api/config — exposes browser-safe runtime flags.
//
// Only ships non-sensitive values. Tokens and internal settings (TTLs, cache,
// kiosk URLs) are deliberately excluded. Visual toggles let the frontend
// conditionally render new v2 UI without a rebuild.

import { Router } from 'express';

export function configRoute({ config }) {
  const r = Router();

  r.get('/api/config', (_req, res) => {
    // No-cache: flipping a toggle in the add-on UI restarts the server, but
    // browsers on the wall might live for days. Let them re-read on reload.
    res.set('Cache-Control', 'no-store');
    res.json({
      visual: {
        progressBar: !!config.visual?.progressBar,
      },
    });
  });

  return r;
}
