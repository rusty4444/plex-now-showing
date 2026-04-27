// GET /api/night-mode — reports whether the configured HA entity is "on".
//
// The frontend polls this at a low cadence (every 60 s by default) so the
// burn-in night-mode overlay flips when the user toggles their bedtime
// input_boolean in HA, without coupling to the playback state poll which
// runs every few seconds.
//
// Response shape (small + stable):
//   200 { configured: bool, on: bool }
//
// `configured: false` is returned when no entity is set; the frontend then
// falls back to `prefers-color-scheme: dark`.

import { Router } from 'express';

export function nightModeRoute({ haClient, config }) {
  const r = Router();

  r.get('/api/night-mode', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    const entity = config.visual?.nightModeEntity || '';
    if (!entity) {
      res.json({ configured: false, on: false });
      return;
    }
    try {
      const states = await haClient.getStates();
      const s = states.find((x) => x.entity_id === entity);
      // Treat any entity whose state is exactly "on" as active. Covers
      // input_boolean, switch, binary_sensor, light, etc. Anything else
      // (including "unknown" or "unavailable") is treated as off so a
      // misconfigured entity doesn't permanently dim the screen.
      const on = !!s && s.state === 'on';
      res.json({ configured: true, on });
    } catch (err) {
      // Graceful failure: if HA is briefly unreachable we report not-on
      // rather than 502, so the kiosk doesn't suddenly drop the dim
      // overlay just because of a 1 s blip.
      res.json({ configured: true, on: false, error: err.message || String(err) });
    }
  });

  return r;
}
