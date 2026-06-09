#!/bin/bash
# Build 7kaa for the web. Compiles the engine (via autotools+emconfigure) and links
# a browser bundle with the Emscripten-specific flags. See CLAUDE.md for details.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
source "$ROOT/emsdk/emsdk_env.sh" >/dev/null 2>&1

cd "$ROOT/upstream"

# --- configure (once; reconfigures until the M5 src/ws Makefile exists) ---
# M5 re-enables multiplayer over WebSockets, which added src/ws + new configure.ac
# options. Force an autogen+reconfigure when src/ws/Makefile hasn't been generated
# yet so the new subdir/conditionals are picked up; subsequent builds skip this.
if [ ! -f Makefile ] || [ ! -f src/ws/Makefile ]; then
  rm -f configure   # force autogen to regenerate from the edited configure.ac
  [ -f configure ] || LIBTOOLIZE=glibtoolize ACLOCAL_PATH=/opt/homebrew/share/aclocal ./autogen.sh
  SDL2_CONFIG="$ROOT/build-tools/sdl2-config" OPENAL_CFLAGS="" OPENAL_LIBS="-lopenal" \
    emconfigure ./configure \
      --enable-multiplayer --enable-websocket --disable-enet --disable-curl --disable-nls
fi

# --- compile all engine objects to wasm ---
emmake make -j8

# --- link the browser bundle (the autotools link omits browser flags) ---
# Preload ONLY the core assets needed to boot + play (RESOURCE/IMAGE/SPRITE/SOUND,
# ~44MB raw / ~18MB compressed). Optional content (encyclopedia, scenarios, tutorial,
# music — ~107MB raw) is packaged separately below and streamed in the background
# after boot, so the initial download to start playing stays small. Once that bundle
# mounts, web_rescan_data_dirs() (called from shell.html) re-detects those dirs.
cd "$ROOT/upstream/src"
em++ -include "../include/config.h" -fsigned-char -O2 \
  *.o \
  ./openal/libaudio_openal.a \
  ./ws/libmultiplayer_ws.a \
  ./imgfun/generic/libimgfun_generic.a \
  -sUSE_SDL=2 -lopenal -lidbfs.js -lwebsocket.js \
  -sASYNCIFY -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=268435456 -sSTACK_SIZE=8MB \
  -sASSERTIONS=1 -sEXIT_RUNTIME=0 \
  -sFORCE_FILESYSTEM=1 \
  -sEXPORTED_RUNTIME_METHODS=ccall \
  --preload-file ../data/RESOURCE@/data/RESOURCE \
  --preload-file ../data/IMAGE@/data/IMAGE \
  --preload-file ../data/SPRITE@/data/SPRITE \
  --preload-file ../data/SOUND@/data/SOUND \
  --shell-file "$ROOT/web/shell.html" \
  -o "$ROOT/build/7kaa.html"

# --- package optional content as a separate, background-loaded bundle ---
cd "$ROOT/upstream"
"$ROOT/emsdk/upstream/emscripten/tools/file_packager" "$ROOT/build/extras.data" \
  --preload data/ENCYC@/data/ENCYC \
  --preload data/ENCYC2@/data/ENCYC2 \
  --preload data/SCENARIO@/data/SCENARIO \
  --preload data/SCENARI2@/data/SCENARI2 \
  --preload data/TUTORIAL@/data/TUTORIAL \
  --preload data/MUSIC@/data/MUSIC \
  --js-output="$ROOT/build/extras.js"

echo "Built -> $ROOT/build/7kaa.html"
ls -lh "$ROOT/build/"*.data 2>/dev/null
