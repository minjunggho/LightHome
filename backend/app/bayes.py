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

import os

from .models import STAGES, StageProbabilities

# Forgetting factor (leak toward uniform applied to the prior before each update).
# A pure multiplicative chain lets the prior collapse onto whichever stage the
# early messages looked like — after a few "trust"-looking openers the isolation
# prior is ~0, so a later confident isolation read gets multiplied against ~0 and
# the posterior cannot climb (harmful_mass moving DOWN as risk rises). Bleeding a
# little mass back toward uniform each step floors every stage's prior, so recent
# evidence can move the arc. 0.0 = the old pure-Bayes behavior.
_DEFAULT_LEAK = 0.25
_UNIFORM = 1.0 / len(STAGES)


def _leak() -> float:
    try:
        return max(0.0, min(1.0, float(os.getenv("BAYES_LEAK", _DEFAULT_LEAK))))
    except ValueError:
        return _DEFAULT_LEAK


def bayesian_update(
    prior: StageProbabilities,
    likelihood: StageProbabilities,
) -> StageProbabilities:
    """Multiply (leaked) prior by likelihood over the four stages and renormalize."""
    leak = _leak()
    leaked = {s: (1.0 - leak) * getattr(prior, s) + leak * _UNIFORM for s in STAGES}
    unnorm = {s: leaked[s] * getattr(likelihood, s) for s in STAGES}
    z = sum(unnorm.values())
    if z <= 0.0:
        # Degenerate (likelihood orthogonal to prior) — fall back to the prior.
        return prior
    return StageProbabilities(**{s: unnorm[s] / z for s in STAGES})


def uniform_prior() -> StageProbabilities:
    return StageProbabilities(**{s: 0.25 for s in STAGES})
