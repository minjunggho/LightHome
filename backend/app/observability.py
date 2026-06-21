from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


logger = logging.getLogger(__name__)

LOCAL_TRACE_PATH = Path("logs/arize_traces.jsonl")

try:
    from arize.pandas.logger import Client as ArizeClient
except ImportError:
    ArizeClient = None
except Exception:
    logger.warning("Arize SDK import failed; using local JSONL fallback", exc_info=True)
    ArizeClient = None


class ArizeLogger:
    """Log classification traces to Arize when possible, otherwise JSONL."""

    def __init__(
        self, api_key: str | None = None, space_key: str | None = None
    ) -> None:
        """Initialize Arize logging or fall back to local JSONL logging."""
        self.api_key = api_key or os.getenv("ARIZE_API_KEY")
        self.space_key = (
            space_key or os.getenv("ARIZE_SPACE_KEY") or os.getenv("ARIZE_SPACE_ID")
        )
        self._client: Any | None = None

        if not self.api_key or not self.space_key:
            logger.warning("Arize keys are not configured; using local JSONL fallback")
            return

        if ArizeClient is None:
            logger.warning("Arize SDK is unavailable; using local JSONL fallback")
            return

        try:
            self._client = ArizeClient(api_key=self.api_key, space_key=self.space_key)
        except Exception:
            logger.exception("Failed to initialize Arize client; using local JSONL fallback")
            return

        # TODO: Wire this to the team's final Arize SDK logging call when the
        # package version and dataframe/schema contract are available.
        logger.warning("Arize client initialized, but local JSONL fallback remains active")

    def log_classification(
        self, conversation_id: str, turn: int, data: dict[str, Any]
    ) -> None:
        """Log a single classification decision."""
        self._log_local_jsonl(conversation_id=conversation_id, turn=turn, data=data)

    def _log_local_jsonl(
        self, conversation_id: str, turn: int, data: dict[str, Any]
    ) -> None:
        record = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "sink": "local_jsonl",
            "conversation_id": conversation_id,
            "turn": turn,
            "data": data,
        }

        try:
            LOCAL_TRACE_PATH.parent.mkdir(parents=True, exist_ok=True)
            with LOCAL_TRACE_PATH.open("a", encoding="utf-8") as trace_file:
                json.dump(record, trace_file, ensure_ascii=False)
                trace_file.write("\n")
        except Exception:
            logger.exception("Failed to write local Arize trace")


def init_sentry(dsn: str | None = None) -> None:
    """Initialize Sentry SDK. If DSN or SDK is unavailable, skip silently."""
    dsn = dsn or os.getenv("SENTRY_DSN")
    if not dsn:
        return

    try:
        import sentry_sdk
    except ImportError:
        logger.warning("Sentry DSN is configured, but sentry_sdk is not installed")
        return

    try:
        sentry_sdk.init(
            dsn=dsn,
            traces_sample_rate=1.0,
        )
    except Exception:
        logger.exception("Failed to initialize Sentry SDK")
