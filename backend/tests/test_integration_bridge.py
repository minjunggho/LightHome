"""Verify the bridges present Person 1's Contract D/E surface over Person 3's
async StateStore + ArizeLogger."""

from __future__ import annotations

from app.integration_bridge import BridgedRecordSink, BridgedStateStore
from app.observability import ArizeLogger
from app.protocols import SessionState
from app.state import DictStateStore


def _record(session_id: str, turn: int, level: str = "none") -> dict:
    return {
        "session_id": session_id,
        "turn": turn,
        "alert": {"level": level},
        "timestamp": f"2026-06-20T00:00:0{turn}Z",
    }


def test_state_store_bridge_roundtrip():
    store = BridgedStateStore(DictStateStore())
    assert store.get("s1") is None
    state: SessionState = {"posterior": {"trust": 1.0}, "turn": 3, "tallies": {}, "embeddings": []}
    store.set("s1", state)
    got = store.get("s1")
    assert got is not None and got["turn"] == 3
    store.reset("s1")
    assert store.get("s1") is None


def test_record_sink_bridge_emit_transcript_and_helpers():
    sink = BridgedRecordSink(DictStateStore(), ArizeLogger())  # Arize falls back to local JSONL
    assert sink.transcript("c1") == []
    sink.emit(_record("c1", 0))
    sink.emit(_record("c1", 1, "watch"))
    transcript = sink.transcript("c1")
    assert [r["turn"] for r in transcript] == [0, 1]
    assert sink.latest("c1")["alert"]["level"] == "watch"

    summaries = sink.sessions()
    assert any(s["session_id"] == "c1" and s["turns"] == 2 for s in summaries)

    sink.reset("c1")
    assert sink.transcript("c1") == []


def test_record_sink_bridge_never_raises_on_emit():
    class Boom:
        async def append_turn(self, *_a, **_k):
            raise RuntimeError("redis down")

    sink = BridgedRecordSink(Boom(), arize_logger=None)
    sink.emit(_record("c2", 0))  # must swallow the failure (fire-and-forget)
