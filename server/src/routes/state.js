// GET /api/state — returns the normalised "now showing" payload (same shape
// the HTML already consumes), cached with a short TTL so multiple kiosks on
// the same server don't each beat up HA.

import { Router } from 'express';
import { normalise } from '../state.js';

export function stateRoute({ haClient, cache, config }) {
  const r = Router();

  r.get('/api/state', async (_req, res) => {
    try {
      let payload = cache.get('state');
      if (payload === undefined) {
        const states = await haClient.getStates();
        payload = normalise(states, {
          plexPlayer: config.plexPlayer,
          plexUsername: config.plexUsername,
        });
        cache.set('state', payload);
      }
      // Normalise(...) returns null when nothing is playing. Express's default
      // JSON serialiser handles null fine — clients already expect null.
      res.json(payload);
    } catch (err) {
      res.status(502).json({
        error: 'ha_unreachable',
        status: err.status || 0,
        message: err.message || String(err),
      });
    }
  });

  return r;
}
