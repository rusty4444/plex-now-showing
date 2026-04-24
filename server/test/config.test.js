import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

test('addon mode is chosen when SUPERVISOR_TOKEN is present', () => {
  const { config, errors } = loadConfig({ SUPERVISOR_TOKEN: 'abc' });
  assert.equal(config.mode, 'addon');
  assert.equal(config.haUrl, 'http://supervisor/core');
  assert.equal(config.haToken, 'abc');
  assert.deepEqual(errors, []);
});

test('standalone mode requires HA_URL and HA_TOKEN', () => {
  const { errors } = loadConfig({});
  assert.ok(errors.some(e => e.includes('haUrl')));
  assert.ok(errors.some(e => e.includes('haToken')));
});

test('standalone mode strips trailing slash on HA_URL', () => {
  const { config } = loadConfig({
    HA_URL: 'https://ha.example.com:8123/',
    HA_TOKEN: 'tok',
  });
  assert.equal(config.mode, 'standalone');
  assert.equal(config.haUrl, 'https://ha.example.com:8123');
});

test('plexUrl without plexToken is an error', () => {
  const { errors } = loadConfig({
    SUPERVISOR_TOKEN: 'x',
    PLEX_URL: 'https://plex.example.com:32400',
  });
  assert.ok(errors.some(e => e.includes('plexToken')));
});

test('ALLOWED_ORIGINS is parsed as a list', () => {
  const { config } = loadConfig({
    SUPERVISOR_TOKEN: 'x',
    ALLOWED_ORIGINS: 'https://a.example, https://b.example',
  });
  assert.deepEqual(config.allowedOrigins, ['https://a.example', 'https://b.example']);
});

test('TTL defaults match spec (3 s state, 10 min media-info)', () => {
  const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x' });
  assert.equal(config.stateTtl, 3000);
  assert.equal(config.mediaInfoTtl, 600000);
});

test('visual toggles all default to false', () => {
  const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x' });
  assert.equal(config.visual.progressBar, false);
});

test('VISUAL_PROGRESS_BAR=true flips the progress-bar toggle on', () => {
  const { config } = loadConfig({ SUPERVISOR_TOKEN: 'x', VISUAL_PROGRESS_BAR: 'true' });
  assert.equal(config.visual.progressBar, true);
});

test('switcher is off by default, on requires FULLY_KIOSKS', () => {
  const off = loadConfig({ SUPERVISOR_TOKEN: 'x' });
  assert.equal(off.config.switcherEnabled, false);
  assert.equal(off.errors.filter(e => e.includes('FULLY_KIOSKS')).length, 0);

  const enabledNoKiosks = loadConfig({ SUPERVISOR_TOKEN: 'x', SWITCHER_ENABLED: 'true' });
  assert.equal(enabledNoKiosks.config.switcherEnabled, true);
  assert.ok(enabledNoKiosks.errors.some(e => e.includes('FULLY_KIOSKS')));

  const enabled = loadConfig({
    SUPERVISOR_TOKEN: 'x',
    SWITCHER_ENABLED: 'true',
    FULLY_KIOSKS: 'http://t:2323|pw|http://srv/a',
  });
  assert.deepEqual(enabled.errors, []);
});
