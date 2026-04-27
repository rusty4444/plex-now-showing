// GET /api/media-info/:ratingKey — Plex metadata proxy with a 10-min TTL.
//
// Keeps the Plex token server-side and handles the three ratingKey shapes
// HA can emit (#arch-4). Returns 404 when the id can't be resolved to a
// numeric ratingKey (e.g. plex://... GUIDs) so the browser can fall back to
// whatever it already has.

import { Router } from 'express';
import { parseRatingKey, fetchMediaInfo } from '../plex.js';

export function mediaInfoRoute({ cache, config }) {
  const r = Router();

  r.get('/api/media-info/:ratingKey', async (req, res) => {
    if (!config.plexUrl || !config.plexToken) {
      return res.status(503).json({ error: 'plex_not_configured' });
    }
    const id = parseRatingKey(req.params.ratingKey);
    if (!id) {
      return res.status(404).json({ error: 'unparseable_rating_key' });
    }

    try {
      let info = cache.get(id);
      if (info === undefined) {
        info = await fetchMediaInfo({
          plexUrl: config.plexUrl,
          plexToken: config.plexToken,
          ratingKey: id,
        });
        if (info) cache.set(id, info);
      }
      if (!info) return res.status(404).json({ error: 'not_found' });
      res.json(info);
    } catch (err) {
      res.status(502).json({ error: 'plex_unreachable', message: err.message });
    }
  });

  return r;
}
