from __future__ import annotations

import json
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]

DEMO_PATHS = {
    "grooming": "demo/grooming_demo.json",
    "friendly_adult": "demo/normal_adult_demo.json",
    "teen_relationship": "demo/teen_relationship_demo.json",
}

_CONTRACT_IDS = {
    "grooming_arc": "grooming_arc_01",
    "normal_adult": "friendly_adult_01",
    "teen_relationship": "teen_relationship_01",
}

_LABELS = {
    "grooming_arc": "grooming",
    "normal_adult": "friendly_adult",
    "teen_relationship": "teen_relationship",
}

_SPEAKER_MAPS = {
    "grooming_arc": {"alex": "A", "jordan": "B"},
    "normal_adult": {"coach_sarah": "A", "jordan": "B"},
    "teen_relationship": {"jordan": "A", "riley": "B"},
}

_PARTICIPANTS = {
    "grooming_arc": {
        "A": {"role": "adult", "display": "Alex"},
        "B": {"role": "minor", "display": "Jordan, 14"},
    },
    "normal_adult": {
        "A": {"role": "adult", "display": "Coach Sarah"},
        "B": {"role": "minor", "display": "Jordan, 14"},
    },
    "teen_relationship": {
        "A": {"role": "minor", "display": "Jordan, 14"},
        "B": {"role": "minor", "display": "Riley, 15"},
    },
}


def load_demo(relative_path: str) -> dict[str, Any]:
    """Load one Person 3 demo JSON file from the repository root."""
    path = REPO_ROOT / relative_path
    with path.open("r", encoding="utf-8") as demo_file:
        data = json.load(demo_file)

    if not isinstance(data, dict):
        raise ValueError(f"{relative_path} must contain a JSON object")

    return data


def normalize_demo_for_contract(demo: dict[str, Any]) -> dict[str, Any]:
    """Convert Person 3 demo JSON into the frozen Contract A shape."""
    demo_id = str(demo["id"])
    messages = demo.get("messages", [])
    if not isinstance(messages, list):
        raise ValueError(f"{demo_id} messages must be a list")

    speaker_map = dict(_SPEAKER_MAPS.get(demo_id, {}))
    next_speaker = iter(("A", "B"))

    normalized_messages = []
    for index, message in enumerate(messages):
        if not isinstance(message, dict):
            raise ValueError(f"{demo_id} message {index} must be an object")

        raw_speaker = str(message["speaker"])
        if raw_speaker not in speaker_map:
            speaker_map[raw_speaker] = next(next_speaker)

        normalized_messages.append(
            {
                "turn": index,
                "speaker": speaker_map[raw_speaker],
                "text": message["text"],
                "t_offset_sec": message["timestamp_offset_seconds"],
            }
        )

    return {
        "conversation_id": _CONTRACT_IDS.get(demo_id, demo_id),
        "label": _LABELS.get(demo_id, "unknown"),
        "title": demo["title"],
        "participants": _PARTICIPANTS.get(demo_id, {}),
        "messages": normalized_messages,
    }


def load_contract_demo(relative_path: str) -> dict[str, Any]:
    """Load and normalize one demo conversation into Contract A shape."""
    return normalize_demo_for_contract(load_demo(relative_path))


def load_all_contract_demos() -> dict[str, dict[str, Any]]:
    """Return every demo conversation normalized for replay scripts."""
    return {
        name: load_contract_demo(relative_path)
        for name, relative_path in DEMO_PATHS.items()
    }
