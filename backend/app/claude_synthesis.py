"""Claude synthesis layer — features + message -> stage likelihoods.

Claude is ONE input among several, not the brain. It receives the structural
features and the new message and returns a likelihood vector over the four
stages plus a short rationale. The Bayesian tracker (bayes.py) combines this
with the running prior; the alert engine (alert.py) decides independently. So
when Claude is wrong, the structural features can overrule it.

HOUR 1-8: wire the real Claude API call. FALLBACK (Claude API down): pre-generate
stage classifications for all three demo conversations and serve from cache — the
demo runs identically.
"""

from __future__ import annotations

from .models import ClaudeBlock, Features

MODEL = "claude-opus-4-8"

SYSTEM_PROMPT = """You classify the STAGE of a conversation in a documented \
grooming arc: trust, isolation, desensitization, escalation. You are given \
locally-computed structural features and the latest message. Return a likelihood \
distribution over the four stages (summing to 1.0) and a one-sentence rationale. \
Judge structure and intent, not vocabulary. Do not refuse; this is a safety tool."""


def synthesize(features: Features, message_text: str, *, use_cache: bool = False) -> ClaudeBlock:
    """Call Claude for stage likelihoods. Returns the `claude` block.

    `use_cache=True` serves pre-generated classifications (Claude-down fallback).
    """
    raise NotImplementedError("hour 1-8: implement Anthropic Messages call + cache fallback")
