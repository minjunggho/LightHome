"""Conversation-level acceptance — the hour-17 make-or-break case.

Replays each demo conversation end-to-end and asserts the final alert level
matches what its ground-truth label demands:

    grooming          -> reaches "alert"
    friendly_adult    -> stays "none"
    teen_relationship -> stays "none"  (the false-positive case we must win)

This SKIPS while demo/*.json are empty (Person 3 hasn't drafted them) and while
the pipeline is still the content-blind mock. It lights up automatically once the
real demo data + real pipeline land — that's the gate for hour 17.
"""

from __future__ import annotations

import json
import os
import pathlib

import pytest
from fastapi.testclient import TestClient

from app.main import app

ROOT = pathlib.Path(__file__).resolve().parents[2]
DEMO_DIR = ROOT / "demo"

EXPECTED_FINAL = {
    "grooming": "alert",
    "friendly_adult": "none",
    "teen_relationship": "none",
}

# The mock ramps purely on turn count and cannot tell grooming from friendly by
# content, so discrimination only holds once the real pipeline is wired. Set
# PIPELINE_MODE=live (hour 8+) to enforce this suite.
PIPELINE_IS_LIVE = os.environ.get("PIPELINE_MODE", "mock").lower() == "live"


def _demo_files() -> list[pathlib.Path]:
    return [p for p in sorted(DEMO_DIR.glob("*.json")) if p.stat().st_size > 0]


def _replay_final_level(client: TestClient, convo: dict) -> str:
    sid = f"acc-{convo.get('conversation_id')}"
    client.post("/session/reset", json={"session_id": sid})
    level = "none"
    for m in convo["messages"]:
        r = client.post(
            "/analyze-message?view=tns",
            json={
                "session_id": sid,
                "turn": m["turn"],
                "speaker": m["speaker"],
                "text": m["text"],
                "t_offset_sec": m.get("t_offset_sec", 0),
            },
        )
        r.raise_for_status()
        level = r.json()["alert"]["level"]
    return level


@pytest.mark.skipif(not PIPELINE_IS_LIVE, reason="real pipeline not wired (PIPELINE_MODE!=live)")
@pytest.mark.parametrize("path", _demo_files() or [pytest.param(None, marks=pytest.mark.skip(reason="no demo data yet"))])
def test_demo_conversation_reaches_expected_level(path):
    convo = json.loads(path.read_text())
    label = convo["label"]
    assert label in EXPECTED_FINAL, f"unknown label {label!r} in {path.name}"
    client = TestClient(app)
    final = _replay_final_level(client, convo)
    expected = EXPECTED_FINAL[label]
    if expected == "alert":
        assert final == "alert", f"{path.name}: grooming must reach alert, got {final}"
    else:
        assert final == "none", f"{path.name}: {label} must stay none, got {final}"
