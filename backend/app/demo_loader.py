"""Demo-conversation loader — reconciles the two demo JSON schemas.

Contract A (CONTRACTS.md) and Person 3's actual `demo/*.json` drifted apart:

  Contract A        : conversation_id, label, t_offset_sec, speakers A/B
  Person 3's files  : id, expected_alert + expected_reason, timestamp_offset_seconds,
                      named speakers, per-message stage_hint, 1-indexed turns

This loader reads EITHER shape and returns one normalized structure, so the
replay harness and acceptance tests work regardless of which schema a file uses.
It never feeds `label`/`stage_hint`/`expected_*` into detection — those are
test-harness metadata only.
"""

from __future__ import annotations

import json
import pathlib
from typing import Any, TypedDict


class NormalizedMessage(TypedDict):
    turn: int
    speaker: str
    text: str
    t_offset_sec: int


class NormalizedConversation(TypedDict):
    conversation_id: str
    title: str
    expected_alert: bool | None   # True = should fire, False = must stay calm, None = unknown
    label: str | None             # display/debug only
    messages: list[NormalizedMessage]


def _expected_alert(raw: dict[str, Any]) -> bool | None:
    if "expected_alert" in raw:
        return bool(raw["expected_alert"])
    label = raw.get("label")
    if label is not None:
        return label == "grooming"  # Contract A label -> alert expectation
    return None


def normalize(raw: dict[str, Any], *, fallback_id: str = "conversation") -> NormalizedConversation:
    messages: list[NormalizedMessage] = []
    for m in raw.get("messages", []):
        messages.append(
            {
                "turn": int(m["turn"]),
                "speaker": str(m["speaker"]),
                "text": str(m["text"]),
                # Contract A uses t_offset_sec; Person 3 uses timestamp_offset_seconds.
                "t_offset_sec": int(m.get("t_offset_sec", m.get("timestamp_offset_seconds", 0))),
            }
        )
    return {
        "conversation_id": str(raw.get("conversation_id") or raw.get("id") or fallback_id),
        "title": str(raw.get("title", "")),
        "expected_alert": _expected_alert(raw),
        "label": raw.get("label"),
        "messages": messages,
    }


def load_conversation(path: str | pathlib.Path) -> NormalizedConversation:
    p = pathlib.Path(path)
    raw = json.loads(p.read_text())
    return normalize(raw, fallback_id=p.stem)
