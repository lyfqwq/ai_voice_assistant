import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: python mock_model.py <port>")

    port = int(sys.argv[1])

    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def do_POST(self) -> None:  # noqa: N802
            if self.path != "/v1/chat/completions":
                self.send_response(404)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return

            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            payload = json.loads(raw.decode("utf-8") or "{}")
            messages = payload.get("messages", [])
            user_text = ""
            for message in reversed(messages):
                if message.get("role") == "user":
                    user_text = message.get("content", "")
                    break

            answer = (
                "Let's practice this topic step by step: "
                + user_text[:40]
                + ". I will give you a clear structure and a next action."
            )

            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "close")
            self.end_headers()

            for chunk in [answer[:18], answer[18:42], answer[42:]]:
                data = json.dumps(
                    {"choices": [{"delta": {"content": chunk}}]},
                    ensure_ascii=False,
                )
                self.wfile.write(f"data: {data}\n\n".encode("utf-8"))
                self.wfile.flush()

            self.wfile.write(b"data: [DONE]\n\n")
            self.wfile.flush()

        def log_message(self, format, *args):  # type: ignore[no-untyped-def]
            return

    HTTPServer(("127.0.0.1", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
