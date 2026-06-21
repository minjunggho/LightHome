"""Bayesian stage tracker.

The system tracks a live probability distribution over the four stages, not a
binary label. Each message produces a stage-likelihood vector (from Claude +
structural features); we multiply it into the running prior and renormalize:

    posterior(s) = prior(s) * likelihood(s) / Z

This is the technical core that answers "isn't this just a prompt wrapper?": the
arc is tracked statefully across the whole conversation, independent of any single
model call.
"""

from __future__ import annotations

from .models import STAGES, StageProbabilities


def bayesian_update(
    prior: StageProbabilities,
    likelihood: StageProbabilities,
) -> StageProbabilities:
    """Multiply prior by likelihood over the four stages and renormalize."""
    unnorm = {s: getattr(prior, s) * getattr(likelihood, s) for s in STAGES}
    z = sum(unnorm.values())
    if z <= 0.0:
        # Degenerate (likelihood orthogonal to prior) — fall back to the prior.
        return prior
    return StageProbabilities(**{s: unnorm[s] / z for s in STAGES})


def uniform_prior() -> StageProbabilities:
    return StageProbabilities(**{s: 0.25 for s in STAGES})
