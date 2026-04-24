import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseKiosks,
  buildFullyUrl,
  detectTransition,
  createSwitcher,
} from '../src/switcher.js';

// ===== parseKiosks =====

test('parseKiosks: single kiosk with stoppedUrl', () => {
  const ks = parseKiosks(
    'http://tablet.lan:2323 | hunter2 | http://srv/now_showing.html | http://srv/home',
  );
  assert.equal(ks.length, 1);
  assert.equal(ks[0].host, 'http://tablet.lan:2323');
  assert.equal(ks[0].password, 'hunter2');
  assert.equal(ks[0].playingUrl, 'http://srv/now_showing.html');
  assert.equal(ks[0].stoppedUrl, 'http://srv/home');
});

test('parseKiosks: stoppedUrl is optional', () => {
  const ks = parseKiosks('http://tablet.lan:2323|pw|http://srv/a');
  assert.equal(ks[0].stoppedUrl, null);
});

test('parseKiosks: multiple lines, newline- and semicolon-separated', () => {
  const raw = [
    'http://t1:2323 | pw1 | http://srv/a',
    'http://t2:2323 | pw2 | http://srv/b | http://srv/home',
  ].join('\n');
  const ks = parseKiosks(raw);
  assert.equal(ks.length, 2);
  assert.equal(ks[0].host, 'http://t1:2323');
  assert.equal(ks[1].stoppedUrl, 'http://srv/home');

  const ks2 = parseKiosks('http://t1:2323|pw1|http://srv/a; http://t2:2323|pw2|http://srv/b');
  assert.equal(ks2.length, 2);
});

test('parseKiosks: empty input → empty list', () => {
  assert.deepEqual(parseKiosks(''), []);
  assert.deepEqual(parseKiosks(null), []);
});

test('parseKiosks: malformed entry throws', () => {
  assert.throws(() => parseKiosks('just-one-field'));
  assert.throws(() => parseKiosks('not-a-url|pw|http://srv/a'));
});

// ===== buildFullyUrl =====

test('buildFullyUrl: play action sends loadURL with target + password', () => {
  const k = { host: 'http://tablet:2323', password: 'p!w', playingUrl: 'http://srv/now', stoppedUrl: null };
  const u = new URL(buildFullyUrl(k, 'play'));
  assert.equal(u.origin, 'http://tablet:2323');
  assert.equal(u.searchParams.get('cmd'), 'loadURL');
  assert.equal(u.searchParams.get('url'), 'http://srv/now');
  assert.equal(u.searchParams.get('password'), 'p!w');
});

test('buildFullyUrl: stop action with stoppedUrl → loadURL', () => {
  const k = { host: 'http://tablet:2323', password: 'pw', playingUrl: 'http://srv/p', stoppedUrl: 'http://srv/home' };
  const u = new URL(buildFullyUrl(k, 'stop'));
  assert.equal(u.searchParams.get('cmd'), 'loadURL');
  assert.equal(u.searchParams.get('url'), 'http://srv/home');
});

test('buildFullyUrl: stop action without stoppedUrl → loadStartURL (no url param)', () => {
  const k = { host: 'http://tablet:2323', password: 'pw', playingUrl: 'http://srv/p', stoppedUrl: null };
  const u = new URL(buildFullyUrl(k, 'stop'));
  assert.equal(u.searchParams.get('cmd'), 'loadStartURL');
  assert.equal(u.searchParams.get('url'), null);
});

test('buildFullyUrl: unknown action throws', () => {
  const k = { host: 'http://t:2323', password: 'p', playingUrl: 'http://a', stoppedUrl: null };
  assert.throws(() => buildFullyUrl(k, 'wiggle'));
});

// ===== detectTransition =====

test('detectTransition: idle → playing → play', () => {
  assert.equal(detectTransition(null, { state: 'playing', title: 'x' }), 'play');
});

test('detectTransition: playing → idle → stop', () => {
  assert.equal(detectTransition({ state: 'playing', title: 'x' }, null), 'stop');
  assert.equal(detectTransition({ state: 'playing', title: 'x' }, { state: 'idle', title: 'x' }), 'stop');
});

test('detectTransition: playing → paused → null (still playing-ish)', () => {
  assert.equal(detectTransition({ state: 'playing', title: 'x' }, { state: 'paused', title: 'x' }), null);
});

test('detectTransition: title change mid-play → re-fire play', () => {
  assert.equal(
    detectTransition({ state: 'playing', title: 'A' }, { state: 'playing', title: 'B' }),
    'play',
  );
});

test('detectTransition: still idle → null', () => {
  assert.equal(detectTransition(null, null), null);
});

// ===== createSwitcher end-to-end (tick-driven, no timers) =====

test('createSwitcher: empty kiosk list is a no-op', async () => {
  const sw = createSwitcher({ haClient: null, config: {}, kiosks: [] });
  assert.equal(await sw.tick(), null);
});

test('createSwitcher: play edge fires loadURL on each configured kiosk', async () => {
  // Two kiosks, both should be called.
  const kiosks = [
    { host: 'http://t1:2323', password: 'p1', playingUrl: 'http://srv/a', stoppedUrl: null },
    { host: 'http://t2:2323', password: 'p2', playingUrl: 'http://srv/b', stoppedUrl: null },
  ];
  const fetched = [];
  const fetchImpl = async (url) => { fetched.push(url); return { ok: true }; };

  // HA returns "nothing playing" first, then "playing" on second tick.
  let call = 0;
  const haClient = {
    getStates: async () => {
      call++;
      if (call === 1) return []; // idle
      return [{
        entity_id: 'media_player.plex_plex_for_lg_tv',
        state: 'playing',
        attributes: { friendly_name: 'LG', media_title: 'Movie', entity_picture: 'https://cdn/x.jpg' },
      }];
    },
  };

  const sw = createSwitcher({
    haClient,
    config: { plexPlayer: 'media_player.plex_plex_for_lg_tv' },
    kiosks,
    fetchImpl,
    logger: { info() {}, warn() {} },
  });

  assert.equal(await sw.tick(), null);   // idle, no fire
  assert.equal(await sw.tick(), 'play');  // edge
  assert.equal(fetched.length, 2);
  assert.ok(fetched[0].includes('cmd=loadURL'));
  assert.ok(fetched[0].includes(encodeURIComponent('http://srv/a')));
  assert.ok(fetched[1].includes(encodeURIComponent('http://srv/b')));
});

test('createSwitcher: stop edge fires loadStartURL when no stoppedUrl configured', async () => {
  const kiosks = [
    { host: 'http://t1:2323', password: 'p', playingUrl: 'http://srv/a', stoppedUrl: null },
  ];
  const fetched = [];
  const fetchImpl = async (url) => { fetched.push(url); return { ok: true }; };

  let call = 0;
  const haClient = {
    getStates: async () => {
      call++;
      if (call === 1) return [{
        entity_id: 'media_player.plex_plex_for_lg_tv',
        state: 'playing',
        attributes: { friendly_name: 'LG', media_title: 'Movie' },
      }];
      return [];  // stopped
    },
  };

  const sw = createSwitcher({
    haClient,
    config: { plexPlayer: 'media_player.plex_plex_for_lg_tv' },
    kiosks,
    fetchImpl,
    logger: { info() {}, warn() {} },
  });

  assert.equal(await sw.tick(), 'play');  // establish prev=playing (fires a play)
  assert.equal(await sw.tick(), 'stop');
  assert.equal(fetched.length, 2);
  assert.ok(fetched[0].includes('cmd=loadURL'),      'first call is loadURL');
  assert.ok(fetched[1].includes('cmd=loadStartURL'), 'second call is loadStartURL');
});

test('createSwitcher: HA fetch error is swallowed, no kiosk calls fire', async () => {
  const kiosks = [
    { host: 'http://t1:2323', password: 'p', playingUrl: 'http://srv/a', stoppedUrl: null },
  ];
  const fetched = [];
  const fetchImpl = async (url) => { fetched.push(url); return { ok: true }; };
  const haClient = { getStates: async () => { throw new Error('HA down'); } };

  const sw = createSwitcher({
    haClient,
    config: {},
    kiosks,
    fetchImpl,
    logger: { info() {}, warn() {} },
  });

  assert.equal(await sw.tick(), null);
  assert.equal(fetched.length, 0);
});

test('createSwitcher: kiosk that errors out does not block the others', async () => {
  const kiosks = [
    { host: 'http://t1:2323', password: 'p', playingUrl: 'http://srv/a', stoppedUrl: null },
    { host: 'http://t2:2323', password: 'p', playingUrl: 'http://srv/b', stoppedUrl: null },
  ];
  const fetched = [];
  const fetchImpl = async (url) => {
    fetched.push(url);
    if (url.includes('t1')) throw new Error('t1 offline');
    return { ok: true };
  };

  let call = 0;
  const haClient = {
    getStates: async () => {
      call++;
      if (call === 1) return [];
      return [{
        entity_id: 'media_player.plex_plex_for_lg_tv',
        state: 'playing',
        attributes: { friendly_name: 'LG', media_title: 'M' },
      }];
    },
  };

  const sw = createSwitcher({
    haClient,
    config: { plexPlayer: 'media_player.plex_plex_for_lg_tv' },
    kiosks,
    fetchImpl,
    logger: { info() {}, warn() {} },
  });

  await sw.tick();
  await sw.tick();
  assert.equal(fetched.length, 2, 'both kiosks should still be attempted');
});
