# Maintaining the 7kaa web port across upstream releases

This project is the original **Seven Kingdoms: Ancient Adversaries** engine
(`upstream/`, a git clone of [the3dfxdude/7kaa](https://github.com/the3dfxdude/7kaa))
compiled to WebAssembly, plus our own browser glue at the repo root. This doc explains
how our engine changes are stored and how to re-apply them when a new version ships.

## The model

`upstream/` **is a git clone**, so `git diff` *is* the list of everything we changed — we
never hand-diff. Our engine changes live as a small, **feature-grouped patchset**:

- **Branch `web-port`** in `upstream/` — five commits on top of the cloned base
  (`14e6fdf`, v2.15.6). This is where you commit engine edits.
- **`patches/*.patch`** at the repo root — the same commits exported with
  `git format-patch`. **These are the durable, portable artifact**: they apply onto *any*
  checkout of 7kaa, so they survive even if the `upstream/` clone is deleted/re-cloned.

Everything **outside** `upstream/` — `build.sh`, `web/`, `relay/`, `docs/`,
`MAINTAINING.md`, `patches/` — is our own infrastructure. It is **version-independent**:
it's kept as-is across upstream releases (only touched if upstream changes its build
layout). It is **not** part of the patchset.

Two different diffs, two different jobs:
- **Our patchset** (`patches/`) = what we *carry forward* onto every new version.
- **Upstream's old→new diff** = only a *conflict preview*; you never apply it. `git am
  --3way` does the 3-way merge for you and flags only real overlaps.

## Keeping the patchset current (do this every session)

The patches go stale the moment anyone edits `upstream/` again. So, **whenever you change
a file under `upstream/`** (a fix, feature, or tweak), before ending the session:

1. **Commit it to `web-port`.** Either add a new commit, or fold it into the matching
   feature commit (`git commit --fixup=<hash>` then `git rebase -i --autosquash <base>`).
   Keep messages scoped to one feature.
2. **Re-export the patches:** `web/tools/refresh-patches.sh` (re-runs `git format-patch`
   into `patches/`, replacing the old set). It warns if you have uncommitted engine edits.

Net rule: **`patches/` must always mirror the `web-port` branch, and the `web-port` branch
must always mirror the working tree.** A clean `git -C upstream status` + a fresh
`refresh-patches.sh` run = you're good.

## What's in the patchset (inventory)

| Patch | Feature | Key files | Guard | Conflict risk on rebase |
|-------|---------|-----------|-------|----|
| 0001 | chore: ignore artifacts/music | `.gitignore` | — | none |
| 0002 | LC_MESSAGES portability | `src/LocaleRes.cpp` | — | trivial; upstreamable |
| 0003 | WebSocket multiplayer (wasm↔wasm) | `configure.ac`, `src/Makefile.am`, `src/ws/` (new), `include/mp_address.h` (new), `player_desc.h`, `session_desc.h`, `OGAME.h`, `src/OGAMEMP.cpp` | `USE_WS_MP` / `--enable-websocket` | **highest** — if upstream reworks multiplayer or the build |
| 0004 | input: pointer-leave + wheel-scroll | `include/OMOUSE.h`, `src/OVGA.cpp`, `src/OWORLD.cpp`, `src/OVBROWSE.cpp` | none (general fix) | low; **upstreamable** |
| 0005 | web Emscripten integration (lazy-load re-detect, Donate, fullscreen) | `src/OSYS.cpp`, `include/OSYS.h`, `src/OGAMMAIN.cpp`, `src/OINGMENU.cpp`, `src/OGAMSCEN.cpp`, `src/OTUTOR.cpp`, `src/donate_img.h` (new) | almost all `#ifdef __EMSCRIPTEN__` | very low — adds guarded code, rarely touches existing lines |

Notes:
- `data/RESOURCE/I_IF.RES` is **unmodified** (an experimental QUIT→DONATE art edit was
  reverted), so the patchset is all-text — no binary asset diffs to carry.
- `src/donate_img.h` is generated; regenerate with `web/tools/gen_donate_img.py`.
- Music (`data/MUSIC/`, ~49 MB) is **not** in git or the patchset — it's re-fetchable.

## Backporting to a new release

When the fans ship a new version (e.g. 2.15.7+):

1. **Get the new source** (fresh clone avoids the current shallow clone's missing history):
   ```bash
   git clone https://github.com/the3dfxdude/7kaa.git upstream-new
   cd upstream-new && git checkout <new-tag-or-master>   # confirm version in configure.ac
   ```
2. **Re-apply our patchset** (3-way merge against upstream's changes):
   ```bash
   git am --3way /path/to/repo/patches/*.patch
   ```
   Clean wherever our changes don't overlap upstream's (patch 0005's `__EMSCRIPTEN__`
   batch is ~always clean).
3. **Resolve conflicts** only where `git am` stops, guided by the table above. Highest
   risk: patch 0003 (multiplayer/build). After fixing: `git add -u && git am --continue`.
4. **Re-fetch the music** (see below).
5. **Keep the root infra as-is.** `build.sh`, `web/`, `relay/` are version-independent.
   Only adjust if the engine's object/module layout changed (e.g. `build.sh`'s object-file
   link list, or `src/Makefile.am` integration of `src/ws/`).
6. **Build + verify:** `./build.sh`; serve `build/`; run the QA pass — boot to menu;
   encyclopedia/scenario/tutorial work after extras load; mouse-wheel + edge-scroll;
   Donate link + Quit→fullscreen; two-window multiplayer create/join via `relay/`.
7. **Re-base our branch and re-export** for next time: point `web-port` at the new base,
   set `BASE` in `web/tools/refresh-patches.sh` to the new base commit, and run it.

### Re-fetch the music
```bash
curl -L -o /tmp/7kaa-music.zip https://www.7kfans.com/downloads/7kaa-music-2.15.zip
unzip -j /tmp/7kaa-music.zip '7kaa-music/MUSIC/*' -d upstream/data/MUSIC/
```
(Uppercase filenames: `NORMAN.WAV`, `WAR.WAV`, …; `build.sh` preloads `data/MUSIC` into
the `extras.data` bundle.)

## Shrinking the patchset over time (optional)

Patches **0004** (general input fixes) and **0002** (LC_MESSAGES) are not web-specific and
fix real upstream issues. Submitting them as PRs to the3dfxdude/7kaa would let upstream
carry them, so they drop out of our patchset and can never conflict. The
`#ifdef __EMSCRIPTEN__` parts of **0005** are also inert on native and could be upstreamed.

## Caveats
- The current `upstream/` clone is **shallow** (depth 1, no tags). Backporting uses a
  **fresh clone**, so this doesn't matter — but don't rely on rebasing inside this clone
  without `git fetch --unshallow` first.
- Build artifacts (`*.wasm`, `*.o`, `*.a`, `*.data`) and `data/MUSIC/` are gitignored in
  `upstream/.gitignore`; never commit them.
