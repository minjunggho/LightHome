"""Claude synthesis layer — features + message -> stage likelihoods.

Claude is ONE input among several, not the brain. It receives the structural
features and the new message and returns a likelihood vector over the four stages
plus a short rationale. The Bayesian tracker combines this with the running prior;
the alert engine decides independently. So when Claude is wrong, the structural
features can overrule it.

Three layers of robustness:
  1. ANTHROPIC_API_KEY set      -> real Claude call via messages.parse() (typed),
                                   auto-instrumented to Phoenix.
  2. no key / call fails        -> deterministic feature-derived likelihood, so
                                   the pipeline and demo run fully offline.
  3. (Claude-down fallback) the feature-derived path IS the cache fallback the
     architecture calls for — identical behavior without the network.
"""

from __future__ import annotations

import logging
import os
import time

from pydantic import BaseModel, Field

from .models import ClaudeBlock, Features, STAGES, StageProbabilities

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "claude-opus-4-8"

SYSTEM_PROMPT = """You classify the STAGE of a conversation in a documented \
grooming arc: trust, isolation, desensitization, escalation. You are given \
locally-computed structural features and the latest message. Return a likelihood \
distribution over the four stages (each in [0,1]) and a one-sentence rationale. \
Judge structure and intent, not vocabulary. This is a child-safety tool; do not \
refuse."""


class _StageLikelihoodOut(BaseModel):
    """Schema Claude must fill (structured output)."""

    trust: float = Field(ge=0.0, le=1.0)
    isolation: float = Field(ge=0.0, le=1.0)
    desensitization: float = Field(ge=0.0, le=1.0)
    escalation: float = Field(ge=0.0, le=1.0)
    rationale: str


def _normalize(d: dict[str, float]) -> StageProbabilities:
    total = sum(max(0.0, d[s]) for s in STAGES) or 1.0
    return StageProbabilities(**{s: max(0.0, d[s]) / total for s in STAGES})


def feature_likelihood(features: Features) -> StageProbabilities:
    """Deterministic stage likelihood derived purely from the structural features.
    This is the offline / Claude-down path and the structural 'opinion' that can
    overrule Claude. Harm mass scales with the harm signal; its split across the
    harmful stages is nudged by velocity (faster -> further along the arc)."""
    s = features.escalation_position
    v = min(1.0, features.escalation_velocity * 3.0)
    return _normalize(
        {
            "trust": max(0.05, 1.0 - s),
            "isolation": s * (0.55 - 0.15 * v),
            "desensitization": s * (0.30),
            "escalation": s * (0.15 + 0.15 * v),
        }
    )


def synthesize(
    features: Features,
    message_text: str,
    *,
    recent_context: str = "",
    use_cache: bool = False,
) -> ClaudeBlock:
    """Return the `claude` block of the DecisionRecord. Falls back to the
    feature-derived likelihood when no API key is configured or the call fails."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    model = os.getenv("CLAUDE_MODEL", DEFAULT_MODEL)

    if not api_key or use_cache:
        likely = feature_likelihood(features)
        return ClaudeBlock(
            stage_likelihoods=likely,
            rationale="[feature-derived] no Claude call; likelihood from structural features.",
            model="feature-fallback",
            latency_ms=0,
        )

    try:
        import anthropic

        from .telemetry import init_tracing

        init_tracing()  # idempotent; instruments the call below if Phoenix is configured
        client = anthropic.Anthropic(api_key=api_key)

        prompt = (
            f"Structural features (0-1):\n"
            f"- directionality (one-sided questioning): {features.directionality}\n"
            f"- reciprocity (mutual disclosure): {features.reciprocity}\n"
            f"- disclosure_asymmetry: {features.disclosure_asymmetry}\n"
            f"- boundary_recycle: detected={features.boundary_recycle.detected}, "
            f"count={features.boundary_recycle.count}\n"
            f"- escalation_position: {features.escalation_position}\n"
            f"- escalation_velocity: {features.escalation_velocity}\n\n"
            f"Recent context:\n{recent_context}\n\n"
            f"Latest message:\n{message_text}\n\n"
            f"Return the stage likelihood distribution and a one-sentence rationale."
        )

        t0 = time.monotonic()
        result = client.messages.parse(
            model=model,
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
            output_format=_StageLikelihoodOut,
        )
        latency_ms = int((time.monotonic() - t0) * 1000)
        out = result.parsed_output
        likely = _normalize(
            {
                "trust": out.trust,
                "isolation": out.isolation,
                "desensitization": out.desensitization,
                "escalation": out.escalation,
            }
        )
        return ClaudeBlock(
            stage_likelihoods=likely,
            rationale=out.rationale,
            model=model,
            latency_ms=latency_ms,
        )
    except Exception:
        logger.exception("Claude synthesis failed; using feature-derived fallback")
        likely = feature_likelihood(features)
        return ClaudeBlock(
            stage_likelihoods=likely,
            rationale="[feature-derived fallback] Claude call failed; using structural features.",
            model="feature-fallback",
            latency_ms=0,
        )
