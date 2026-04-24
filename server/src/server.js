// Express wire-up.
//
// Responsibilities:
//   - Serve the static HTML (so a single add-on delivers HTML + backend).
//   - Serve /api/state, /api/media-info/:ratingKey, /healthz.
//   - Optional hardening via PROXY_SECRET + ALLOWED_ORIGINS (closes old #4).
//   - Boot loudly: on config errors, log and exit non-zero so Supervisor
//     surfaces the problem.

import express from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { loadConfig } from './config.js';
import { createCache } from './cache.js';
import { createHaClient } from './ha.js';
import { createSwitcher, parseKiosks } from './switcher.js';
import { rootRoute } from './routes/root.js';
import { healthzRoute } from './routes/healthz.js';
import { stateRoute } from './routes/state.js';
import { configRoute } from './routes/config.js';
import { mediaInfoRoute } from './routes/mediaInfo.js';
import { artworkRoute } from './routes/artwork.js';
import { plexArtRoute } from './routes/plexArt.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

export function createApp({ config, haClient }) {
  const app = express();
  app.disable('x-powered-by');

  // Optional shared-secret header — only enforced if PROXY_SECRET is set.
  if (config.proxySecret) {
    app.use('/api', (req, res, next) => {
      if (req.get('x-proxy-secret') !== config.proxySecret) {
        return res.status(401).json({ error: 'missing_or_invalid_proxy_secret' });
      }
      next();
    });
  }

  // Optional Origin allowlist — only enforced if ALLOWED_ORIGINS is set.
  if (config.allowedOrigins.length > 0) {
    app.use('/api', (req, res, next) => {
      const origin = req.get('origin');
      // Same-origin requests omit Origin; allow them through.
      if (!origin) return next();
      if (config.allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        return next();
      }
      return res.status(403).json({ error: 'origin_not_allowed' });
    });
  }

  const stateCache = createCache(config.stateTtl);
  const mediaInfoCache = createCache(config.mediaInfoTtl);

  app.use(rootRoute({ config, version: pkg.version }));
  app.use(healthzRoute({ config, version: pkg.version }));
  app.use(configRoute({ config }));
  app.use(stateRoute({ haClient, cache: stateCache, config }));
  app.use(mediaInfoRoute({ cache: mediaInfoCache, config }));
  app.use(artworkRoute({ config }));
  app.use(plexArtRoute({ config }));

  // Static HTML last so /api/* wins on overlap.
  app.use(express.static(config.staticDir, {
    etag: true,
    maxAge: '5m',
    index: ['now_showing.html', 'index.html'],
  }));

  return app;
}

// Boot when run directly (node src/server.js), not when imported by tests.
const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  const { config, errors } = loadConfig(process.env);
  if (errors.length > 0) {
    for (const e of errors) console.error(`[config] ${e}`);
    process.exit(1);
  }
  const haClient = createHaClient({ haUrl: config.haUrl, haToken: config.haToken });
  const app = createApp({ config, haClient });

  // Optional Fully Kiosk auto-switcher (#48).
  if (config.switcherEnabled) {
    let kiosks = [];
    try {
      kiosks = parseKiosks(config.fullyKiosksRaw);
    } catch (err) {
      console.error(`[switcher] config error: ${err.message}`);
      process.exit(1);
    }
    const switcher = createSwitcher({
      haClient,
      config,
      kiosks,
      intervalMs: config.switcherIntervalMs,
    });
    switcher.start();
    // Clean shutdown so Supervisor's SIGTERM doesn't leave a dangling timer.
    for (const sig of ['SIGTERM', 'SIGINT']) {
      process.on(sig, () => { switcher.stop(); process.exit(0); });
    }
  }

  app.listen(config.port, () => {
    console.log(`plex-now-showing-server v${pkg.version} listening on :${config.port} (mode=${config.mode})`);
  });
}
