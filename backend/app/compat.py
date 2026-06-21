from __future__ import annotations

import asyncio
import logging
import threading
from collections.abc import Coroutine
from typing import Any, TypeVar

from backend.app.observability import ArizeLogger
from backend.app.state import StateStore


logger = logging.getLogger(__name__)

T = TypeVar("T")


def _run_sync(coro: Coroutine[Any, Any, T]) -> T:
    """Run an async store call from the frozen synchronous contract surface."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)

    result: dict[str, T] = {}
    error: dict[str, BaseException] = {}

    def runner() -> None:
        try:
            result["value"] = asyncio.run(coro)
        except BaseException as exc:
            error["error"] = exc

    thread = threading.Thread(target=runner, daemon=True)
    thread.start()
    thread.join()

    if "error" in error:
        raise error["error"]

    return result["value"]


class SyncStateStoreAdapter:
    """Expose the frozen get/set/reset StateStore contract over an async store."""

    def __init__(self, store: StateStore) -> None:
        self._store = store

    def get(self, session_id: str) -> dict[str, Any] | None:
        """Return session state for the frozen backend contract."""
        return _run_sync(self._store.get_conversation_state(session_id))

    def set(self, session_id: str, state: dict[str, Any]) -> None:
        """Save session state for the frozen backend contract."""
        _run_sync(self._store.save_conversation_state(session_id, state))

    def reset(self, session_id: str) -> None:
        """Delete session state and transcript records."""
        _run_sync(self._store.delete_conversation(session_id))


class RecordSinkAdapter:
    """Expose the frozen emit/transcript contract over state and observability."""

    def __init__(
        self,
        store: StateStore,
        logger_: ArizeLogger | None = None,
    ) -> None:
        self._store = store
        self._logger = logger_ or ArizeLogger()

    def emit(self, record: dict[str, Any]) -> None:
        """Persist and log one DecisionRecord without raising on sink failures."""
        session_id = str(record.get("session_id") or record.get("conversation_id") or "")
        if not session_id:
            logger.warning("DecisionRecord missing session_id; using unknown session")
            session_id = "unknown"

        turn = record.get("turn", 0)
        try:
            turn_number = int(turn)
        except (TypeError, ValueError):
            turn_number = 0

        try:
            _run_sync(self._store.append_turn(session_id, dict(record)))
        except Exception:
            logger.exception("Failed to persist DecisionRecord for %s", session_id)

        try:
            self._logger.log_classification(session_id, turn_number, record)
        except Exception:
            logger.exception("Failed to log DecisionRecord for %s", session_id)

        self._capture_alert_event(record)

    def transcript(self, session_id: str) -> list[dict[str, Any]]:
        """Return stored DecisionRecords ordered by turn."""
        records = _run_sync(self._store.get_all_turns(session_id))
        return sorted(records, key=lambda record: record.get("turn", 0))

    def _capture_alert_event(self, record: dict[str, Any]) -> None:
        alert = record.get("alert")
        if not isinstance(alert, dict):
            return

        alert_fired = alert.get("fired") is True or alert.get("level") == "alert"
        if not alert_fired:
            return

        try:
            import sentry_sdk
        except ImportError:
            return

        try:
            sentry_sdk.capture_message(
                "LightHome alert fired",
                level="warning",
            )
        except Exception:
            logger.exception("Failed to capture Sentry alert event")


ContractStateStore = SyncStateStoreAdapter
ContractRecordSink = RecordSinkAdapter
