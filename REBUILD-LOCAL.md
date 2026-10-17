# Rebuild the The Great Siege single-player edition

Requirements: Python 3.10+, git, and an internet connection for the official Emscripten SDK/SDL port. No system autotools are needed.

This archive contains `upstream/` (the original engine plus nine browser patches), `web/shell.html`, `build-tools/web-config.h`, `build-local.py`, and `patches/`.

1. In the extracted source root, clone the official SDK:
   `git clone https://github.com/emscripten-core/emsdk.git emsdk`
2. Run `python3 emsdk/emsdk.py install 4.0.10` and `python3 emsdk/emsdk.py activate 4.0.10`.
3. In bash, run `source emsdk/emsdk_env.sh`.
4. The renamed edition omits the original soundtrack; its separate license permits use specifically with Seven Kingdoms. Sound effects remain included.
5. Run `python3 build-local.py`. The first build downloads SDL into the workspace SDK cache. It builds the exact source list from the engine's Makefile.am with the portable image backend, OpenAL and the native multiplayer stubs. The config explicitly disables multiplayer and NLS; no engine gameplay rules are changed.
6. Serve `build/` with `python3 -m http.server 8765 --bind 127.0.0.1 --directory build`, then open http://127.0.0.1:8765/7kaa.html.

The deployable entrypoint is `build/7kaa.html` renamed to `index.html`; the five adjacent JS/WASM/data files must travel with it. Include engine, soundtrack and runtime licenses and this exact corresponding source when distributing the website. The downloaded Emscripten compiler is reproducible from the official SDK version above and is not bundled in this archive.

Engine base: 14e6fdfba9481af4dc3a54722614a608776e20bc (2.15.6).
Port base: fea2e4614a59e14ba1898398e4d8b352f664f1cd.
