#!/usr/bin/env python3
"""Reproducible single-player web build without system autotools dependencies."""
import concurrent.futures,os,pathlib,re,subprocess,sys,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
out=root/'build';out.mkdir(exist_ok=True)
obj=root/'build/objects';obj.mkdir(exist_ok=True)
em=root/'.toolchain/emsdk/upstream/emscripten'
flags=['-std=c++11','-fsigned-char','-O2','-sUSE_SDL=2','-I'+str(root/'src/engine/include'),'-include',str(root/'src/build-tools/web-config.h'),'-Wno-deprecated-register','-Wno-constant-conversion','-Wno-unused-command-line-argument']
text=(root/'src/engine/src/Makefile.am').read_text().split('7kaa_SOURCES =',1)[1].split('AM_CPPFLAGS',1)[0]
sources=[root/'src/engine/src'/s for s in re.findall(r'[A-Za-z_0-9]+\.cpp',text)]
sources += [*sorted((root/'src/engine/src/imgfun/generic').glob('*.cpp')),*sorted((root/'src/engine/src/openal').glob('*.cpp')),root/'src/engine/src/enet/multiplayer.cpp']
header_stamp=max(p.stat().st_mtime for p in (root/'src/engine/include').rglob('*.h'))
flag_stamp=hashlib.sha256(repr(flags).encode()).hexdigest()
flag_file=obj/'.build-flags'
if not flag_file.exists() or flag_file.read_text()!=flag_stamp:
 for stale in obj.glob('*.o'):stale.unlink()
 flag_file.write_text(flag_stamp)
def compile(src):
 target=obj/(str(src.relative_to(root/'src/engine')).replace('/','_')+'.o')
 if not target.exists() or target.stat().st_mtime<max(src.stat().st_mtime,(root/'src/build-tools/web-config.h').stat().st_mtime,header_stamp):
  p=subprocess.run([str(em/'em++'),*flags,'-c',str(src),'-o',str(target)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
  if p.returncode:raise RuntimeError(str(src)+'\n'+p.stdout)
 return str(target)
# Prime the SDL port/cache once before parallel compiles.
objects=[compile(sources[0])];print('SDL ready; compiling',len(sources),'source files',flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for i,o in enumerate(pool.map(compile,sources[1:]),2):
  objects.append(o)
  if i%50==0:print('Compiled',i,'/',len(sources),flush=True)
args=[str(em/'em++'),*objects,'-fsigned-char','-O2','-sUSE_SDL=2','-lopenal','-lidbfs.js','-sASYNCIFY','-sALLOW_MEMORY_GROWTH=1','-sINITIAL_MEMORY=268435456','-sSTACK_SIZE=8MB','-sASSERTIONS=1','-sEXIT_RUNTIME=0','-sFORCE_FILESYSTEM=1','-sEXPORTED_RUNTIME_METHODS=ccall','--shell-file',str(root/'web/shell.html')]
for name in ['RESOURCE','IMAGE','SPRITE','SOUND']:args+=['--preload-file',str(root/'src/engine/data'/name)+'@/data/'+name]
args+=['-o',str(out/'7kaa.html')]
print('Linking WebAssembly',flush=True);subprocess.run(args,check=True)
# Emscripten owns the main script tag generated from {{{ SCRIPT }}}. Version it
# after linking for the same cache-safe behavior as the other runtime assets.
html_path=out/'7kaa.html'
html=html_path.read_text().replace('src="7kaa.js"','src="7kaa.js?v=20261101-3"').replace('src=7kaa.js','src="7kaa.js?v=20261101-3"')
html_path.write_text(html)
args=[sys.executable,str(em/'tools/file_packager.py'),str(out/'extras.data'),'--preload']
for name in ['ENCYC','ENCYC2','SCENARIO','SCENARI2','TUTORIAL']:
 path=root/'src/engine/data'/name
 if path.exists():args += [str(path)+'@/data/'+name]
args += ['--js-output='+str(out/'extras.js')]
subprocess.run(args,check=True)
print('Built',out/'7kaa.html',flush=True)
import shutil
for name in ['siege-pages.js','siege-hud.js','siege-presentation.js','siege-modern.css','siege-core.js','new-game-fields.json','encyclopedia.json']:
 shutil.copy2(root/'web'/name,out/name)
shutil.copytree(root/'web/gallery',out/'gallery',dirs_exist_ok=True)
