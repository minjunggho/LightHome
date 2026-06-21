"""One-off: send a deliberate test error to Sentry to verify wiring.

Run: .venv/bin/python scripts/sentry_test.py
Safe to delete after confirming the event lands in the Sentry dashboard.
"""
from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)

import sentry_sdk

from app.observability import init_sentry


def main() -> None:
    if not init_sentry():
        raise SystemExit("Sentry did not initialize — check SENTRY_DSN in backend/.env")

    try:
        raise RuntimeError("Lighthome Sentry test error — ignore (manual verification)")
    except RuntimeError:
        event_id = sentry_sdk.capture_exception()

    sentry_sdk.flush(timeout=5)
    print(f"Sent test error to Sentry. event_id={event_id}")


if __name__ == "__main__":
    main()
