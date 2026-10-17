#!/usr/bin/env python3
"""Reproducible single-player web build without system autotools dependencies."""
import concurrent.futures,os,pathlib,re,subprocess,sys
root=pathlib.Path(__file__).resolve().parent
out=root/'build';out.mkdir(exist_ok=True)
obj=root/'objects';obj.mkdir(exist_ok=True)
em=root/'emsdk/upstream/emscripten'
flags=['-std=c++11','-fsigned-char','-O2','-sUSE_SDL=2','-I'+str(root/'upstream/include'),'-include',str(root/'build-tools/web-config.h'),'-Wno-deprecated-register','-Wno-constant-conversion','-Wno-unused-command-line-argument']
text=(root/'upstream/src/Makefile.am').read_text().split('7kaa_SOURCES =',1)[1].split('AM_CPPFLAGS',1)[0]
sources=[root/'upstream/src'/s for s in re.findall(r'[A-Za-z_0-9]+\.cpp',text)]
sources += [*sorted((root/'upstream/src/imgfun/generic').glob('*.cpp')),*sorted((root/'upstream/src/openal').glob('*.cpp')),root/'upstream/src/enet/multiplayer.cpp']
def compile(src):
 target=obj/(str(src.relative_to(root/'upstream')).replace('/','_')+'.o')
 if not target.exists() or target.stat().st_mtime<max(src.stat().st_mtime,(root/'build-tools/web-config.h').stat().st_mtime):
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
for name in ['RESOURCE','IMAGE','SPRITE','SOUND']:args+=['--preload-file',str(root/'upstream/data'/name)+'@/data/'+name]
args+=['-o',str(out/'7kaa.html')]
print('Linking WebAssembly',flush=True);subprocess.run(args,check=True)
args=[sys.executable,str(em/'tools/file_packager.py'),str(out/'extras.data'),'--preload']
for name in ['ENCYC','ENCYC2','SCENARIO','SCENARI2','TUTORIAL','MUSIC']:
 path=root/'upstream/data'/name
 if path.exists():args += [str(path)+'@/data/'+name]
args += ['--js-output='+str(out/'extras.js')]
subprocess.run(args,check=True)
print('Built',out/'7kaa.html',flush=True)
