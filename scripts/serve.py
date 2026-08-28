#!/usr/bin/env python3
"""Local dev server: plain http.server plus a no-store header, so edited CSS
and JS always arrive fresh instead of being heuristically cached.

    python3 scripts/serve.py 8899
"""

import http.server
import pathlib
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8899
    root = pathlib.Path(__file__).resolve().parent.parent
    import functools
    handler = functools.partial(NoCacheHandler, directory=str(root))
    print(f"Serving {root} on http://localhost:{port} (no-store)")
    http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
