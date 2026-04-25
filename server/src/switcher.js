// Fully Kiosk auto-switcher — the in-server alternative to the HA Blueprint
// (PR #51). Watches HA state for playing/stopped transitions on the
// configured media player(s) and tells Fully Kiosk Browser tablets to load the
// Now Showing URL (or go back) via its REST API:
//
//   GET http://<tablet>:2323/?cmd=loadURL&url=<...>&password=<fully-password>
//   GET http://<tablet>:2323/?cmd=loadStartURL&password=<fully-password>
//
// Docs: https://www.fully-kiosk.com/en/#rest
//
// The switcher is opt-in (SWITCHER_ENABLED=true). Users who prefer the
// Blueprint can leave it off; users who don't want to touch automations
// enable it and configure kiosks in the add-on options.

import { normalise } from './state.js';

const PLAYING = new Set(['playing', 'paused']);

/**
 * Parse the FULLY_KIOSKS env string.
 *
 * Format (one kiosk per line OR semicolon-separated):
 *   http://tablet.lan:2323 | <fully-password> | <url-when-playing> | <url-when-stopped>
 *
 * The stopped URL is optional; if omitted, we send `loadStartURL` which
 * returns the tablet to whatever the user configured as its start URL.
 */
export function parseKiosks(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[\n;]+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length < 3) {
        throw new Error(`FULLY_KIOSKS entry ${i + 1} is malformed: need "host|password|playingUrl[|stoppedUrl]"`);
      }
      const [host, password, playingUrl, stoppedUrl] = parts;
      // Basic URL validation — if it throws, the config is wrong and we want
      // the add-on to refuse to start rather than fail silently later.
      new URL(host);
      new URL(playingUrl);
      if (stoppedUrl) new URL(stoppedUrl);
      return { host: host.replace(/\/+$/, ''), password, playingUrl, stoppedUrl: stoppedUrl || null };
    });
}

/**
 * Build the REST URL for a Fully Kiosk command. Kept separate so tests can
 * assert the exact URL without mocking fetch.
 */
export function buildFullyUrl(kiosk, action) {
  const base = new URL(kiosk.host);
  const params = new URLSearchParams();
  params.set('password', kiosk.password);

  if (action === 'play') {
    params.set('cmd', 'loadURL');
    params.set('url', kiosk.playingUrl);
  } else if (action === 'stop') {
    if (kiosk.stoppedUrl) {
      params.set('cmd', 'loadURL');
      params.set('url', kiosk.stoppedUrl);
    } else {
      params.set('cmd', 'loadStartURL');
    }
  } else {
    throw new Error(`Unknown action: ${action}`);
  }

  base.search = params.toString();
  return base.toString();
}

/**
 * Core edge detector. Given previous + current player state, return
 * 'play' | 'stop' | null for what should be sent to kiosks.
 *
 * Rules:
 *   - was not-playing, now playing/paused          → 'play'
 *   - was playing/paused, now null/stopped         → 'stop'
 *   - was playing, now different title (stream end + immediate new one)
 *                                                  → 'play' (re-trigger)
 *   - otherwise                                    → null
 */
export function detectTransition(prev, curr) {
  const wasPlaying = prev && PLAYING.has(prev.state);
  const isPlaying  = curr && PLAYING.has(curr.state);

  if (!wasPlaying && isPlaying) return 'play';
  if (wasPlaying && !isPlaying) return 'stop';
  if (wasPlaying && isPlaying && prev.title !== curr.title) return 'play';
  return null;
}

/**
 * Long-lived switcher. Call start() once from server.js; stop() cleans up.
 * Designed so tests can drive it manually via tick() without real timers.
 */
export function createSwitcher({
  haClient,
  config,
  kiosks,
  fetchImpl = globalThis.fetch,
  logger = console,
  intervalMs,
}) {
  if (!kiosks || kiosks.length === 0) {
    return { start() {}, stop() {}, tick: async () => null };
  }

  let prev = null;
  let timer = null;
  // Default cadence: the media-player idle-timeout budget. 5s is tight enough that
  // the tablet feels responsive and loose enough to not hammer HA.
  const every = intervalMs ?? 5000;

  async function sendToKiosks(action) {
    await Promise.all(kiosks.map(async (k) => {
      const url = buildFullyUrl(k, action);
      try {
        const resp = await fetchImpl(url, { method: 'GET' });
        if (!resp.ok) {
          logger.warn(`[switcher] ${k.host} ${action}: HTTP ${resp.status}`);
        } else {
          logger.info(`[switcher] ${k.host} ${action}: OK`);
        }
      } catch (err) {
        logger.warn(`[switcher] ${k.host} ${action}: ${err.message}`);
      }
    }));
  }

  async function tick() {
    let curr = null;
    try {
      const states = await haClient.getStates();
      curr = normalise(states, {
        backend: config.backend,
        player: config.player,
        plexPlayer: config.plexPlayer,
        plexUsername: config.plexUsername,
      });
    } catch (err) {
      logger.warn(`[switcher] HA fetch failed: ${err.message}`);
      return null;
    }

    const action = detectTransition(prev, curr);
    prev = curr;
    if (action) {
      await sendToKiosks(action);
    }
    return action;
  }

  return {
    start() {
      if (timer) return;
      // Fire once immediately so the first tick establishes `prev` without
      // waiting a full interval.
      tick().catch(err => logger.warn(`[switcher] initial tick failed: ${err.message}`));
      timer = setInterval(() => {
        tick().catch(err => logger.warn(`[switcher] tick failed: ${err.message}`));
      }, every);
      // Don't keep the event loop alive just for the switcher — if the rest
      // of the server has exited, the process should too.
      if (timer.unref) timer.unref();
      logger.info(`[switcher] started, watching ${kiosks.length} kiosk(s), interval=${every}ms`);
    },
    stop() {
      if (timer) { clearInterval(timer); timer = null; }
    },
    tick,  // exposed for tests
  };
}
