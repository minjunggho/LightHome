from __future__ import annotations

from backend.app.compat import RecordSinkAdapter, SyncStateStoreAdapter
from backend.app.demo_data import DEMO_PATHS, load_all_contract_demos
from backend.app.state import DictStateStore


class FakeLogger:
    def __init__(self) -> None:
        self.calls: list[tuple[str, int, dict]] = []

    def log_classification(
        self, conversation_id: str, turn: int, data: dict
    ) -> None:
        self.calls.append((conversation_id, turn, data))


def test_sync_state_store_adapter_matches_frozen_contract() -> None:
    adapter = SyncStateStoreAdapter(DictStateStore())

    adapter.set(
        "demo-session",
        {
            "posterior": {"trust": 0.7, "isolation": 0.3},
            "turn": 1,
            "tallies": {},
            "embeddings": [],
        },
    )

    state = adapter.get("demo-session")
    assert state is not None
    assert state["posterior"]["trust"] == 0.7

    adapter.reset("demo-session")
    assert adapter.get("demo-session") is None


def test_record_sink_adapter_matches_frozen_contract() -> None:
    store = DictStateStore()
    fake_logger = FakeLogger()
    sink = RecordSinkAdapter(store, logger_=fake_logger)

    sink.emit({"session_id": "demo-session", "turn": 2, "alert": {"level": "none"}})
    sink.emit({"session_id": "demo-session", "turn": 1, "alert": {"level": "watch"}})

    transcript = sink.transcript("demo-session")
    assert [record["turn"] for record in transcript] == [1, 2]
    assert len(fake_logger.calls) == 2
    assert fake_logger.calls[0][0] == "demo-session"


def test_demo_data_normalizes_to_frozen_contract_shape() -> None:
    demos = load_all_contract_demos()
    assert set(demos) == set(DEMO_PATHS)

    grooming = demos["grooming"]
    assert grooming["conversation_id"] == "grooming_arc_01"
    assert grooming["label"] == "grooming"
    assert grooming["messages"][0]["turn"] == 0
    assert grooming["messages"][0]["speaker"] == "A"
    assert "t_offset_sec" in grooming["messages"][0]
    assert "timestamp_offset_seconds" not in grooming["messages"][0]

    friendly = demos["friendly_adult"]
    assert friendly["label"] == "friendly_adult"
    assert {message["speaker"] for message in friendly["messages"]} == {"A", "B"}

    teen = demos["teen_relationship"]
    assert teen["label"] == "teen_relationship"
    assert {message["speaker"] for message in teen["messages"]} == {"A", "B"}
