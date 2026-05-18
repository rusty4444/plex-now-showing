// GET /api/events — Server-Sent Events endpoint (#10).
//
// Pushes state change events to connected browser clients in real time,
// eliminating the need for frontend polling.
//
// Each event is a JSON payload matching the /api/state response shape.
// Falls back automatically when SSE is unavailable.

export function createEventBroadcaster() {
  const clients = new Set();

  function eventsRoute(_req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',  // disable nginx buffering
    });

    // Send initial heartbeat to confirm connection
    res.write(`:ok\n\n`);

    clients.add(res);

    // Keep-alive ping every 30s to prevent proxy timeouts
    const keepAlive = setInterval(() => {
      try { res.write(`:ping\n\n`); } catch { clearInterval(keepAlive); }
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
      clients.delete(res);
    });
  }

  function broadcast(data) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) {
      try { client.write(payload); } catch { clients.delete(client); }
    }
  }

  function clientCount() { return clients.size; }

  function close() {
    for (const client of clients) {
      try { client.end(); } catch (_) {}
    }
    clients.clear();
  }

  return { eventsRoute, broadcast, clientCount, close };
}
