/* Single-player wasm32 configuration. Build with Emscripten 4.0.10. */
#pragma once
#define USE_POSIX 1
#define USE_SDL 1
#define USE_OPENAL 1
#define DISABLE_MULTI_PLAYER 1
#define HAVE_SETENV 1
#define HAVE_STRING_STRCASECMP 1
#define NO_MEM_CLASS 1
#define OPENAL_AL_H <AL/al.h>
#define OPENAL_ALC_H <AL/alc.h>
#define REGISTER
#define PACKAGE "7kaa"
#define PACKAGE_NAME "7kaa"
#define PACKAGE_VERSION "2.15.6"
#define PACKAGE_STRING "7kaa 2.15.6"
#define PACKAGE_DATA_DIR "/data"
#define LOCALE_DIR "/data/locale"
