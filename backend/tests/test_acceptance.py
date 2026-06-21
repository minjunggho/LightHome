"""Conversation-level acceptance — the hour-17 make-or-break case.

Replays each demo conversation end-to-end and asserts the final alert matches the
file's declared expectation:

    expected_alert: true   -> must reach "alert"   (grooming)
    expected_alert: false  -> must stay "none"     (friendly adult / teen — the
                                                     false-positive cases we win)

Reads either demo schema (Contract A or Person 3's) via demo_loader, so it works
with whatever the demo files actually use.

This SKIPS while the pipeline is still the content-blind mock (which ramps purely
on turn count and cannot tell grooming from friendly). It lights up automatically
once the real pipeline is wired — set PIPELINE_MODE=live. That's the hour-17 gate.
"""

from __future__ import annotations

import os
import pathlib

import pytest
from fastapi.testclient import TestClient

from app.demo_loader import load_conversation
from app.main import app

ROOT = pathlib.Path(__file__).resolve().parents[2]
DEMO_DIR = ROOT / "demo"

# The mock ramps purely on turn count and cannot tell grooming from friendly by
# content, so discrimination only holds once the real pipeline is wired. Set
# PIPELINE_MODE=live (hour 8+) to enforce this suite.
PIPELINE_IS_LIVE = os.environ.get("PIPELINE_MODE", "mock").lower() == "live"


def _demo_files() -> list[pathlib.Path]:
    return [p for p in sorted(DEMO_DIR.glob("*.json")) if p.stat().st_size > 0]


def _replay_final_level(client: TestClient, convo: dict) -> str:
    sid = f"acc-{convo['conversation_id']}"
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
                "t_offset_sec": m["t_offset_sec"],
            },
        )
        r.raise_for_status()
        level = r.json()["alert"]["level"]
    return level


@pytest.mark.skipif(not PIPELINE_IS_LIVE, reason="real pipeline not wired (PIPELINE_MODE!=live)")
@pytest.mark.parametrize(
    "path",
    _demo_files() or [pytest.param(None, marks=pytest.mark.skip(reason="no demo data yet"))],
)
def test_demo_conversation_reaches_expected_level(path):
    convo = load_conversation(path)
    expected_alert = convo["expected_alert"]
    assert expected_alert is not None, f"{path.name}: no expected_alert/label to assert against"
    client = TestClient(app)
    final = _replay_final_level(client, convo)
    if expected_alert:
        assert final == "alert", f"{path.name}: must reach alert, got {final}"
    else:
        assert final == "none", f"{path.name}: must stay none, got {final}"
