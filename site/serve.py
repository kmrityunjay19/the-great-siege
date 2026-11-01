#!/usr/bin/env python3
"""Serve the game locally. No third-party Python packages required."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse, functools, urllib.request, webbrowser

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=8765)
    parser.add_argument('--open',action='store_true')
    args=parser.parse_args()
    url='http://127.0.0.1:%d/'%args.port
    class Handler(SimpleHTTPRequestHandler):
        extensions_map={**SimpleHTTPRequestHandler.extensions_map,'.wasm':'application/wasm','.data':'application/octet-stream'}
    try:
        server=ThreadingHTTPServer(('127.0.0.1',args.port),functools.partial(Handler,directory=str(Path(__file__).resolve().parent)))
    except OSError:
        try:
            with urllib.request.urlopen(url+'build-manifest.json',timeout=2) as response:
                if b'Seven Kingdoms' not in response.read():raise RuntimeError('Another application uses this port.')
            print('Game is already running at '+url)
            if args.open:webbrowser.open(url)
            return
        except Exception:
            raise SystemExit('Port %d is in use. Try: python3 serve.py --port 8766 --open'%args.port)
    print('The Great Siege is ready: '+url,flush=True)
    print('Keep this terminal open. Press Ctrl+C to stop.',flush=True)
    if args.open:webbrowser.open(url)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
if __name__=='__main__':main()
