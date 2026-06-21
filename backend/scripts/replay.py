"""Replay a whole conversation (Contract A) through the pipeline and print the
per-turn alert trajectory. This is Person 1's end-to-end sanity check.

It drives the SAME path the live demo uses: reset session -> POST each message in
turn order -> read the DecisionRecord. Works against the mock today and against
the real pipeline at hour 8 with NO changes.

Usage:
    backend/.venv/bin/python -m scripts.replay backend/tests/fixtures/replay_grooming_sample.json
    backend/.venv/bin/python -m scripts.replay demo/grooming_demo.json --view tns

The detector never sees `label`; this script reads it ONLY to print a verdict.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

from fastapi.testclient import TestClient

from app.main import app

ALERT_GLYPH = {"none": "🟢", "watch": "🟡", "alert": "🔴"}


def replay(path: pathlib.Path, view: str = "tns") -> int:
    convo = json.loads(path.read_text())
    label = convo.get("label", "?")          # test-harness only — never fed to detector
    session_id = f"replay-{convo.get('conversation_id', path.stem)}"
    messages = convo["messages"]

    client = TestClient(app)
    client.post("/session/reset", json={"session_id": session_id})

    print(f"\n=== {path.name}  (label={label}, view={view}) ===")
    final_level = "none"
    for m in messages:
        body = {
            "session_id": session_id,
            "turn": m["turn"],
            "speaker": m["speaker"],
            "text": m["text"],
            "t_offset_sec": m.get("t_offset_sec", 0),
        }
        r = client.post(f"/analyze-message?view={view}", json=body)
        r.raise_for_status()
        rec = r.json()
        level = rec["alert"]["level"]
        final_level = level
        post = rec["stage_probabilities"]
        harm = post["isolation"] + post["desensitization"] + post["escalation"]
        print(
            f"  t{m['turn']:>2} {ALERT_GLYPH.get(level,'?')} {level:<5} "
            f"dom={rec['dominant_stage']:<15} harm={harm:0.2f}  "
            f"{m['text'][:48]!r}"
        )

    print(f"  -> final alert: {ALERT_GLYPH.get(final_level,'?')} {final_level}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("path", type=pathlib.Path)
    ap.add_argument("--view", choices=["parent", "tns"], default="tns")
    args = ap.parse_args()
    if not args.path.exists() or args.path.stat().st_size == 0:
        print(f"!! {args.path} is missing or empty (Person 3 hasn't drafted it yet)")
        return 1
    return replay(args.path, args.view)


if __name__ == "__main__":
    sys.exit(main())
