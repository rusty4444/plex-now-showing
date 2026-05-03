// GET /api/coming-soon - upcoming Radarr/Sonarr titles for the kiosk
// screensaver mode. API keys stay server-side in add-on / Docker installs.

import { Router } from 'express';
import { fetchComingSoonItems, hasComingSoonSource } from '../comingSoon.js';

export function comingSoonRoute({ cache, config, fetchImpl = globalThis.fetch }) {
  const r = Router();

  r.get('/api/coming-soon', async (_req, res) => {
    if (!hasComingSoonSource(config)) {
      return res.status(503).json({ error: 'coming_soon_not_configured' });
    }

    try {
      let payload = cache.get('coming-soon');
      if (payload === undefined) {
        const items = await fetchComingSoonItems({ config, fetchImpl });
        payload = {
          title: config.comingSoon?.title || 'Coming Soon',
          imageType: config.comingSoon?.imageType || 'poster',
          cycleInterval: config.comingSoon?.cycleInterval || 8,
          items,
          generatedAt: new Date().toISOString(),
        };
        cache.set('coming-soon', payload);
      }
      res.set('Cache-Control', 'no-store');
      res.json(payload);
    } catch (err) {
      res.status(502).json({
        error: 'coming_soon_unreachable',
        status: err.status || 0,
        message: err.message || String(err),
      });
    }
  });

  return r;
}
