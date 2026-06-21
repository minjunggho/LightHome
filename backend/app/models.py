"""Contract C — the DecisionRecord and its two projections.

This module is the single source of truth for the schema that crosses every role
boundary. Person 1 emits a DecisionRecord per message; Person 2 renders it;
Person 3 stores/logs it. Keep this aligned with CONTRACTS.md.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

# --- Shared vocabulary (fix once, never drift) -----------------------------

Stage = Literal["trust", "isolation", "desensitization", "escalation"]
AlertLevel = Literal["none", "watch", "alert"]
ConversationLabel = Literal["grooming", "friendly_adult", "teen_relationship"]
View = Literal["parent", "tns"]

STAGES: tuple[Stage, ...] = ("trust", "isolation", "desensitization", "escalation")

_PROB_SUM_TOLERANCE = 0.01


class StageProbabilities(BaseModel):
    """A probability map over the four stages. Always carries all four keys and
    sums to ~1.0 (Contract invariant)."""

    trust: float = Field(ge=0.0, le=1.0)
    isolation: float = Field(ge=0.0, le=1.0)
    desensitization: float = Field(ge=0.0, le=1.0)
    escalation: float = Field(ge=0.0, le=1.0)

    @model_validator(mode="after")
    def _sums_to_one(self) -> "StageProbabilities":
        total = self.trust + self.isolation + self.desensitization + self.escalation
        if abs(total - 1.0) > _PROB_SUM_TOLERANCE:
            raise ValueError(f"stage probabilities must sum to ~1.0, got {total:.4f}")
        return self

    def dominant(self) -> Stage:
        return max(STAGES, key=lambda s: getattr(self, s))


class BoundaryRecycle(BaseModel):
    detected: bool
    count: int = Field(ge=0)
    avg_gap_turns: float = Field(ge=0.0)


class Features(BaseModel):
    """The four structural extractors (+ derived signals), computed locally
    BEFORE Claude is called. These can overrule Claude."""

    directionality: float = Field(ge=0.0, le=1.0)
    disclosure_asymmetry: float = Field(ge=0.0, le=1.0)
    reciprocity: float = Field(ge=0.0, le=1.0)
    boundary_recycle: BoundaryRecycle
    escalation_position: float = Field(ge=0.0, le=1.0)
    escalation_velocity: float = Field(ge=0.0)


class ClaudeBlock(BaseModel):
    """Claude's synthesis output. One input among several, not the brain."""

    stage_likelihoods: StageProbabilities
    rationale: str
    model: str
    latency_ms: int = Field(ge=0)


class AlertCondition(BaseModel):
    """value + threshold + op + met. Powers both the green/yellow/red bar and
    the false-positive explanation on screen."""

    value: float
    threshold: float
    op: Literal[">", "<", ">=", "<=", "=="]
    met: bool


class Alert(BaseModel):
    level: AlertLevel
    fired: bool
    conditions: dict[str, AlertCondition]
    reason: str

    @model_validator(mode="after")
    def _level_consistent_with_fired(self) -> "Alert":
        # alert.level == "alert"  <=>  fired is True
        if (self.level == "alert") != self.fired:
            raise ValueError(
                f"alert.level={self.level!r} inconsistent with fired={self.fired}"
            )
        return self


class DecisionRecord(BaseModel):
    """The spine of the whole system. One per message."""

    schema_version: Literal[1] = 1
    session_id: str
    turn: int = Field(ge=0)
    dominant_stage: Stage

    prior_probabilities: StageProbabilities
    stage_probabilities: StageProbabilities  # posterior

    features: Features
    claude: ClaudeBlock
    alert: Alert

    guidance: str
    raw_text: str
    conversation_label: ConversationLabel | None = None
    timestamp: str

    # --- Projections (Contract C) ------------------------------------------

    def to_parent_view(self) -> dict:
        """Whitelist projection. Privacy is enforced HERE, at the boundary —
        no features, no claude, no raw_text, no conditions."""
        return {
            "dominant_stage": self.dominant_stage,
            "prior_probabilities": self.prior_probabilities.model_dump(),
            "stage_probabilities": self.stage_probabilities.model_dump(),
            "alert": {"level": self.alert.level},
            "guidance": self.guidance,
        }

    def to_tns_view(self) -> dict:
        """Full record for the moderator queue."""
        return self.model_dump()

    def project(self, view: View) -> dict:
        return self.to_parent_view() if view == "parent" else self.to_tns_view()


# --- Contract B — request shapes -------------------------------------------


class AnalyzeRequest(BaseModel):
    session_id: str
    turn: int = Field(ge=0)
    speaker: str
    text: str
    t_offset_sec: int = Field(ge=0)


class ResetRequest(BaseModel):
    session_id: str
