"""In-memory RecordSink (Contract E) — mock scaffolding for the live demo.

The live-iMessage demo needs a READ path: the adapter POSTs records (triggered by
judges' texts) and the dashboard reads them back to render. This is a trivial
RecordSink that satisfies Contract E (`emit` / `transcript`) so the read/stream
endpoints work today against the mock.

Person 3 replaces this with the Redis-backed RecordSink at hour 8 — the
`/session/.../stream` and `/transcript` endpoints don't change.
"""

from __future__ import annotations

from collections import defaultdict


class InMemoryRecordSink:
    """Contract E: emit(record) / transcript(session_id). Demo-only."""

    def __init__(self) -> None:
        self._by_session: dict[str, list[dict]] = defaultdict(list)

    def emit(self, record: dict) -> None:
        self._by_session[record["session_id"]].append(record)

    def transcript(self, session_id: str) -> list[dict]:
        return list(self._by_session.get(session_id, []))

    # --- helpers the demo read endpoints use (not part of Contract E) -------

    def latest(self, session_id: str) -> dict | None:
        records = self._by_session.get(session_id)
        return records[-1] if records else None

    def reset(self, session_id: str) -> None:
        self._by_session.pop(session_id, None)

    def sessions(self) -> list[dict]:
        """Summary per active session — lets the dashboard pick which judge's
        thread to follow, or auto-follow the most recently active one."""
        out = []
        for sid, records in self._by_session.items():
            if not records:
                continue
            last = records[-1]
            out.append(
                {
                    "session_id": sid,
                    "turns": len(records),
                    "last_turn": last["turn"],
                    "alert_level": last["alert"]["level"],
                    "updated": last["timestamp"],
                }
            )
        # Most recently updated first.
        out.sort(key=lambda s: s["updated"], reverse=True)
        return out
