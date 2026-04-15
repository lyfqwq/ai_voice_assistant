import asyncio
import sys
from pathlib import Path

from aiosmtpd.controller import Controller


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: python mock_smtp.py <port> <inbox_path>")

    port = int(sys.argv[1])
    inbox = Path(sys.argv[2])

    class Handler:
        async def handle_DATA(self, server, session, envelope):  # type: ignore[no-untyped-def]
            inbox.write_text(
                envelope.content.decode("utf-8", errors="replace"),
                encoding="utf-8",
            )
            return "250 Message accepted for delivery"

    controller = Controller(Handler(), hostname="127.0.0.1", port=port)
    controller.start()
    asyncio.get_event_loop().run_forever()


if __name__ == "__main__":
    main()
