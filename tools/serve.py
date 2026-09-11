"""A static server for developing the game, which is python -m http.server with two differences.

    python tools/serve.py            # http://localhost:8731
    python tools/serve.py 9000
    python tools/serve.py 9000 dist/web   # the build that goes to itch, not the working tree

It sends `Cache-Control: no-store`, because the game is thirty classic scripts and a browser will
happily keep serving yesterday's copy of one of them from its heuristic cache while you wonder why
your change did nothing.

And it is threaded. A single-threaded server plus one browser holding a keep-alive connection is a
server that has stopped answering, which looks exactly like a caching problem and wastes an hour.

Nothing here is needed to play the game; index.html opens from disk.
"""

import functools
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "404" in (fmt % args):
            super().log_message(fmt, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8731
    root = os.path.join(ROOT, sys.argv[2]) if len(sys.argv) > 2 else ROOT
    handler = functools.partial(NoCache, directory=root)
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    with http.server.ThreadingHTTPServer(("", port), handler) as httpd:
        print("Please Remain Seated on http://localhost:%d  (no-store; ctrl-c to stop)" % port)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
