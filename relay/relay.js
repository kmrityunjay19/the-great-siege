// 7kaa WebSocket multiplayer relay + lobby (star topology).
//
// It is a dumb, game-agnostic router: it forwards opaque binary game frames within a
// room in strict arrival order (1 in -> 1 out, never merged/split/reordered) and tracks
// per-peer liveness so it can synthesize the CONNECT/DISCONNECT events the engine's
// lockstep layer needs (a dropped peer must yield a DISCONNECT before the engine's
// ~20s AI-takeover window, or the lockstep barrier stalls the whole match).
//
// Wire protocol (must match web/ws_mp.js on the C side):
//   Control  = TEXT (JSON) frames:
//     client->relay: {"op":"create","code":"ROOM","name":"Player"}
//                    {"op":"join","code":"ROOM","name":"Player"}
//     relay->client: {"op":"joined","playerId":N,"host":bool}
//                    {"op":"error","msg":"..."}
//                    {"op":"peer_connect","playerId":N}
//                    {"op":"peer_disconnect","playerId":N}
//   Game     = BINARY frames:
//     client->relay: [dstPlayerId:u32 LE][payload...]   (dst 0 = broadcast to room)
//     relay->client: [srcPlayerId:u32 LE][payload...]
//
// Player ids: host = 1, clients = 2..MAX_NATION(7). Mirrors the engine's id allocation.

const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8090;
const MAX_NATION = 7;            // GAMEDEF.h: MAX_NATION = 7
const HEARTBEAT_MS = 2000;       // ping cadence
const DEAD_MS = 6000;            // declare a peer dead (fires DISCONNECT) — < engine's ~20s takeover

const rooms = new Map();         // code -> { peers: Map<playerId, peerObj> }

function now() { return Date.now(); }

function jsend(ws, obj) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

function roomOf(code) {
  let r = rooms.get(code);
  if (!r) { r = { peers: new Map() }; rooms.set(code, r); }
  return r;
}

function nextPlayerId(room) {
  // host is 1; clients take the lowest free id in 2..MAX_NATION
  for (let id = 1; id <= MAX_NATION; id++) {
    if (!room.peers.has(id)) return id;
  }
  return 0; // room full
}

// Announce a join/leave to everyone else in the room as a synthetic peer event.
function broadcastPeerEvent(room, exceptId, op, playerId) {
  for (const [pid, peer] of room.peers) {
    if (pid === exceptId) continue;
    jsend(peer.ws, { op, playerId });
  }
}

function dropPeer(room, code, peer, reason) {
  if (!room.peers.has(peer.playerId)) return;
  room.peers.delete(peer.playerId);
  console.log(`[room ${code}] player ${peer.playerId} left (${reason}); ${room.peers.size} remain`);
  broadcastPeerEvent(room, peer.playerId, 'peer_disconnect', peer.playerId);
  if (room.peers.size === 0) { rooms.delete(code); console.log(`[room ${code}] closed`); }
}

const server = http.createServer((req, res) => {
  // tiny health endpoint so `curl localhost:8090/health` works
  if (req.url === '/health') { res.writeHead(200); res.end('ok\n'); return; }
  res.writeHead(426); res.end('Upgrade Required (WebSocket)\n');
});
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  // peer state: assigned after a create/join control message
  const peer = { ws, room: null, code: null, playerId: 0, name: '', lastSeen: now(), alive: true };

  ws.on('message', (data, isBinary) => {
    peer.lastSeen = now();

    if (!isBinary) {
      // control frame (JSON)
      let msg;
      try { msg = JSON.parse(data.toString()); } catch (e) { return jsend(ws, { op: 'error', msg: 'bad json' }); }

      if (msg.op === 'create' || msg.op === 'join') {
        if (peer.room) return jsend(ws, { op: 'error', msg: 'already in a room' });
        const code = String(msg.code || '').trim();
        if (!code) return jsend(ws, { op: 'error', msg: 'missing room code' });
        const room = roomOf(code);

        if (msg.op === 'create') {
          if (room.peers.size > 0) return jsend(ws, { op: 'error', msg: 'room already exists' });
          peer.playerId = 1; // host
        } else {
          if (room.peers.size === 0) return jsend(ws, { op: 'error', msg: 'no such room' });
          const id = nextPlayerId(room);
          if (!id) return jsend(ws, { op: 'error', msg: 'room full' });
          peer.playerId = id;
        }
        peer.room = room; peer.code = code; peer.name = String(msg.name || '');
        room.peers.set(peer.playerId, peer);
        jsend(ws, { op: 'joined', playerId: peer.playerId, host: peer.playerId === 1 });
        console.log(`[room ${code}] player ${peer.playerId} (${peer.name}) ${msg.op}; ${room.peers.size} in room`);
        // tell existing peers about the newcomer, and the newcomer about existing peers
        broadcastPeerEvent(room, peer.playerId, 'peer_connect', peer.playerId);
        for (const [pid] of room.peers) {
          if (pid !== peer.playerId) jsend(ws, { op: 'peer_connect', playerId: pid });
        }
        return;
      }
      return jsend(ws, { op: 'error', msg: 'unknown op' });
    }

    // binary game frame: [dst:u32 LE][payload]
    if (!peer.room || data.length < 4) return;
    const dst = data.readUInt32LE(0);
    const payload = data.subarray(4);
    // re-frame with the SENDER id, forward in arrival order, 1-in -> 1-out, no coalescing
    const out = Buffer.allocUnsafe(4 + payload.length);
    out.writeUInt32LE(peer.playerId, 0);
    payload.copy(out, 4);
    if (dst === 0) {
      for (const [pid, p] of peer.room.peers) {
        if (pid !== peer.playerId && p.ws.readyState === p.ws.OPEN) p.ws.send(out, { binary: true });
      }
    } else {
      const target = peer.room.peers.get(dst);
      if (target && target.ws.readyState === target.ws.OPEN) target.ws.send(out, { binary: true });
    }
  });

  ws.on('pong', () => { peer.alive = true; peer.lastSeen = now(); });
  ws.on('close', () => { if (peer.room) dropPeer(peer.room, peer.code, peer, 'socket close'); });
  ws.on('error', () => { if (peer.room) dropPeer(peer.room, peer.code, peer, 'socket error'); });
});

// heartbeat: ping everyone; a peer that misses pings past DEAD_MS is declared gone so the
// engine sees a timely DISCONNECT and converts that nation to AI instead of hanging.
setInterval(() => {
  const t = now();
  for (const [code, room] of rooms) {
    for (const [, peer] of room.peers) {
      if (t - peer.lastSeen > DEAD_MS) { try { peer.ws.terminate(); } catch (e) {} dropPeer(room, code, peer, 'timeout'); continue; }
      try { peer.ws.ping(); } catch (e) {}
    }
  }
}, HEARTBEAT_MS);

server.listen(PORT, () => console.log(`7kaa relay listening on ws://localhost:${PORT} (health: /health)`));
