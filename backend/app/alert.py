"""Alert engine — two independent routes to red.

1. STRUCTURAL route: all four structural conditions hold at once. This is the
   false-positive story — the teen-relationship case visibly fails the reciprocity
   test on screen, so it stays green with the reason shown.

2. AI-ARC route: the Bayesian stage tracker (driven by Claude + features) is
   overwhelmingly in the harmful stages. Some grooming is dangerous in MEANING,
   not surface structure — an offline-meeting + secrecy push on a one-sided stream
   trips none of the structural asymmetry tests, yet the tracked arc lands in
   isolation/escalation. The structural features can keep a conversation GREEN
   (false-positive guard); the AI-tracked arc can independently push it RED.

Each condition carries value + threshold + op + met, which is exactly what the
green/yellow/red bar renders.
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

# AI-arc route thresholds on the tracked posterior's harmful mass. Set above the
# 0.75 structural condition so this route only fires when the arc is *decisively*
# in harmful stages — the demo negatives top out far below (normal ~0.06,
# teen ~0.42), a confident grooming read lands ~0.9.
AI_ALERT_MASS = 0.80
AI_WATCH_MASS = 0.55

# A grooming "arc" is a progression through stages — you cannot be in the
# escalation stage on the literal first message. Claude's per-message stage
# numbers are stochastic and occasionally spike on a benign opener, so the
# AI-arc route requires a few messages of history before it can fire red. The
# structural route is naturally immune (velocity/directionality need history).
AI_ALERT_MIN_MESSAGES = 3

_OPS = {
    ">": lambda v, t: v > t,
    "<": lambda v, t: v < t,
    ">=": lambda v, t: v >= t,
    "<=": lambda v, t: v <= t,
    "==": lambda v, t: v == t,
}


def harmful_mass(posterior: StageProbabilities) -> float:
    return posterior.isolation + posterior.desensitization + posterior.escalation


def evaluate(
    features: Features,
    posterior: StageProbabilities,
    n_messages: int | None = None,
) -> Alert:
    """Build the Alert block from current features + posterior. `n_messages` is
    the conversation length so far; the AI-arc route stays quiet until an arc has
    had a few messages to form (cold-start guard)."""
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
    unmet = [n for n, c in conditions.items() if not c.met]
    hm = values["harmful_mass"]

    warmed_alert = n_messages is None or n_messages >= AI_ALERT_MIN_MESSAGES
    warmed_watch = n_messages is None or n_messages >= 2  # one message is never a trend
    structural_fired = met == total                    # route 1: all four structural conditions
    ai_fired = warmed_alert and hm >= AI_ALERT_MASS    # route 2: the tracked arc is decisively harmful
    fired = structural_fired or ai_fired

    # alert (red): either route fires. watch (yellow): a genuine structural trend
    # (>=2 of four) OR the arc is shifting toward harmful stages. none (green): at
    # most one isolated structural quirk and a calm arc — a single feature (e.g.
    # one-sided questioning in a healthy mutual chat) is not a trend, so it stays
    # green, with the per-condition breakdown still shown for "why".
    if structural_fired:
        level, reason = "alert", "all four structural conditions held"
    elif ai_fired:
        level = "alert"
        reason = (
            f"AI stage tracker is {hm:.0%} in harmful stages "
            f"(isolation/desensitization/escalation) — escalated on the tracked arc "
            f"even though the structural checklist held ({met}/{total})"
        )
    elif met >= 2:
        level = "watch"
        reason = f"{met}/{total} conditions met; held back by: {', '.join(unmet)}"
    elif warmed_watch and hm >= AI_WATCH_MASS:
        level = "watch"
        reason = (
            f"AI stage tracker is shifting toward harmful stages ({hm:.0%}); "
            f"structural checklist not yet corroborating ({met}/{total})"
        )
    else:
        level = "none"
        reason = (
            "no structural conditions met"
            if met == 0
            else f"only 1/{total} conditions met ({', '.join(n for n, c in conditions.items() if c.met)}); not a trend"
        )

    return Alert(level=level, fired=fired, conditions=conditions, reason=reason)
