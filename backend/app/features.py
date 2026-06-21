"""The four structural feature extractors.

CRITICAL: these run on local Python (spaCy / VADER / sentence-transformers)
BEFORE any Claude call and must NEVER depend on Claude. When Claude is wrong,
these features overrule it — and that disagreement is the Arize-trace credibility
moment. They also must NEVER read a conversation's ground-truth `label`.

HOUR 1-8: implement against the demo conversations. Until then these raise so the
mock pipeline (demo_data.mock_decision_record) is clearly the active path.
"""

from __future__ import annotations

from .models import Features
from .protocols import SessionState

# A single chat message: {"turn": int, "speaker": str, "text": str, "t_offset_sec": int}
Message = dict


def directionality(messages: list[Message], subject_speaker: str) -> float:
    """How one-sided is the questioning? Ratio of questions asked-by vs
    asked-of the adult. 0 = balanced, 1 = entirely one-directional."""
    raise NotImplementedError("hour 1-8")


def reciprocity(messages: list[Message]) -> float:
    """Mutual self-disclosure. High = both share; low = extraction. The teen
    case stays green here (reciprocity ~0.6 fails the <0.35 alert test)."""
    raise NotImplementedError("hour 1-8")


def boundary_recycle(embeddings: list[list[float]]) -> dict:
    """Detect repeated re-approach of the same boundary after a soft refusal.
    Returns {detected, count, avg_gap_turns}."""
    raise NotImplementedError("hour 1-8")


def escalation_velocity(embeddings: list[list[float]], t_offsets: list[int]) -> float:
    """Rate of movement through stage space per unit time — the '45 minutes'
    signal. Powers the velocity alert condition."""
    raise NotImplementedError("hour 1-8")


def extract_features(state: SessionState, new_message: Message) -> Features:
    """Run all four extractors over the conversation-so-far + the new message.

    This is the single entry point the pipeline calls. Returns the `features`
    block of the DecisionRecord. NEVER reads `label`.
    """
    raise NotImplementedError("hour 1-8: assemble the four extractors here")
