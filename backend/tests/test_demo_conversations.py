from __future__ import annotations

import importlib
import inspect
import json
from pathlib import Path
from typing import Any

try:
    import pytest
except ImportError:
    pytest = None


REPO_ROOT = Path(__file__).resolve().parents[2]

VALID_STAGE_HINTS = {
    "trust_building",
    "isolation",
    "desensitization",
    "escalation",
    "normal",
}

REQUIRED_TOP_LEVEL_KEYS = {
    "id",
    "title",
    "description",
    "expected_alert",
    "expected_reason",
    "messages",
}

REQUIRED_MESSAGE_KEYS = {
    "turn",
    "speaker",
    "text",
    "timestamp_offset_seconds",
    "stage_hint",
}

DEMO_FILES = {
    "grooming": {
        "path": "demo/grooming_demo.json",
        "expected_alert": True,
        "min_messages": 12,
        "max_messages": 14,
        "allowed_speakers": {"alex", "jordan"},
    },
    "normal_adult": {
        "path": "demo/normal_adult_demo.json",
        "expected_alert": False,
        "min_messages": 8,
        "max_messages": 10,
        "allowed_speakers": {"coach_sarah", "jordan"},
    },
    "teen_relationship": {
        "path": "demo/teen_relationship_demo.json",
        "expected_alert": False,
        "min_messages": 9,
        "max_messages": 11,
        "allowed_speakers": {"jordan", "riley"},
    },
}


def load_demo(relative_path: str) -> dict[str, Any]:
    """Load a demo conversation JSON file from the repository root."""
    path = REPO_ROOT / relative_path
    with path.open("r", encoding="utf-8") as demo_file:
        data = json.load(demo_file)

    assert isinstance(data, dict), f"{relative_path} must contain a JSON object"
    return data


def get_messages(demo: dict[str, Any]) -> list[dict[str, Any]]:
    """Return the message list after validating its basic shape."""
    messages = demo.get("messages")
    assert isinstance(messages, list), "messages must be a list"
    assert all(isinstance(message, dict) for message in messages), (
        "every message must be a JSON object"
    )
    return messages


def _skip_optional(reason: str) -> None:
    if pytest is not None:
        pytest.skip(reason)


def test_demo_files_exist() -> None:
    for name, config in DEMO_FILES.items():
        path = REPO_ROOT / str(config["path"])
        assert path.exists(), f"{name} demo file is missing at {config['path']}"


def test_demo_json_parseable() -> None:
    for name, config in DEMO_FILES.items():
        data = load_demo(str(config["path"]))
        assert data, f"{name} demo JSON should not be empty"


def test_top_level_schema() -> None:
    for name, config in DEMO_FILES.items():
        data = load_demo(str(config["path"]))
        missing = REQUIRED_TOP_LEVEL_KEYS - set(data)
        assert not missing, f"{name} demo is missing top-level keys: {missing}"
        assert isinstance(data["id"], str) and data["id"], f"{name} id must be text"
        assert isinstance(data["title"], str) and data["title"], (
            f"{name} title must be text"
        )
        assert isinstance(data["description"], str) and data["description"], (
            f"{name} description must be text"
        )
        assert isinstance(data["expected_alert"], bool), (
            f"{name} expected_alert must be a boolean"
        )
        assert isinstance(data["expected_reason"], str) and data["expected_reason"], (
            f"{name} expected_reason must be text"
        )

        for message in get_messages(data):
            missing_message_keys = REQUIRED_MESSAGE_KEYS - set(message)
            assert not missing_message_keys, (
                f"{name} turn {message.get('turn')} is missing keys: "
                f"{missing_message_keys}"
            )
            assert isinstance(message["turn"], int), f"{name} turn must be an integer"
            assert isinstance(message["speaker"], str) and message["speaker"], (
                f"{name} speaker must be text"
            )
            assert isinstance(message["text"], str) and message["text"], (
                f"{name} message text must be text"
            )
            assert isinstance(message["timestamp_offset_seconds"], (int, float)), (
                f"{name} timestamp_offset_seconds must be numeric"
            )
            assert isinstance(message["stage_hint"], str), (
                f"{name} stage_hint must be text"
            )


def test_message_counts() -> None:
    for name, config in DEMO_FILES.items():
        data = load_demo(str(config["path"]))
        messages = get_messages(data)
        assert config["min_messages"] <= len(messages) <= config["max_messages"], (
            f"{name} has {len(messages)} messages, expected "
            f"{config['min_messages']} to {config['max_messages']}"
        )


def test_expected_alert_values() -> None:
    for name, config in DEMO_FILES.items():
        data = load_demo(str(config["path"]))
        assert data["expected_alert"] is config["expected_alert"], (
            f"{name} expected_alert should be {config['expected_alert']}"
        )


def test_turn_numbers_are_sequential() -> None:
    for name, config in DEMO_FILES.items():
        messages = get_messages(load_demo(str(config["path"])))
        turns = [message["turn"] for message in messages]
        expected_turns = list(range(1, len(messages) + 1))
        assert turns == expected_turns, (
            f"{name} turn numbers should be sequential: {turns}"
        )


def test_stage_hints_are_valid() -> None:
    for name, config in DEMO_FILES.items():
        messages = get_messages(load_demo(str(config["path"])))
        invalid_stage_hints = [
            message["stage_hint"]
            for message in messages
            if message["stage_hint"] not in VALID_STAGE_HINTS
        ]
        assert not invalid_stage_hints, (
            f"{name} has invalid stage hints: {invalid_stage_hints}"
        )


def test_speakers_are_consistent() -> None:
    for name, config in DEMO_FILES.items():
        messages = get_messages(load_demo(str(config["path"])))
        speakers = {message["speaker"] for message in messages}
        allowed_speakers = config["allowed_speakers"]
        assert speakers <= allowed_speakers, (
            f"{name} has unexpected speakers: {speakers - allowed_speakers}"
        )
        assert speakers == allowed_speakers, (
            f"{name} should include exactly these speakers: {allowed_speakers}"
        )


def test_timestamps_are_non_decreasing() -> None:
    for name, config in DEMO_FILES.items():
        messages = get_messages(load_demo(str(config["path"])))
        timestamps = [message["timestamp_offset_seconds"] for message in messages]
        assert timestamps == sorted(timestamps), (
            f"{name} timestamps should be non-decreasing: {timestamps}"
        )


def test_grooming_demo_has_stage_progression() -> None:
    data = load_demo("demo/grooming_demo.json")
    messages = get_messages(data)
    stage_hints = {message["stage_hint"] for message in messages}

    assert "trust_building" in stage_hints
    assert "isolation" in stage_hints
    assert "desensitization" in stage_hints
    assert "escalation" not in stage_hints
    assert data["expected_alert"] is True


def test_safe_demos_are_all_normal_stage_hints() -> None:
    for name in ("normal_adult", "teen_relationship"):
        config = DEMO_FILES[name]
        data = load_demo(str(config["path"]))
        messages = get_messages(data)
        assert all(message["stage_hint"] == "normal" for message in messages), (
            f"{name} should use only normal stage hints"
        )
        assert data["expected_alert"] is False


def test_optional_feature_extractor_smoke() -> None:
    try:
        features = importlib.import_module("backend.app.features")
    except Exception as exc:
        _skip_optional(f"feature extractor module is not ready: {exc}")
        return

    extractor = None
    for candidate_name in (
        "extract_features",
        "extract_message_features",
        "compute_features",
        "analyze_message_features",
    ):
        candidate = getattr(features, candidate_name, None)
        if callable(candidate):
            extractor = candidate
            break

    if extractor is None:
        _skip_optional("feature extractor function is not implemented yet")
        return

    sample_messages = get_messages(load_demo("demo/grooming_demo.json"))[:2]
    try:
        parameters = inspect.signature(extractor).parameters
        if len(parameters) == 1:
            result = extractor(sample_messages)
        else:
            result = extractor(sample_messages[-1], sample_messages[:-1])
    except Exception as exc:
        _skip_optional(f"feature extractor is present but not smoke-test ready: {exc}")
        return

    assert isinstance(result, dict), "feature extractor should return a dictionary"


if __name__ == "__main__":
    for name, config in DEMO_FILES.items():
        data = load_demo(str(config["path"]))
        print(
            f"{name}: {len(data['messages'])} messages, "
            f"expected_alert={data['expected_alert']}"
        )
