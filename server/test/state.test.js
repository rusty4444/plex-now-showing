import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { normalise } from '../src/state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const states = JSON.parse(
  readFileSync(join(__dirname, '..', 'fixtures', 'ha_states.json'), 'utf8'),
);

test('returns null when nothing is playing', () => {
  const idle = states.map(s => ({ ...s, state: 'idle' }));
  assert.equal(normalise(idle, { plexUsername: 'rusty' }), null);
});

test('pins to plexPlayer when configured', () => {
  const r = normalise(states, { plexPlayer: 'media_player.plex_plex_for_lg_tv' });
  assert.equal(r.title, 'Pilot');
  assert.equal(r.seriesTitle, 'Severance');
  assert.equal(r.ratingKey, '12345');
  assert.equal(r.state, 'playing');
  // Artwork should be rewritten to our same-origin proxy
  assert.ok(r.artwork.startsWith('/api/artwork?path='));
  assert.ok(r.artwork.includes(encodeURIComponent('/api/media_player_proxy/media_player.plex_plex_for_lg_tv')));
});

test('includes position + positionUpdatedAt for the progress bar', () => {
  const r = normalise(states, { plexPlayer: 'media_player.plex_plex_for_lg_tv' });
  assert.equal(r.duration, 3120);
  assert.equal(r.position, 842);
  assert.equal(r.positionUpdatedAt, '2026-04-24T12:00:00.000000+00:00');
});

test('position defaults to 0 and positionUpdatedAt to empty when missing', () => {
  const withoutPos = [{
    entity_id: 'media_player.plex_plex_for_lg_tv',
    state: 'playing',
    attributes: { media_title: 'x', media_duration: 120 },
  }];
  const r = normalise(withoutPos, { plexPlayer: 'media_player.plex_plex_for_lg_tv' });
  assert.equal(r.position, 0);
  assert.equal(r.positionUpdatedAt, '');
});

test('absolute artwork URLs are left alone', () => {
  const withAbs = [{
    entity_id: 'media_player.plex_plex_for_lg_tv',
    state: 'playing',
    attributes: {
      media_title: 'x',
      entity_picture: 'https://cdn.example/poster.jpg',
    },
  }];
  const r = normalise(withAbs, { plexPlayer: 'media_player.plex_plex_for_lg_tv' });
  assert.equal(r.artwork, 'https://cdn.example/poster.jpg');
});

test('pinned player that is idle returns null', () => {
  const r = normalise(states, { plexPlayer: 'media_player.plex_plex_for_ios_iphone' });
  assert.equal(r, null);
});

test('falls back to user-filtered active players when no plexPlayer', () => {
  const r = normalise(states, { plexUsername: 'rusty' });
  assert.ok(r, 'should find an active player for rusty');
  // Both LG TV and Android TV are rusty's — either is acceptable; assert shape.
  assert.ok(['Pilot', 'Dune: Part Two'].includes(r.title));
});

test('username mismatch filters the player out', () => {
  const r = normalise(states, { plexUsername: 'nobody' });
  // No matching user and no plex_for_* generic match → null.
  // (LG TV / Android TV both have usernames so fall through the generic branch.)
  assert.equal(r, null);
});

test('handles non-array input defensively', () => {
  assert.equal(normalise(null), null);
  assert.equal(normalise(undefined), null);
  assert.equal(normalise({}), null);
});
