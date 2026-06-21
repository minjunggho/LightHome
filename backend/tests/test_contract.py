"""Contract validation — the CONTRACTS.md 'Validation checklist' as code.

Run: backend/.venv/bin/python -m pytest backend/tests -q
"""

import json
import os
import pathlib

import pytest
from fastapi.testclient import TestClient

from app.demo_data import sample_records
from app.main import app
from app.models import STAGES, DecisionRecord

ROOT = pathlib.Path(__file__).resolve().parents[2]
PARENT_FORBIDDEN = {"features", "claude", "raw_text", "conditions"}

client = TestClient(app)


def _all_records():
    return {k: DecisionRecord.model_validate(v) for k, v in sample_records().items()}


def test_every_prob_map_has_four_keys_and_sums_to_one():
    for name, rec in _all_records().items():
        for which in (rec.prior_probabilities, rec.stage_probabilities,
                      rec.claude.stage_likelihoods):
            d = which.model_dump()
            assert set(d) == set(STAGES), name
            assert abs(sum(d.values()) - 1.0) <= 0.01, (name, sum(d.values()))


def test_parent_projection_leaks_nothing():
    for rec in _all_records().values():
        parent = rec.to_parent_view()
        flat = json.dumps(parent)
        assert PARENT_FORBIDDEN.isdisjoint(parent.keys())
        assert "raw_text" not in flat
        assert set(parent["alert"].keys()) == {"level"}


def test_alert_level_consistent_with_fired():
    for name, rec in _all_records().items():
        assert (rec.alert.level == "alert") == rec.alert.fired, name


def test_fixture_states_are_what_they_claim():
    recs = sample_records()
    assert recs["green"]["alert"]["level"] == "none"
    assert recs["watch"]["alert"]["level"] == "watch"
    assert recs["fired"]["alert"]["level"] == "alert"
    assert recs["fired"]["alert"]["fired"] is True


def test_no_detector_code_reads_label():
    """Coordination rule: detection code must never READ the ground-truth label
    field. We forbid actual access patterns, not the word 'label' in prose."""
    app_dir = ROOT / "backend" / "app"
    detector_files = ["features.py", "bayes.py", "claude_synthesis.py", "alert.py",
                      "pipeline.py", "embeddings.py"]
    forbidden = ['["label"]', "['label']", ".label", 'get("label"', "get('label'",
                 'conversation_label"]', "conversation_label']", ".conversation_label",
                 'get("conversation_label"', "get('conversation_label'"]
    for fname in detector_files:
        src = (app_dir / fname).read_text()
        for pat in forbidden:
            assert pat not in src, f"{fname} reads label via {pat!r}"


def test_analyze_endpoint_parent_view():
    r = client.post(
        "/analyze-message?view=parent",
        json={"session_id": "t1", "turn": 2, "speaker": "A", "text": "hi", "t_offset_sec": 0},
    )
    assert r.status_code == 200
    body = r.json()
    assert PARENT_FORBIDDEN.isdisjoint(body.keys())
    assert set(body["alert"].keys()) == {"level"}


def test_analyze_endpoint_tns_view_full_record():
    r = client.post(
        "/analyze-message?view=tns",
        json={"session_id": "t2", "turn": 9, "speaker": "A", "text": "don't tell anyone", "t_offset_sec": 300},
    )
    assert r.status_code == 200
    DecisionRecord.model_validate(r.json())  # full record validates


@pytest.mark.skipif(
    os.environ.get("PIPELINE_MODE", "mock").lower() == "live",
    reason="asserts the mock's turn-count ramp; the live pipeline is content-based "
    "(see test_acceptance.py for live discrimination)",
)
def test_ramp_escalates_and_reset_clears():
    sid = "ramp-1"
    client.post("/session/reset", json={"session_id": sid})
    early = client.post("/analyze-message?view=tns",
                        json={"session_id": sid, "turn": 0, "speaker": "A", "text": "hi", "t_offset_sec": 0}).json()
    late = client.post("/analyze-message?view=tns",
                       json={"session_id": sid, "turn": 12, "speaker": "A", "text": "secret", "t_offset_sec": 600}).json()
    early_harm = sum(early["stage_probabilities"][s] for s in ("isolation", "desensitization", "escalation"))
    late_harm = sum(late["stage_probabilities"][s] for s in ("isolation", "desensitization", "escalation"))
    assert late_harm > early_harm

    reset = client.post("/session/reset", json={"session_id": sid})
    assert reset.json()["reset"] is True
