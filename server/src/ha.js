// Home Assistant client.
//
// Works transparently in both supported modes (see config.js):
//   - addon       → GET http://supervisor/core/api/states with SUPERVISOR_TOKEN
//   - standalone  → GET <HA_URL>/api/states with <HA_TOKEN>
//
// Only GET /api/states is needed for now; a later issue (#arch-1, WebSocket)
// will replace polling with a push subscription and can live behind the same
// interface.

export function createHaClient({ haUrl, haToken, fetchImpl = globalThis.fetch }) {
  if (!haUrl) throw new Error('haUrl is required');
  if (!haToken) throw new Error('haToken is required');

  async function getStates() {
    const resp = await fetchImpl(`${haUrl}/api/states`, {
      headers: {
        Authorization: `Bearer ${haToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!resp.ok) {
      const body = await safeText(resp);
      const err = new Error(`HA /api/states returned ${resp.status}`);
      err.status = resp.status;
      err.body = body;
      throw err;
    }
    return resp.json();
  }

  return { getStates };
}

async function safeText(resp) {
  try { return await resp.text(); } catch { return ''; }
}
