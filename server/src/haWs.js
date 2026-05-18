// Home Assistant WebSocket client (#10).
//
// Subscribes to state_changed events for media_player entities and pushes
// them to connected SSE clients. Falls back to REST polling on disconnect.
//
// Protocol: https://developers.home-assistant.io/docs/api/websocket/

import WebSocket from 'ws';

export function createHaWsClient({ haUrl, haToken, onStateChange, onError }) {
  let ws = null;
  let reconnectTimer = null;
  let pingTimer = null;
  let msgId = 1;
  let subscribed = false;
  let closed = false;
  let connecting = false;  // guard against concurrent connect() calls

  function buildWsUrl() {
    // http://supervisor/core → ws://supervisor/core/api/websocket
    // http://192.168.1.10:8123 → ws://192.168.1.10:8123/api/websocket
    const url = haUrl.replace(/^http/, 'ws');
    return `${url}/api/websocket`;
  }

  function send(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  function subscribe() {
    if (subscribed) return;
    msgId++;
    send({ id: msgId, type: 'subscribe_events', event_type: 'state_changed' });
    subscribed = true;
  }

  function connect() {
    if (closed) return;
    if (connecting) return;  // already in-flight
    if (ws) {
      try { ws.close(); } catch (_) {}
      ws = null;
    }
    connecting = true;

    const url = buildWsUrl();
    console.log(`[ha-ws] connecting to ${url}`);
    subscribed = false;

    try {
      ws = new WebSocket(url);
    } catch (err) {
      console.error(`[ha-ws] connection failed: ${err.message}`);
      connecting = false;
      scheduleReconnect();
      return;
    }

    ws.on('open', () => {
      console.log('[ha-ws] connected');
      connecting = false;
      // Step 1: auth
      msgId++;
      send({ id: msgId, type: 'auth', access_token: haToken });
      // Start periodic ping to keep the HA WS connection alive (10s idle timeout)
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(() => send({ type: 'ping' }), 50000);
    });

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      if (msg.type === 'auth_ok') {
        console.log('[ha-ws] authenticated');
        subscribe();
        return;
      }

      if (msg.type === 'auth_invalid') {
        console.error(`[ha-ws] auth_invalid: ${msg.message || 'unknown'}`);
        if (onError) onError(new Error(`HA WS auth failed: ${msg.message}`));
        ws.close();
        return;
      }

      if (msg.type === 'event' && msg.event && msg.event.event_type === 'state_changed') {
        const entityId = msg.event.data.entity_id || '';
        // Only care about media_player entities
        if (entityId.startsWith('media_player.')) {
          if (onStateChange) onStateChange(msg.event.data);
        }
        return;
      }

      // pong
      if (msg.type === 'pong') return;
    });

    ws.on('close', () => {
      console.log('[ha-ws] disconnected');
      ws = null;
      connecting = false;
      subscribed = false;
      if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
      if (!closed) scheduleReconnect();
    });

    ws.on('error', (err) => {
      console.error(`[ha-ws] error: ${err.message}`);
      connecting = false;
      // close event follows, which triggers reconnect
    });
  }

  function scheduleReconnect() {
    if (closed) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    console.log('[ha-ws] reconnecting in 10s');
    reconnectTimer = setTimeout(() => connect(), 10000);
  }

  function start() {
    closed = false;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    connect();
  }

  function stop() {
    closed = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    if (ws) {
      try { ws.close(); } catch (_) {}
      ws = null;
    }
    connecting = false;
    subscribed = false;
  }

  return { start, stop, isConnected: () => ws !== null && ws.readyState === WebSocket.OPEN };
}
