import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCache } from '../src/cache.js';

test('set/get returns value inside TTL', () => {
  const c = createCache(50);
  c.set('a', 1);
  assert.equal(c.get('a'), 1);
});

test('get returns undefined after TTL expires', async () => {
  const c = createCache(10);
  c.set('a', 1);
  await new Promise(r => setTimeout(r, 25));
  assert.equal(c.get('a'), undefined);
});

test('invalidate with no key clears everything', () => {
  const c = createCache(10_000);
  c.set('a', 1); c.set('b', 2);
  c.invalidate();
  assert.equal(c.size(), 0);
});

test('invalidate with a key removes only that entry', () => {
  const c = createCache(10_000);
  c.set('a', 1); c.set('b', 2);
  c.invalidate('a');
  assert.equal(c.get('a'), undefined);
  assert.equal(c.get('b'), 2);
});
