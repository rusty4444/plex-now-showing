# WebSocket Subscription + SSE (#10) Implementation

## Architecture

```
HA WebSocket (push)  ──→  Node Server  ──→  SSE (/api/events)  ──→  Browser
                              │
                              ↓
                        Cache invalidated
                        (next /api/state serves fresh)
                              │
                        Fallback: 30s poll
```

The server connects to HA's WebSocket API, subscribes to `state_changed` events, and:
1. Invalidates the state cache immediately when a media_player entity changes
2. Pushes the new state to all connected browser SSE clients
3. Falls back to HA REST polling if WS disconnects

The browser connects to `/api/events` via EventSource and:
1. Receives push updates — calls `showMedia()` immediately
2. Falls back to 30s polling if SSE disconnects

## Files to change

1. **Create:** `server/src/haWs.js` — HA WebSocket client
2. **Modify:** `server/src/ha.js` — Export WS factory too
3. **Create:** `server/src/routes/events.js` — SSE endpoint
4. **Modify:** `server/src/server.js` — Wire WS + SSE
5. **Modify:** `www/now_showing.html` — Frontend SSE consumer
6. **Modify:** `server/package.json` — Add `ws` dependency
