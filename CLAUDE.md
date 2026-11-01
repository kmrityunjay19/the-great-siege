# 7kaa-web — Seven Kingdoms: Ancient Adversaries in the browser

Port the GPL'd RTS **Seven Kingdoms: Ancient Adversaries** (7kaa) to a playable
website by compiling the original C++/SDL2 engine to **WebAssembly with Emscripten**.
Strategy: ship the *real* engine (AI, economy, diplomacy, 10 cultures) rather than
rewriting in JS. Iterate at the build/integration layer.

**Milestone 1 (current goal):** get it compiling and booting in-browser far enough to
render and navigate the **title / main menu screen**. Later milestones: in-game world
map → full single-player → multiplayer + polish.

## Layout

```
7kaa/
  src/engine/    # git clone of the3dfxdude/7kaa (engine source + data/, GPLv2)
  .toolchain/emsdk/       # Emscripten SDK toolchain
  build/       # emscripten output: 7kaa.js / .wasm / .data  (gitignored)
  web/         # shell.html + dev tooling (scripts/)
  src/patches/     # our engine changes exported from upstream's web-port branch
  relay/       # node WebSocket multiplayer relay (M5)
  MAINTAINING.md  # how to re-apply our changes onto a new upstream release
  CLAUDE.md    # this file
```

## Our engine changes are a patchset — KEEP IT CURRENT

Our edits to `src/engine/` (the engine) live as a feature-grouped branch **`web-port`** in
the `src/engine/` clone, exported to **`src/patches/*.patch`**. This is how we re-apply our work
onto a new 7kaa release (`git am --3way`). See **`MAINTAINING.md`** for the full model and
backport runbook.

**Two git repos:** the **repo root** is its own git repo (branch `main`) that
version-controls our infra + `src/patches/`; the **`src/engine/`** engine clone is a *separate*
repo (branch `web-port`) and is gitignored from the root (as are `.toolchain/emsdk/`, `build/`,
`node_modules/`). So `git` in the root = our infra; `git` in `src/engine/` = the engine
patchset.

**Whenever you change a file under `src/engine/`**, before ending the session: commit it to
the `web-port` branch (`cd upstream && git add … && git commit`), then run
**`scripts/refresh-patches.sh`** and commit the refreshed `src/patches/` in the **root** repo
too. The root infra (`build.sh`, `web/`, `relay/`, `docs/`) is version-independent and is
**not** part of the engine patchset.

`src/engine/data/` (≈102 MB) ships in the repo and holds everything the game loads at
runtime: `RESOURCE/` (`.RES` resource DBs incl. fonts `FNT_*`, `CURSOR.RES`),
`IMAGE/`, `SPRITE/`, `SOUND/`, `SCENARIO/`, `ENCYC/`. The game locates it via the
**`SKDATA`** env var (native: `SKDATA=data ./src/7kaa`); in the browser we preload it
into the Emscripten FS at `/data`.

## Source acquisition (already done; re-run if `src/engine/` missing)

```bash
git clone https://github.com/the3dfxdude/7kaa.git upstream      # source + data
git clone https://github.com/emscripten-core/emsdk.git emsdk
.toolchain/emsdk/emsdk install latest && .toolchain/emsdk/emsdk activate latest
```

The release tarball `7kaa-2.15.7.tar.gz` on SourceForge (`skfans`) also bundles
source+data with a pre-generated `configure` — not needed here since autotools works
locally. Upstream is GPLv2.

## Build (Emscripten)

The toolchain: `source .toolchain/emsdk/emsdk_env.sh` (bash; the fish shell can choke on the env
script — invoke emcc from a bash subshell if needed).

1. **Generate `./configure`** (native autotools, once): in `src/engine/`,
   `LIBTOOLIZE=glibtoolize ./autogen.sh` (macOS names libtoolize `glibtoolize`).
2. **Configure under Emscripten**, bypassing pkg-config for the SDL2/OpenAL ports by
   setting the `*_CFLAGS`/`*_LIBS` env vars (PKG_CHECK_MODULES skips detection when
   these are set), and disabling networking:
   ```bash
   emconfigure ./configure \
     --disable-multiplayer --disable-enet --disable-curl \
     SDL_CFLAGS="-sUSE_SDL=2" SDL_LIBS="-sUSE_SDL=2" \
     OPENAL_CFLAGS="" OPENAL_LIBS="-lopenal"
   ```
   x86 asm stays **off** (`enable_asm=no` default → uses `src/imgfun/generic/*.cpp`).
3. **Build**: `emmake make`.
4. **Final link to web** with the browser-specific flags (asyncify so the engine's
   blocking loop can yield, growable memory, preload the game data, our HTML shell):
   ```bash
   emcc <objects> -o ../build/7kaa.html \
     -sUSE_SDL=2 -lopenal -sASYNCIFY -sALLOW_MEMORY_GROWTH=1 \
     -sINITIAL_MEMORY=256MB \
     --preload-file data@/data --shell-file ../web/shell.html
   ```
   (If `emmake make` won't emit the web target directly, link the produced `.o`s with
   this emcc step. Trim `--preload-file` to menu-needed `RESOURCE/`/`IMAGE/`/`SPRITE/`
   subsets to keep `7kaa.data` small for M1.)

### Run / verify
```bash
cd build && python3 -m http.server 8000   # open http://localhost:8000/7kaa.html
```
Confirm the main menu renders and mouse/keyboard navigate it. Audio may need a user
gesture (browser autoplay policy) — acceptable for M1. Use the `/browse` skill to load
the URL headless and screenshot the canvas as objective confirmation.

## Known gotchas / fixes

- **Blocking main loop** → `-sASYNCIFY` (M1). A later milestone may refactor
  `Sys::main_loop` (`src/OSYS.cpp`) to `emscripten_set_main_loop` to drop the overhead.
- **Inline x86 asm with no C fallback** in two spots — must be patched to portable C
  for wasm: `src/OFLAME.cpp:473` and `src/OWORLD.cpp:2086` (each is an `#ifdef _MSC_VER
  _asm … #else __asm__ … #endif` with no plain-C branch). Replace with equivalent C.
- **Networking** (browsers have no UDP): disabled for now via the configure flags
  above. Multiplayer (`src/enet/`, `OANLINE.cpp`, `OREMOTE*.cpp`) → bridge over
  WebSocket/WebRTC in a later milestone.
- **Save games**: persist via Emscripten **IDBFS** (later milestone).
- **Single-threaded** for M1 — avoids needing COOP/COEP cross-origin-isolation headers.
- **Lazy-load dir detection (M4 regression, fixed 2026-06-09).** `Sys::set_game_dir()`
  (`OSYS.cpp`) detects `ENCYC/SCENARIO/TUTORIAL/MUSIC` dirs **once at boot**, but those
  live in `extras.data` which mounts *asynchronously after* boot — so they came up empty
  all session (disabled encyclopedia, "no scenario", tutorial load fail, no music). Fix:
  `web_rescan_data_dirs()` (exported `extern "C"`, `OSYS.cpp`) re-runs `set_game_dir()`;
  `web/shell.html` polls for `/data/SCENARIO/7FOR7.SCN` then calls it via `Module.ccall`
  (needs `-sEXPORTED_RUNTIME_METHODS=ccall`). Main menu re-evaluates the encyclopedia
  button each loop so it re-enables live. **Any new extras-backed feature must tolerate
  its dir being empty until the rescan fires.**
- **Web "Quit" + Donate (2026-06-09).** A real "quit" freezes the canvas in a browser, so
  under `__EMSCRIPTEN__`: the main-menu **Quit** and in-game **"Quit Seven Kingdoms"** call
  `web_exit_fullscreen()` (drop out of fullscreen) instead of setting `signal_exit_flag`;
  the menu loop's `i == MAIN_OPTION_COUNT-1` break is also guarded so Quit stays on the
  menu. **Donate** is a separate gold link on the main menu: a pre-rendered bitmap
  (`src/donate_img.h`, a gold "♥ Donate" + brighter hover variant, regenerate with
  `scripts/gen_donate_img.py` — recolored to PAL_MENU's title-gold ramp 228–234 since
  no engine font is gold). `OGAMMAIN.cpp` blits it with `put_bitmap_trans` (index 255 =
  transparent) **every frame** (the menu page-flips, so a refresh-only draw wouldn't
  persist across submenu returns), swapping to the bright bitmap on hover; the click
  region calls `web_open_donate()` (ko-fi, new tab). It's centered **below** the baked-in
  copyright line (the QUIT→copyright gap is too small). `web/shell.html`'s extras-rescan
  also calls `Module.setStatus('')` to clear the "Downloading data" overlay. The QUIT
  **art is original** (an earlier `I_IF.RES` "QUIT"→"DONATE" edit was reverted).
- **Responsive canvas** — `web/shell.html` CSS sizes the canvas to the viewport with
  `object-fit:contain`; the engine's `SDL_RenderSetLogicalSize(800,600)` (gated on
  `config_adv.vga_keep_aspect_ratio`, default 1) letterboxes inside it and delivers mouse
  events already in logical 800×600 coords, so clicks stay correct. Windowed mode is
  verified non-stretching (black bars, no deform).
- **Fullscreen button** — `web/shell.html` adds an `#fsbtn` (⛶, top-right) that
  fullscreens the `#wrap` container (Esc exits). It sits OUTSIDE `#wrap` so the browser
  auto-hides it during fullscreen. The container's `object-fit:contain` canvas keeps the
  4:3 aspect, so this path does not stretch.
- **DO LATER (aspect/fullscreen, "may be involved"):** the engine's *own* SDL fullscreen
  (`vga_full_screen=1` default, Alt+Enter / `toggle_full_screen_flag`) scales differently
  and can stretch/deform in-browser — separate from the CSS path above. Also, mouse
  mapping in browser-fullscreen is only pixel-exact when the screen aspect matches the
  canvas buffer aspect (`object-fit` bars on odd aspects throw SDL's canvas-rect mapping
  off slightly). Proper fix: drive fullscreen through one path (likely disable the engine
  SDL fullscreen on web and resize the canvas buffer to the screen so SDL letterboxes
  internally), keeping mouse coords exact.
- **Mobile / tablet mode (DONE 2026-06-09; engine patch `0007` + `web/shell.html`).** The shell
  OWNS touch input: it maps the screen point → logical 800×600 (rotation- and letterbox-aware) and
  injects via `web_pointer_move/_button`, `web_scroll_gesture/_end`, `web_key_press` (all `#ifdef
  __EMSCRIPTEN__` in `OSYS.cpp`, `EMSCRIPTEN_KEEPALIVE`+ccall, calling the same `Mouse` methods the
  SDL pump uses). `OVGA.cpp` sets `SDL_HINT_TOUCH_MOUSE_EVENTS/MOUSE_TOUCH_EVENTS=0` so taps don't
  double-fire. Gestures: tap=LMB, long-press 400ms=RMB, 1-finger drag=box-select, 2-finger
  drag=scroll. Auto-rotate in portrait + a `#rotbtn` override; `#menubtn` sends ESC. All gated on a
  `body.mobile` latch (`pointer:coarse` / first touch) → **zero desktop impact**.
- **DO LATER — on-screen hotkey palette (investigated 2026-06-09, NOT built).** Idea: tappable
  buttons firing 7kaa hotkeys via `web_key_press(sdlKeysym)` (goto-king/general, object next/prev,
  map-mode cycle, save/load, options…). **Blocker:** those are all `KEYEVENT_*` (enum
  `include/OMOUSE.h:47`), and `KEYEVENT_*` get bound ONLY by `bindkey = KEYEVENT_X,<key>` lines in
  `config.txt` — the single `mouse.bind_key()` call (`ConfigAdv.cpp:298`, via `set("bindkey",…)` /
  `read_key()` ~`:569`). `config.txt` loads from `SKCONFIG` (`/saves`) in `ConfigAdv::init`→`load`
  (`ConfigAdv.cpp:145`), is **optional**, and the web build ships none → `reset()` binds nothing →
  **no default in-game hotkeys** (true on desktop web too). The only hardcoded keys
  (`OVGA.cpp:516–557`) are Alt+Enter/F4/Tab + Ctrl+G/M — system-level, useless for gameplay. ESC
  works because it's handled directly (that's what `#menubtn` uses). To ship a palette you must
  ALSO ship a default keymap: write a `config.txt` to `/saves` on first boot (only if absent) with
  `bindkey` lines, then point the buttons at those keysyms (`add_key_event` sets `scan_code` to the
  keysym; `is_key_event(KeyEventType)`/`ISKEY` matches it against the bound key — cf.
  `OGAMMAIN.cpp:305` `scan_code=='r'`). **Caveat:** the `Mouse::bind_key`/`get_key_code`
  *definitions* weren't found in `src/` (only declared `OMOUSE.h:302–304`, called in
  `ConfigAdv.cpp`) — pin the `bindkey` value-string format before writing `config.txt`. Skipped:
  the tablet build is fully playable via gestures + the ESC button, those actions are reachable by
  tapping in-game UI, and enabling default hotkeys is a behavior change needing sign-off.

## Engine module map (`src/engine/src`, `O*` = "object" classes)

| Area | Files |
|------|-------|
| Entry point (`main`) | `AM.cpp` |
| System & main loop (`Sys`) | `OSYS*.cpp` |
| Top-level game flow (`Game`) | `OGAME.cpp` |
| **Main menu / front-end screens** | `OGAMMAIN.cpp` (main menu), `OGAMESET.cpp` (settings), `OGAMSING.cpp` (single-player setup), `OGAMSCEN.cpp`/`OGAMSCE2.cpp` (scenarios), `OGAMHALL.cpp` (hall of fame), `OGAMENCY.cpp` (encyclopedia), `OGAMCRED.cpp` (credits), `OOPTMENU.cpp` (options), `OINGMENU.cpp` (in-game menu) |
| Rendering / VGA (SDL2) | `OVGA*.cpp`, `vgautil*.cpp`; blitters `imgfun/generic/*.cpp` (x86 asm in `imgfun/x86/` is unused) |
| Resource DBs (`.RES`) | `ORES.cpp`, `ORESDB.cpp`, `ORESX.cpp`, `ORAWRES.cpp`, `OIMGRES.cpp`, `OSPRTRES.cpp` |
| Fonts | `OFONT.cpp` |
| Mouse / cursor | `OMOUSE.cpp`, `OMOUSECR.cpp` |
| UI widgets | `OBUTTON.cpp`, `OBUTT3D.cpp`, `OBUTTCUS.cpp`, `OBOX.cpp`, `OSLIDCUS.cpp`, `OVBROWSE.cpp` |
| Audio | `OMUSIC.cpp`, `OSE.cpp`, backend `openal/` |
| Units | `OUNIT*.cpp`, `OU_*.cpp` |
| Firms / buildings | `OFIRM*.cpp`, `OF_*.cpp` |
| Towns | `OTOWN*.cpp` |
| Nations | `ONATIONA.cpp`, `ONATIONB.cpp` |
| World / map | `OWORLD*.cpp`, `OGENMAP.cpp`, `OREGION*.cpp`, `OTERRAIN.cpp` |
| AI | `OAI_*.cpp` |
| Spy / rebel | `OSPY*.cpp`, `OREBEL.cpp` |
| Save / load | `OGFILE*.cpp`, `OSaveGame*.cpp` |
| Networking (disabled) | `enet/`, `curl/`, `OANLINE.cpp`, `OREMOTE*.cpp`, `OMP_CRC.cpp` |
| Config / cmdline | `OCONFIG.cpp`, `ConfigAdv.cpp`, `CmdLine.cpp` |

## Status

- **M1 — DONE** (2026-06-08). The engine compiles to WASM and boots in-browser to the
  fully-rendered, interactive title/main menu. Evidence: `docs/m1-main-menu.png`.
  Build: `2.5MB 7kaa.wasm`, `295KB 7kaa.js`, `101MB 7kaa.data` (all assets preloaded).
  Run: `cd build && python3 -m http.server 8000` → http://localhost:8000/7kaa.html
  (or just run `scripts/build.sh` from scratch).
- **Only one source change was needed** to compile: the `LC_MESSAGES` portability fix
  in `src/engine/src/LocaleRes.cpp` (the predicted x86-asm patches turned out unnecessary
  — both asm blocks are already wrapped in `#ifndef USE_ASM`). Note: the "Multiplayer"
  entry still appears on the menu even with `--disable-multiplayer`; selecting it will
  not work until M4 (networking bridge).

## Roadmap

- **M1** — compile to WASM, boot to title/main menu in-browser. ✅ done.
- **M2** — start a skirmish; render the world map (terrain, buildings, units) + input.
  ✅ done — and it confirmed the *whole single-player game* runs (map gen, town/units,
  resource bar, minimap, fog of war, selection all work). See `docs/m2-*.png`.

Because the entire engine is compiled, what remains is **productionization + parity QA**,
not building screens:

- **M3 — Harden single-player.** Mostly done:
  - ✅ **Saves persist** — `web/shell.html` sets `ENV.SKCONFIG=/saves`, mounts **IDBFS**
    there, `syncfs(true)` on boot (gated by a run dependency) and flushes `syncfs(false)`
    every 5s + on tab-hide. Verified: a file written to `/saves` survives a full reload.
    Needs `-lidbfs.js` (set in `build.sh`).
  - ✅ **Audio** — OpenAL→WebAudio works; the context starts `suspended` and flips to
    `running` on the first user click (no OpenAL errors). **Music now bundled** (2026-06-09):
    the free `7kaa-music-2.15` package (10 PCM WAVs, ~49MB; not GPL but redistributable,
    from 7kfans) is extracted to `src/engine/data/MUSIC/` and packaged into `extras.data`.
    `Music::play` → `audio.play_long_wav` (already implemented) plays them once `dir_music`
    is detected (see the rescan gotcha below).
  - ✅ **Input** — mouse (menu nav, unit/town selection, edge-scroll) and keyboard
    (arrow-scroll) both verified in-browser; right-click commands share the same path.
  - Remaining: deep-play QA (combat, economy, diplomacy, AI over a long game, FPS),
    optional music package, refine cursor.
- **M4 — Productionize.** ✅ Asset split done: `build.sh` now preloads only the core
  (RESOURCE/IMAGE/SPRITE/SOUND → `7kaa.data` ~43MB / ~22MB gzip / ~18MB brotli) and
  packages the optional content (encyclopedia/scenarios/tutorial → `extras.data` ~57MB)
  separately; `web/shell.html` loads `extras.js` in the background via
  `onRuntimeInitialized` so the start-to-play download is small but those screens still
  work after a moment. Verified: core boots, `extras.data` fetches in the background and
  mounts `/data/ENCYC`. Remaining M4: deploy off localhost (host gzips/brotlis the
  `.data` automatically), loading screen, responsive canvas, touch. Needs
  `-sFORCE_FILESYSTEM=1` (already set) for the separate package to load.
- **M5 — Multiplayer.** Bridge enet → web (browsers have no UDP). **Design done** (ultracode
  workflow) — full plan in `docs/multiplayer-plan.md`. Decision: **WebSocket-relay**, reimplement
  the `MultiPlayer` wrapper as `src/ws/multiplayer.cpp` (link instead of enet), with a small Node
  `ws` relay that is also the lobby. Scope: **wasm↔wasm only** (keep `FLAG_UNKNOWN_BUILD` so the
  engine refuses mixed joins). Progress:
  - ✅ **Relay server done + tested** — `relay/relay.js` (`cd relay && npm start`, ws://localhost:8090).
    Lobby + star router: room-by-code, host=id1/clients 2–7, in-order 1-in/1-out (no coalescing),
    synthetic `peer_connect`/`peer_disconnect`, heartbeat declares dead at 6s (< engine's ~20s
    AI-takeover). **Wire protocol (relay ↔ C-side glue) is locked:** TEXT/JSON control frames
    (`create`/`join`/`joined`/`peer_connect`/`peer_disconnect`) + BINARY game frames
    (`[dstId:u32 LE][payload]` in → re-framed `[srcId:u32 LE][payload]` out; dst 0 = broadcast).
  - ✅ **C++ transport done + runtime-verified (2026-06-09).** Built and confirmed working across two
    browser tabs against the local relay. What was added:
    - `configure.ac`: `--enable-websocket` → `USE_WS_MP`; the 387/enet auto-downgrade now only gates the
      *native* path, so `--enable-multiplayer` stays on under wasm. `HAVE_KNOWN_BUILD` left **undefined**
      (so `FLAG_UNKNOWN_BUILD` stays set → lobby refuses wasm↔native joins). `src/ws/Makefile` added.
    - `include/mp_address.h` (new): turns `ENetAddress` from a `void*` stub into a fixed 8-byte POD
      `{uint32 host; uint16 port; uint16 reserved0}` (serializes identically across wasm clients inside
      `MpStructAcceptNewPlayer`). `session_desc.h`/`player_desc.h` now include it.
    - `src/ws/multiplayer.cpp` (new) + `src/ws/Makefile.am`: the whole `MultiPlayer` API (~25 methods) over
      `emscripten/websocket.h`, **pure C, no custom JS-library**. Ordered event FIFO filled by the 4 WS
      callbacks (onopen sends the create/join control frame; onmessage parses TEXT control JSON + BINARY
      `[srcId][payload]`; onclose synthesizes DISCONNECTs), drained by `receive()` into enet's exact
      `(from/size/sysMsgCount)` contract. `send()` frames `[dstId:u32 LE][payload]`; the relay fans out.
      Relay-assigned id == engine player id (the id-coincidence invariant). `game_starting`/`poll_sessions`/
      `poll_players`/`set_service_provider` are no-ops. `src/Makefile.am` links `./ws/libmultiplayer_ws.a`
      + `-lwebsocket.js` under `USE_WS_MP`; `build.sh` flips the configure flags + archive + adds `-lwebsocket.js`.
    - Relay URL/room wiring needs **zero functional OGAMEMP change**: host's room code = sanitized game name
      (via `create_session`); guest types `ws://host:port#CODE`/`#CODE`/`CODE` in the Enter-Address box
      (parsed by `init_lobbied`); default relay from `getenv("KAA_RELAY")`, set by a one-line `web/shell.html`
      preRun hook (overridable via `#relay=` hash / `localStorage.kaa_relay`).
  - ✅ **Verified (two-tab + relay log):** host **Create** → relay `player 1 (…) create`; guest **Join** via
    Enter-Address `NEWPLAYER` → relay `player 2 … join`; **both lobbies show 2 players** (id assignment,
    `auth_player`, send/receive, player pool all correct); guest tab closed → relay `player 2 left` →
    host drops back to 1 player (the disconnect/liveness path that drives in-game AI-takeover).
  - ⏭ **Remaining = manual two-window gameplay** (a single headless browser can't run lockstep across a
    throttled background tab): Start the game and confirm identical map seed + commands propagate ~8 frames;
    deep-CRC determinism soak (`SYNC2.SYS` / `config_adv.remote_compare_object_crc`, zero `MSG_COMPARE_CRC`
    desyncs); in-game nation→`NATION_AI` takeover ~20s after a player drops (`OSYS.cpp:1418`).
    To test: `cd relay && npm start`; `scripts/build.sh`; serve `build/`; open in **two real browser windows**,
    host Create a game (its name is the room code), guest Multiplayer→New Game→Enter Address→type that code→Join.

**Multi-agent (ultracode):** worth it before M2 to fan agents across modules and build
a deeper structural map, and for M3/M4 mechanical sweeps. Overkill for M1's single
build-and-iterate loop. Token-heavy; needs explicit opt-in each run.
