"""Alert engine — fires ONLY when all four structural conditions hold at once.

The four-condition AND is the whole false-positive story: the teen-relationship
case visibly fails the reciprocity test on screen, so it stays green with the
reason shown. Each condition carries value + threshold + op + met, which is
exactly what the green/yellow/red bar renders.
"""

from __future__ import annotations

from .models import Alert, AlertCondition, Features, StageProbabilities

# (op, threshold) per condition. Tuned against the demo conversations.
THRESHOLDS: dict[str, tuple[str, float]] = {
    "harmful_mass": (">", 0.75),    # P(isolation+desens+escalation)
    "directionality": (">", 0.70),  # one-sided questioning
    "reciprocity": ("<", 0.35),     # lack of mutual disclosure
    "velocity": (">", 0.05),        # speed of stage progression
}

_OPS = {
    ">": lambda v, t: v > t,
    "<": lambda v, t: v < t,
    ">=": lambda v, t: v >= t,
    "<=": lambda v, t: v <= t,
    "==": lambda v, t: v == t,
}


def harmful_mass(posterior: StageProbabilities) -> float:
    return posterior.isolation + posterior.desensitization + posterior.escalation


def evaluate(features: Features, posterior: StageProbabilities) -> Alert:
    """Build the Alert block from current features + posterior."""
    values = {
        "harmful_mass": round(harmful_mass(posterior), 2),
        "directionality": features.directionality,
        "reciprocity": features.reciprocity,
        "velocity": features.escalation_velocity,
    }

    conditions: dict[str, AlertCondition] = {}
    for name, value in values.items():
        op, threshold = THRESHOLDS[name]
        conditions[name] = AlertCondition(
            value=value, threshold=threshold, op=op, met=_OPS[op](value, threshold)
        )

    met = sum(c.met for c in conditions.values())
    total = len(conditions)
    fired = met == total
    unmet = [n for n, c in conditions.items() if not c.met]

    # alert (red) = all four hold. watch (yellow) = a genuine trend (>=2 of the
    # four). none (green) = at most one isolated condition — a single structural
    # quirk (e.g. one-sided questioning in a healthy mutual chat) is not a trend,
    # so it stays green, with the per-condition breakdown still shown for "why".
    if fired:
        level, reason = "alert", "all four structural conditions held"
    elif met >= 2:
        level = "watch"
        reason = f"{met}/{total} conditions met; held back by: {', '.join(unmet)}"
    else:
        level = "none"
        reason = (
            "no structural conditions met"
            if met == 0
            else f"only 1/{total} conditions met ({', '.join(n for n, c in conditions.items() if c.met)}); not a trend"
        )

    return Alert(level=level, fired=fired, conditions=conditions, reason=reason)
