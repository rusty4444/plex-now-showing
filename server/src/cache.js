// Tiny TTL cache. Two instances wired up in server.js:
//   - state cache   (short TTL, ~3 s)   — smooths out multi-tablet polling
//   - mediaInfo cache (long TTL, ~10 m) — Plex metadata rarely changes
//
// Keeps the hot path simple: no external deps, no LRU — the key space for
// both caches is tiny (one entry for state, <100 for media info on any
// realistic library usage window).

export function createCache(ttlMs) {
  const store = new Map();

  function get(key) {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (entry.expires <= Date.now()) {
      store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  function set(key, value, customTtlMs) {
    store.set(key, {
      value,
      expires: Date.now() + (customTtlMs ?? ttlMs),
    });
    return value;
  }

  function invalidate(key) {
    if (key == null) store.clear();
    else store.delete(key);
  }

  function size() { return store.size; }

  return { get, set, invalidate, size };
}
