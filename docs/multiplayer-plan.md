# In-browser multiplayer for 7kaa — design + implementation plan

Produced by the `mp-bridge-design` ultracode workflow (13 agents: map → design panel →
judge → adversarial verify → synthesize). All claims were checked against the real source
with `file:line` citations.

## Decision: WebSocket-relay, reimplement the `MultiPlayer` wrapper

Scores (latency/determinism/simplicity/hostingCost, overall):
- **WebSocket-relay — 3/5/5/3, overall 82 ← chosen**
- WebRTC DataChannels — 5/5/2/3, overall 72 (best latency, but ICE/STUN/TURN + mesh JS glue is the bulk of the risk and lives outside type-checked C++)
- POSIX-socket proxy (`-sPROXY_POSIX_SOCKETS`) — 2/3/1/2, overall 22, **disqualified**: `websocket_to_posix_socket.c` uses `pthread_mutex` + blocking `emscripten_futex_wait` on a callback registered to the main runtime thread → deadlocks under our single-threaded ASYNCIFY build; would force pthreads + COOP/COEP (the thing we avoided).

**Why WebSocket wins here:** the abstraction seam is already pre-cut — every `enet_*`/`ENet*`
symbol is confined to `include/multiplayer.h` + `src/enet/multiplayer.cpp`; everything else
(`OGAMEMP`, `OREMOTE*`, `OERRCTRL`, `OMP_CRC`) talks only to `mp_obj`. So we add a new
`src/ws/multiplayer.cpp` implementing the same ~25 public methods and link it instead of enet.
WebSocket/TCP is reliable+ordered — strictly stronger than the `ENET_PACKET_FLAG_UNSEQUENCED`
mode the game flips to in-game (`src/enet/multiplayer.cpp:562`), so `game_starting()` becomes a
no-op and the whole `ec_remote` lockstep layer stays untouched. One Node+`ws` process (~200
lines) is both the lobby and the traffic relay — no STUN/TURN needed.

## Adversarial verification (1 of 4 claims needed mitigation)

- **Determinism — REFUTED as stated, but only the "vs native" part.** The engine deliberately
  gates MP on `fpu_type==387 + -ffloat-store` (`configure.ac:193`); the wasm build has neither,
  so wasm↔native **will** desync (transcendentals `sin/cos` in `OTORNADO.cpp:68-69,87-88` differ
  across libm; struct packing differs ILP32 vs LP64). **wasm↔wasm is safe** (two copies of the
  same `.wasm` call the same compiled musl libm; identical layout/endianness). → **Scope to
  wasm↔wasm only; keep `FLAG_UNKNOWN_BUILD` set so the engine's own lobby flag-check refuses
  mixed joins.** Prove with the deep-CRC soak test, not by argument.
- **Reliability+ordering — HOLDS.** TCP gives reliable in-order; the lockstep layer only needs
  no-loss + per-sender order (it demuxes by `senderFrameCount`, `OREMOTE2.cpp:329`). Relay must
  forward 1-in/1-out in arrival order and never coalesce senders.
- **Main-loop fit — HOLDS (empirically).** Single-threaded `-sASYNCIFY`; the only async import is
  `_emscripten_sleep`; SDL2's asyncify hint yields each frame at `Sys::yield()` (`OSYS.cpp:796`);
  `receive()` is non-blocking (`enet_host_service(...,0)`). `onmessage` fires during the yield and
  buffers for the next poll. No pthreads/COOP-COEP needed.
- **Lobby without LAN UDP — HOLDS.** The "Enter Address" path (`service_mode==2`,
  `OGAMEMP.cpp:657`) → `init_lobbied` skips all UDP discovery. Repurpose the address box as
  "relay URL + room code".

## Build changes (to re-enable MP without enet)

- Patch `configure.ac:192-202`: drop the `fpu_type==387 && enet` auto-downgrade so
  `--enable-multiplayer` stays `yes` under emconfigure.
- **Leave `HAVE_KNOWN_BUILD` UNDEFINED** (`configure.ac:315-317`) — keeps `FLAG_UNKNOWN_BUILD`
  set so the lobby refuses wasm↔native joins (the determinism interlock). Do NOT define it.
- Add `--enable-websocket` → `AM_CONDITIONAL([USE_WS_MP])` + `AC_DEFINE([USE_WS_MP])`. Keep
  `USE_ENET` undefined.
- With `enable_multiplayer=yes`, `DISABLE_MULTI_PLAYER` becomes undefined → the Multiplayer menu
  item un-greys (`OGAMMAIN.cpp:87-90`).
- New `src/ws/` dir + `Makefile.am` (mirror `src/enet/`) building `libmultiplayer_ws.a`; add to
  `AC_CONFIG_FILES`.
- `build.sh`: flags → `--enable-multiplayer --enable-websocket --disable-enet --disable-curl
  --disable-nls`; link `./ws/libmultiplayer_ws.a` instead of `./enet/libmultiplayer.a`; add
  `-lwebsocket.js` (+ optional `--js-library web/ws_mp.js`). Keep single-threaded, no `-ffast-math`.
- `rm upstream/Makefile` to force a re-configure.

## Transport contract (`src/ws/multiplayer.cpp`, selected by `USE_WS_MP`)

Implements the public `MultiPlayer` API (`include/multiplayer.h:185-228`). `ENet*` typedefs
already stub to `void*` when `USE_ENET` is off; change `ENetAddress` (`session_desc.h:30`,
`player_desc.h:32`) to a real POD `{uint32 host; uint16 port}` used as an opaque relay peer key.

- `send(to,data,size)`: `to==BROADCAST_PID(0)` → relay fan-out; `to==self` → no-op; else route.
  One `send` = one `emscripten_websocket_send_binary` frame prefixed with `{dst_player_id}`.
  Assert `size<=10240`.
- `receive(*from,*size,*sysMsgCount)`: single **non-blocking** poll, returns at most one event —
  payload, synthetic CONNECT (`+1`), synthetic DISCONNECT (`-1`), or NULL+0 idle. Never busy-spin
  (mirror `enet_host_service(...,0)`, `multiplayer.cpp:1326`).
- Keep `player_pool[]` bookkeeping (`get_player`/`add_player`/`auth_player`/`update_player_pool`/
  `get_avail_player_id`, host=id 1, clients 2..7=MAX_NATION) verbatim; replace `peer->data`
  lookups with a `{playerId→relayPeerId, connected}` table.
- `game_starting()` → no-op (WS is always reliable+ordered).
- **JS glue** (via `emscripten/websocket.h`, callbacks run on the calling thread under no-pthread):
  `onmessage` copies bytes into a C-side FIFO; per-peer CONNECT/DISCONNECT come from relay control
  frames. The wasm `receive()` drains it next poll; the JS handler must not re-enter wasm.
- **Hook sites (no change needed there):** in-game send/recv go through `ec_remote`
  (`OERRCTRL.cpp:139,232`); lobby calls `mp_obj.send/receive` directly in `OGAMEMP`
  (`:3094`, `:4047`, `:4180`, join-wait `:2082-2148`); player-lost → AI takeover via
  `is_player_connecting` (`OERRCTRL.cpp:226` → `OSYS.cpp:1418`).
- **Future-proof framing** `{dst_player_id}{payload}` so swapping to a reliable-unordered WebRTC
  channel later (to dodge TCP head-of-line blocking) is a drop-in.

## Relay server (Node + `ws`, ~150-250 lines, zero native deps)

Rooms keyed by a short code. Host = first socket = player id 1; clients get 2..7. **Routing
invariants:** forward each inbound frame to its destination(s) strictly in arrival order, 1-in =
1-out, never merge/split/reorder, prefix delivered frames with the sender's id. **Synthetic
events (the biggest risk):** on join/leave send a control frame so the C shim emits CONNECT/
DISCONNECT; drive these off socket state + a heartbeat (ping ~2s, dead ~3-5s) so a stuck peer
yields a DISCONNECT **before** the engine's ~20s AI-takeover window (`OSYS.cpp:1418`) — else the
lockstep barrier stalls the whole match. Run locally: `npm i ws && node relay.js` (ws://localhost:8090).
Page over https needs `wss://` behind a TLS proxy for remote play.

## Determinism safeguards

wasm↔wasm only; keep `FLAG_UNKNOWN_BUILD`; ship the byte-identical `.wasm` to all clients; no
`-ffast-math`; keep IEEE-754 strict; keep `ec_remote`/seed discipline unchanged. **Mandatory
proof:** enable the deep-CRC desync detector (`sync_test_level`, `OREMOTE.cpp:96-99`) and run two
wasm clients through a long game (combat, economy, diplomacy, tornado) with zero `MSG_COMPARE_CRC`
desyncs.

## Two-browser test plan

Relay up → serve `build/` → two tabs. Host (Create) in A; B joins via `ws://localhost:8090#CODE`
in the "Enter Address" box → both in lobby (2 players) → Ready → Start → identical map (same seed)
→ issue commands, confirm they appear on both ~8 frames later → deep-CRC soak → kill tab B and
confirm A shows "waiting…" then converts the nation to AI at ~20s (not a hang).

## Open decisions (recommended defaults in **bold**)

1. Topology: **star (relay fans out broadcast)** vs true mesh.
2. Scope: **wasm↔wasm only** (declare wasm↔native unsupported).
3. MVP: **bridge the "Enter Address"/`init_lobbied` direct path first**; LAN-broadcast/NAT-punch → no-ops.
4. `ENetAddress` replacement: **POD `{uint32 host; uint16 port}`** (must serialize identically on both clients).
5. Host model: **host-as-player (id 1); relay is a dumb router.**
6. Keep `ec_remote` ARQ in-game: **yes, unchanged** (redundant over TCP but safest).
7. Relay heartbeat/timeout values (human picks; must fire DISCONNECT before the ~20s takeover).
8. Optional extra interlock: a wasm-specific flags bit so wasm clients only match wasm clients.
9. Deployment beyond localhost (`wss://` + host) — later, out of scope for the two-tab MVP.
