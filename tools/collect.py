import json
import os
import re
from http.server import BaseHTTPRequestHandler, HTTPServer

OUT = os.path.join(os.path.dirname(__file__), "..", "data", "raw")


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        data = json.loads(body)
        name = re.sub(r"[^A-Z0-9_]", "", data["symbol"].split(":")[-1].upper()) + "_" + data["res"]
        with open(os.path.join(OUT, name + ".json"), "w") as f:
            json.dump(data, f)
        self.send_response(200)
        self._cors()
        self.end_headers()
        self.wfile.write(f"ok {name} {len(data['bars'])}".encode())


HTTPServer(("127.0.0.1", 8765), Handler).serve_forever()
