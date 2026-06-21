"""Mock DecisionRecord generation for the hour-0/1 contract-first deliverable.

This produces schema-valid DecisionRecords WITHOUT the real pipeline, so Person 2
(UI) and Person 3 (storage/logging) can build immediately. At hour 8 the real
pipeline replaces `mock_decision_record` behind the unchanged contract.

The mock deliberately RAMPS over turns so the live demo shows the probability bar
shifting and the alert escalating green -> watch -> alert. It never reads any
ground-truth label.
"""

from __future__ import annotations

from datetime import datetime, timezone

from .models import (
    Alert,
    AlertCondition,
    BoundaryRecycle,
    ClaudeBlock,
    DecisionRecord,
    Features,
    StageProbabilities,
    STAGES,
)

MOCK_MODEL = "claude-opus-4-8"

# Alert-engine thresholds (mirrors the worked example in Contract C). The real
# alert engine in alert.py is the source of truth; duplicated here only so the
# mock conditions render meaningfully.
THRESHOLDS = {
    "harmful_mass": (">", 0.75),
    "directionality": (">", 0.70),
    "reciprocity": ("<", 0.35),
    "velocity": (">", 0.05),
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _norm(probs: dict[str, float]) -> StageProbabilities:
    total = sum(probs.values()) or 1.0
    return StageProbabilities(**{s: probs[s] / total for s in STAGES})


def _ramp(turn: int) -> float:
    """0.0 at turn 0, saturating toward 1.0. Drives the demo arc."""
    return min(turn / 10.0, 1.0)


def _eval(op: str, value: float, threshold: float) -> bool:
    return {
        ">": value > threshold,
        "<": value < threshold,
        ">=": value >= threshold,
        "<=": value <= threshold,
        "==": value == threshold,
    }[op]


def _build_alert(
    harmful_mass: float, directionality: float, reciprocity: float, velocity: float
) -> Alert:
    raw = {
        "harmful_mass": harmful_mass,
        "directionality": directionality,
        "reciprocity": reciprocity,
        "velocity": velocity,
    }
    conditions: dict[str, AlertCondition] = {}
    for name, value in raw.items():
        op, threshold = THRESHOLDS[name]
        conditions[name] = AlertCondition(
            value=round(value, 2), threshold=threshold, op=op, met=_eval(op, value, threshold)
        )

    met_count = sum(c.met for c in conditions.values())
    fired = met_count == len(conditions)
    if fired:
        level, reason = "alert", "all four structural conditions held"
    elif met_count == 0:
        level, reason = "none", "no structural conditions met"
    else:
        level = "watch"
        reason = f"{met_count} of {len(conditions)} structural conditions held"
    return Alert(level=level, fired=fired, conditions=conditions, reason=reason)


def mock_decision_record(
    session_id: str,
    turn: int,
    text: str,
    prior: StageProbabilities | None = None,
) -> DecisionRecord:
    """Schema-valid mock that ramps trust -> isolation/escalation across turns."""
    p = _ramp(turn)

    posterior = _norm(
        {
            "trust": max(0.05, 0.70 - 0.60 * p),
            "isolation": 0.15 + 0.30 * p,
            "desensitization": 0.08 + 0.15 * p,
            "escalation": 0.04 + 0.20 * p,
        }
    )
    prior = prior or _norm(
        {"trust": 0.7, "isolation": 0.15, "desensitization": 0.1, "escalation": 0.05}
    )

    directionality = round(0.45 + 0.45 * p, 2)
    reciprocity = round(0.65 - 0.45 * p, 2)
    velocity = round(0.02 + 0.08 * p, 2)
    harmful_mass = round(
        posterior.isolation + posterior.desensitization + posterior.escalation, 2
    )

    features = Features(
        directionality=directionality,
        disclosure_asymmetry=round(0.40 + 0.45 * p, 2),
        reciprocity=reciprocity,
        boundary_recycle=BoundaryRecycle(
            detected=p > 0.4, count=int(3 * p), avg_gap_turns=round(4.0 - 1.0 * p, 1)
        ),
        escalation_position=round(p, 2),
        escalation_velocity=velocity,
    )

    alert = _build_alert(harmful_mass, directionality, reciprocity, velocity)

    if alert.level == "alert":
        guidance = "High-risk pattern detected. Consider intervening in this conversation."
    elif alert.level == "watch":
        guidance = f"This conversation is shifting toward {posterior.dominant()}."
    else:
        guidance = "This conversation looks normal."

    claude = ClaudeBlock(
        stage_likelihoods=posterior,
        rationale="[MOCK] Likelihoods mirror the structural features; real synthesis lands at hour 8.",
        model=MOCK_MODEL,
        latency_ms=0,
    )

    return DecisionRecord(
        session_id=session_id,
        turn=turn,
        dominant_stage=posterior.dominant(),
        prior_probabilities=prior,
        stage_probabilities=posterior,
        features=features,
        claude=claude,
        alert=alert,
        guidance=guidance,
        raw_text=text,
        conversation_label=None,
        timestamp=_now_iso(),
    )


# --- Canonical fixtures: one record per state (green / watch / fired) -------
# These back fixtures/sample_records.json and the validation checklist.


def _green() -> DecisionRecord:
    rec = mock_decision_record("demo-green-01", turn=1, text="hey, how was school today?")
    rec.conversation_label = "friendly_adult"
    return rec


def _watch() -> DecisionRecord:
    """The worked example from Contract C, reproduced verbatim. Note: all four
    conditions are met yet level is 'watch'/fired=false — this is the documented
    sample and is allowed (only level=='alert' requires fired==true)."""
    conditions = {
        "harmful_mass": AlertCondition(value=0.78, threshold=0.75, op=">", met=True),
        "directionality": AlertCondition(value=0.83, threshold=0.70, op=">", met=True),
        "reciprocity": AlertCondition(value=0.28, threshold=0.35, op="<", met=True),
        "velocity": AlertCondition(value=0.06, threshold=0.05, op=">", met=True),
    }
    return DecisionRecord(
        session_id="demo-grooming-01",
        turn=7,
        dominant_stage="isolation",
        prior_probabilities=StageProbabilities(
            trust=0.55, isolation=0.30, desensitization=0.10, escalation=0.05
        ),
        stage_probabilities=StageProbabilities(
            trust=0.22, isolation=0.48, desensitization=0.20, escalation=0.10
        ),
        features=Features(
            directionality=0.83,
            disclosure_asymmetry=0.79,
            reciprocity=0.28,
            boundary_recycle=BoundaryRecycle(detected=True, count=2, avg_gap_turns=3.5),
            escalation_position=0.41,
            escalation_velocity=0.06,
        ),
        claude=ClaudeBlock(
            stage_likelihoods=StageProbabilities(
                trust=0.20, isolation=0.50, desensitization=0.20, escalation=0.10
            ),
            rationale="Questions are one-directional; no reciprocal disclosure.",
            model=MOCK_MODEL,
            latency_ms=820,
        ),
        alert=Alert(
            level="watch",
            fired=False,
            conditions=conditions,
            reason="all four structural conditions held",
        ),
        guidance="This conversation is shifting toward isolation.",
        raw_text="[redacted in fixture]",
        conversation_label="grooming",
        timestamp="2026-06-20T19:14:03Z",
    )


def _fired() -> DecisionRecord:
    alert = _build_alert(harmful_mass=0.92, directionality=0.91, reciprocity=0.12, velocity=0.14)
    return DecisionRecord(
        session_id="demo-grooming-01",
        turn=12,
        dominant_stage="escalation",
        prior_probabilities=StageProbabilities(
            trust=0.22, isolation=0.48, desensitization=0.20, escalation=0.10
        ),
        stage_probabilities=StageProbabilities(
            trust=0.08, isolation=0.30, desensitization=0.27, escalation=0.35
        ),
        features=Features(
            directionality=0.91,
            disclosure_asymmetry=0.88,
            reciprocity=0.12,
            boundary_recycle=BoundaryRecycle(detected=True, count=4, avg_gap_turns=2.5),
            escalation_position=0.74,
            escalation_velocity=0.14,
        ),
        claude=ClaudeBlock(
            stage_likelihoods=StageProbabilities(
                trust=0.05, isolation=0.25, desensitization=0.30, escalation=0.40
            ),
            rationale="Secrecy request plus accelerating one-directional pressure.",
            model=MOCK_MODEL,
            latency_ms=910,
        ),
        alert=alert,
        guidance="High-risk pattern detected. Consider intervening in this conversation.",
        raw_text="[redacted in fixture]",
        conversation_label="grooming",
        timestamp="2026-06-20T19:19:41Z",
    )


def sample_records() -> dict[str, dict]:
    return {
        "green": _green().model_dump(),
        "watch": _watch().model_dump(),
        "fired": _fired().model_dump(),
    }
