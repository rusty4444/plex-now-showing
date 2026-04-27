// GET /api/artwork?path=<HA-relative path>
//
// Pipes artwork (entity_picture, /api/media_player_proxy/...) from HA to the
// browser so the kiosk can render it same-origin without knowing the HA
// token. Only HA-relative paths are accepted.
//
// The frontend never calls this directly; state.js rewrites artwork URLs in
// the /api/state payload to hit here.

import { Router } from 'express';

export function artworkRoute({ config, fetchImpl = globalThis.fetch }) {
  const r = Router();

  r.get('/api/artwork', async (req, res) => {
    const path = String(req.query.path || '');
    if (!path.startsWith('/')) {
      return res.status(400).json({ error: 'path_must_be_ha_relative' });
    }

    try {
      const upstream = await fetchImpl(`${config.haUrl}${path}`, {
        headers: { Authorization: `Bearer ${config.haToken}` },
      });
      if (!upstream.ok) return res.status(upstream.status).end();

      const ct = upstream.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', ct);
      res.setHeader('Cache-Control', 'public, max-age=300');

      const buf = Buffer.from(await upstream.arrayBuffer());
      res.end(buf);
    } catch (err) {
      res.status(502).json({ error: 'artwork_unreachable', message: err.message });
    }
  });

  return r;
}
