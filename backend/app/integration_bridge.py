"""Bridges Person 1's contracts (D/E) to Person 3's implementations.

Person 1 codes against the sync protocols in `protocols.py`
(`StateStore.get/set/reset`, `RecordSink.emit/transcript`). Person 3 shipped a
DIFFERENT shape in `state.py` / `observability.py`:

  - StateStore is async with conversation_id-keyed methods
    (save_conversation_state / get_conversation_state / append_turn /
     get_all_turns / delete_conversation)
  - Observability is `ArizeLogger.log_classification(conversation_id, turn, data)`
    + `init_sentry()`, and the transcript lives in the StateStore's turn list.

These adapters absorb that drift so neither lane rewrites core code: the pipeline
keeps calling the clean Contract D/E methods; the adapters translate to Person 3's
async store + Arize logger. Async is driven from sync callers via a dedicated
background event loop (FastAPI runs sync endpoints in a worker thread, so there is
no running loop to clash with).
"""

from __future__ import annotations

import asyncio
import logging
import threading
from typing import Any

from .observability import capture_alert, capture_degradation
from .protocols import SessionState

logger = logging.getLogger(__name__)


# --- run async store methods from sync code --------------------------------


class _LoopRunner:
    """A single background event loop so sync code can await Person 3's async
    store (incl. real async Redis I/O) without spinning up a loop per call."""

    def __init__(self) -> None:
        self._loop: asyncio.AbstractEventLoop | None = None
        self._lock = threading.Lock()

    def _ensure(self) -> asyncio.AbstractEventLoop:
        if self._loop is None:
            with self._lock:
                if self._loop is None:
                    loop = asyncio.new_event_loop()
                    threading.Thread(target=loop.run_forever, daemon=True).start()
                    self._loop = loop
        return self._loop

    def run(self, coro: Any) -> Any:
        return asyncio.run_coroutine_threadsafe(coro, self._ensure()).result()


_runner = _LoopRunner()


def run_async(coro: Any) -> Any:
    return _runner.run(coro)


# --- Contract D adapter -----------------------------------------------------


class BridgedStateStore:
    """Implements Person 1's sync StateStore over Person 3's async store.
    `session_id` maps directly to Person 3's `conversation_id`."""

    def __init__(self, async_store: Any) -> None:
        self._store = async_store

    def get(self, session_id: str) -> SessionState | None:
        state = run_async(self._store.get_conversation_state(session_id))
        return state  # plain dict; matches the SessionState TypedDict shape

    def set(self, session_id: str, state: SessionState) -> None:
        run_async(self._store.save_conversation_state(session_id, dict(state)))

    def reset(self, session_id: str) -> None:
        run_async(self._store.delete_conversation(session_id))


# --- Contract E adapter -----------------------------------------------------


class BridgedRecordSink:
    """Implements Person 1's RecordSink (emit/transcript + the demo read helpers)
    over Person 3's StateStore turn-list + ArizeLogger.

    Same surface as `record_store.InMemoryRecordSink`, so `main.py` can use either
    interchangeably.
    """

    def __init__(self, async_store: Any, arize_logger: Any | None = None) -> None:
        self._store = async_store
        self._arize = arize_logger
        self._seen: set[str] = set()  # StateStore has no "list sessions" API

    def emit(self, record: dict) -> None:
        # Fire-and-forget: a logging/persistence failure must never break detection.
        sid = record["session_id"]
        self._seen.add(sid)
        if self._arize is not None:
            try:
                self._arize.log_classification(
                    conversation_id=sid, turn=record["turn"], data=record
                )
            except Exception:
                logger.exception("Arize log_classification failed for %s", sid)
        # Sentry domain events (no-op unless SENTRY_DSN is set). Same observability
        # fan-out point as Arize; structural data only, never raw_text.
        capture_alert(record)
        capture_degradation(record)
        try:
            run_async(self._store.append_turn(sid, record))
        except Exception:
            logger.exception("StateStore append_turn failed for %s", sid)

    def transcript(self, session_id: str) -> list[dict]:
        try:
            return run_async(self._store.get_all_turns(session_id))
        except Exception:
            logger.exception("StateStore get_all_turns failed for %s", session_id)
            return []

    # --- demo read helpers (parity with InMemoryRecordSink) ----------------

    def latest(self, session_id: str) -> dict | None:
        turns = self.transcript(session_id)
        return turns[-1] if turns else None

    def reset(self, session_id: str) -> None:
        self._seen.discard(session_id)
        try:
            run_async(self._store.delete_conversation(session_id))
        except Exception:
            logger.exception("StateStore delete_conversation failed for %s", session_id)

    def _known_sessions(self) -> set[str]:
        """Union of this-process emits and the store's durable session index,
        so sessions survive a server restart (not just _seen in memory)."""
        known = set(self._seen)
        lister = getattr(self._store, "list_conversations", None)
        if lister is not None:
            try:
                known.update(run_async(lister()))
            except Exception:
                logger.exception("StateStore list_conversations failed")
        return known

    def sessions(self) -> list[dict]:
        out = []
        for sid in self._known_sessions():
            last = self.latest(sid)
            if not last:
                continue
            out.append(
                {
                    "session_id": sid,
                    "turns": len(self.transcript(sid)),
                    "last_turn": last["turn"],
                    "alert_level": last["alert"]["level"],
                    "updated": last["timestamp"],
                }
            )
        out.sort(key=lambda s: s["updated"], reverse=True)
        return out
