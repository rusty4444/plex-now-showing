// End-to-end style: spin up the Express app with a stub HA client and hit
// the endpoints via an injected fetch. Keeps tests offline and fast.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createApp } from '../src/server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const haStates = JSON.parse(
  readFileSync(join(__dirname, '..', 'fixtures', 'ha_states.json'), 'utf8'),
);

function baseConfig(overrides = {}) {
  return {
    mode: 'addon',
    port: 0,
    haUrl: 'http://supervisor/core',
    haToken: 'tok',
    plexUrl: 'https://plex.example:32400',
    plexToken: 'ptok',
    plexUsername: 'rusty',
    plexPlayer: 'media_player.plex_plex_for_lg_tv',
    landscape: false,
    theme: 'classic-gold',
    poll: 5000,
    proxySecret: '',
    allowedOrigins: [],
    stateTtl: 3000,
    mediaInfoTtl: 600000,
    staticDir: join(__dirname, '..', 'fixtures'),
    ...overrides,
  };
}

function startApp(config, haClient) {
  return new Promise((resolve) => {
    const app = createApp({ config, haClient });
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

test('GET /api/state returns normalised payload', async () => {
  const haClient = { getStates: async () => haStates };
  const { server, url } = await startApp(baseConfig(), haClient);
  try {
    const resp = await fetch(`${url}/api/state`);
    assert.equal(resp.status, 200);
    const body = await resp.json();
    assert.equal(body.title, 'Pilot');
    assert.equal(body.seriesTitle, 'Severance');
    assert.equal(body.ratingKey, '12345');
  } finally { server.close(); }
});

test('GET /healthz is always 200', async () => {
  const haClient = { getStates: async () => { throw new Error('HA is down'); } };
  const { server, url } = await startApp(baseConfig(), haClient);
  try {
    const resp = await fetch(`${url}/healthz`);
    assert.equal(resp.status, 200);
    const body = await resp.json();
    assert.equal(body.ok, true);
    assert.equal(body.mode, 'addon');
  } finally { server.close(); }
});

test('GET /api/state returns 502 when HA is unreachable', async () => {
  const haClient = {
    getStates: async () => {
      const err = new Error('boom'); err.status = 500; throw err;
    },
  };
  const { server, url } = await startApp(baseConfig(), haClient);
  try {
    const resp = await fetch(`${url}/api/state`);
    assert.equal(resp.status, 502);
    const body = await resp.json();
    assert.equal(body.error, 'ha_unreachable');
  } finally { server.close(); }
});

test('PROXY_SECRET middleware blocks requests without the header', async () => {
  const haClient = { getStates: async () => haStates };
  const { server, url } = await startApp(baseConfig({ proxySecret: 'sekret' }), haClient);
  try {
    const blocked = await fetch(`${url}/api/state`);
    assert.equal(blocked.status, 401);
    const ok = await fetch(`${url}/api/state`, { headers: { 'x-proxy-secret': 'sekret' } });
    assert.equal(ok.status, 200);
  } finally { server.close(); }
});

test('ALLOWED_ORIGINS blocks requests from other origins', async () => {
  const haClient = { getStates: async () => haStates };
  const { server, url } = await startApp(
    baseConfig({ allowedOrigins: ['https://kiosk.example'] }),
    haClient,
  );
  try {
    const blocked = await fetch(`${url}/api/state`, { headers: { Origin: 'https://evil.example' } });
    assert.equal(blocked.status, 403);
    const ok = await fetch(`${url}/api/state`, { headers: { Origin: 'https://kiosk.example' } });
    assert.equal(ok.status, 200);
    // No Origin header (same-origin) must still work
    const same = await fetch(`${url}/api/state`);
    assert.equal(same.status, 200);
  } finally { server.close(); }
});
