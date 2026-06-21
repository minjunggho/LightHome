"""The real detection pipeline — the hour-8 runtime sequence.

    run 4 extractors -> Claude synthesis -> Bayesian update -> alert engine
    -> assemble ONE DecisionRecord

Replaces the mock behind the unchanged Contract C. Never reads `label`.
"""

from __future__ import annotations

from datetime import datetime, timezone

from .alert import evaluate
from .bayes import bayesian_update, uniform_prior
from .claude_synthesis import synthesize
from .features import Message, extract_features
from .models import DecisionRecord, StageProbabilities


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _guidance(level: str, posterior: StageProbabilities) -> str:
    if level == "alert":
        return "High-risk pattern detected. Consider intervening in this conversation."
    if level == "watch":
        return f"This conversation is shifting toward {posterior.dominant()}."
    return "This conversation looks normal."


def analyze(
    session_id: str,
    messages: list[Message],
    prior: StageProbabilities | None,
) -> DecisionRecord:
    """Run the full pipeline for the latest message in `messages` (the whole
    conversation-so-far). Returns the DecisionRecord; the caller persists the
    posterior as the next prior."""
    new = messages[-1]
    prior = prior or uniform_prior()

    features = extract_features(messages)
    recent_context = "\n".join(f"{m['speaker']}: {m['text']}" for m in messages[-4:-1])
    claude = synthesize(features, new["text"], recent_context=recent_context)
    posterior = bayesian_update(prior, claude.stage_likelihoods)
    alert = evaluate(features, posterior, n_messages=len(messages))

    return DecisionRecord(
        session_id=session_id,
        turn=new["turn"],
        dominant_stage=posterior.dominant(),
        prior_probabilities=prior,
        stage_probabilities=posterior,
        features=features,
        claude=claude,
        alert=alert,
        guidance=_guidance(alert.level, posterior),
        raw_text=new["text"],
        conversation_label=None,
        timestamp=_now_iso(),
        t_offset_sec=new["t_offset_sec"],
    )
