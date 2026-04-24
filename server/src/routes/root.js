// GET / — small JSON landing page so a quick curl tells the user "yes, this
// is plex-now-showing, here are the endpoints, here's the mode". The HTML
// itself is served from a static middleware in server.js.

import { Router } from 'express';

export function rootRoute({ config, version }) {
  const r = Router();
  r.get('/api', (_req, res) => {
    res.json({
      name: 'plex-now-showing-server',
      version,
      mode: config.mode,
      endpoints: {
        state: '/api/state',
        config: '/api/config',
        mediaInfo: '/api/media-info/:ratingKey',
        healthz: '/healthz',
        html: '/now_showing.html',
      },
    });
  });
  return r;
}
