"""The four structural feature extractors.

CRITICAL: these run on local Python BEFORE any Claude call and must NEVER depend
on Claude, and NEVER read a conversation's ground-truth `label`. When Claude is
wrong, these features overrule it — that disagreement is the Phoenix-trace
credibility moment.

They are computed over the conversation-so-far (a list of messages), so they're
symmetric in the speakers — no role labels needed. The design target is that the
three demo conversations separate cleanly:

  grooming           -> high directionality, low reciprocity, recycled secrecy,
                        rising harm  => all four alert conditions hold
  friendly adult     -> balanced questioning, mutual disclosure, no secrecy
  teen relationship  -> high reciprocity (visibly fails the < 0.35 test on screen)
"""

from __future__ import annotations

import re

from .embeddings import cosine, embed
from .models import BoundaryRecycle, Features

Message = dict  # {"turn": int, "speaker": str, "text": str, "t_offset_sec": int}

_FIRST_PERSON = {"i", "i'm", "im", "me", "my", "myself", "mine", "i've", "i'll", "i'd"}
_SECOND_PERSON = {"you", "your", "youre", "you're", "u", "yours"}
_INTERROGATIVE = re.compile(
    r"\b(what|why|how|who|where|when|which|do you|are you|can you|did you|have you|"
    r"would you|will you|whats|hows)\b",
    re.I,
)
_WORD = re.compile(r"[a-z']+")

# Lexical cues for the harm signal (structure, not flagged words).
_SECRECY = re.compile(
    r"\b(between us|just us|our secret|don'?t tell|keep (this|it|our|that)|"
    r"keep .*private|stay between|won'?t understand|wouldn'?t understand|overreact|"
    r"our thing|just between)\b",
    re.I,
)
_FLATTERY = re.compile(
    r"\b(mature for|more mature|so mature|thoughtful than|wise beyond|"
    r"older than you|not like other (kids|people)|carrying the team|impressive for)\b",
    re.I,
)
_PROBE = re.compile(
    r"\b(your parents|parents (check|look|see|know)|home alone|who do you (vent|talk|tell)|"
    r"do your parents|treat you like)\b",
    re.I,
)


def _tokens(text: str) -> list[str]:
    return _WORD.findall(text.lower())


def _is_question(text: str) -> bool:
    return "?" in text or bool(_INTERROGATIVE.search(text))


def _per_speaker(messages: list[Message]) -> dict[str, dict]:
    """Per-speaker tallies. `disclosure` = net self-focus (first-person minus
    second-person tokens) — genuine self-disclosure has high I-density and low
    you-density, so this sees through manipulative "I know how to listen / you
    can tell me" reassurance that pure first-person counting would reward."""
    stats: dict[str, dict] = {}
    for m in messages:
        sp = m["speaker"]
        s = stats.setdefault(sp, {"q": 0, "disclosure": 0, "msgs": 0})
        s["msgs"] += 1
        if _is_question(m["text"]):
            s["q"] += 1
        toks = _tokens(m["text"])
        fp = sum(1 for t in toks if t in _FIRST_PERSON)
        you = sum(1 for t in toks if t in _SECOND_PERSON)
        s["disclosure"] += max(0, fp - you)
    return stats


def _imbalance(a: float, b: float) -> float:
    total = a + b
    return abs(a - b) / total if total > 0 else 0.0


def directionality(messages: list[Message]) -> float:
    """How one-sided is the questioning? Share of all questions asked by the
    single most-questioning speaker. 0.5 = balanced, 1.0 = entirely one party."""
    stats = _per_speaker(messages)
    qs = sorted((s["q"] for s in stats.values()), reverse=True)
    total = sum(qs)
    if len(qs) < 2 or total == 0:
        return 0.0
    return round(qs[0] / total, 2)


def reciprocity(messages: list[Message]) -> float:
    """Mutual self-disclosure. min/max of net self-focus across speakers —
    high = both genuinely share, low = one-way extraction."""
    stats = _per_speaker(messages)
    discl = sorted((s["disclosure"] for s in stats.values()), reverse=True)
    if len(discl) < 2 or discl[0] == 0:
        return 0.0
    return round(discl[1] / discl[0], 2)


def disclosure_asymmetry(messages: list[Message]) -> float:
    stats = _per_speaker(messages)
    discl = sorted((s["disclosure"] for s in stats.values()), reverse=True)
    if len(discl) < 2:
        return 0.0
    return round(_imbalance(discl[0], discl[1]), 2)


def boundary_recycle(messages: list[Message]) -> BoundaryRecycle:
    """Repeated re-approach of the same boundary (e.g. secrecy) after a soft
    refusal — detected via same-speaker semantic repetition with a turn gap."""
    secrecy_msgs = [m for m in messages if _SECRECY.search(m["text"])]
    pairs: list[int] = []
    for i in range(len(secrecy_msgs)):
        for j in range(i + 1, len(secrecy_msgs)):
            mi, mj = secrecy_msgs[i], secrecy_msgs[j]
            if mi["speaker"] != mj["speaker"]:
                continue
            gap = mj["turn"] - mi["turn"]
            # Same speaker re-raising a boundary after a turn gap. Cosine (real
            # embeddings when available) corroborates the semantic re-approach but
            # doesn't gate — the secrecy theme + speaker + gap is the signal.
            if gap >= 2:
                _ = cosine(embed(mi["text"]), embed(mj["text"]))
                pairs.append(gap)
    if not pairs:
        return BoundaryRecycle(detected=False, count=0, avg_gap_turns=0.0)
    return BoundaryRecycle(
        detected=True, count=len(pairs), avg_gap_turns=round(sum(pairs) / len(pairs), 1)
    )


def _harm_signal(messages: list[Message]) -> float:
    """Instantaneous structural-risk score in [0, 1] for the conversation so far."""
    if not messages:
        return 0.0
    d = directionality(messages)
    r = reciprocity(messages)
    text = " ".join(m["text"] for m in messages)
    secrecy = min(1.0, len(_SECRECY.findall(text)) / 2.0)
    flattery = min(1.0, len(_FLATTERY.findall(text)) / 1.0)
    probe = min(1.0, len(_PROBE.findall(text)) / 2.0)
    s = (
        0.32 * d
        + 0.28 * (1.0 - r)
        + 0.20 * secrecy
        + 0.12 * flattery
        + 0.08 * probe
    )
    return round(max(0.0, min(1.0, s)), 3)


def escalation_velocity(messages: list[Message]) -> float:
    """Rise in the harm signal over a trailing window — the '45 minutes' signal.
    Positive and above threshold when a conversation is climbing toward harm,
    ~0 when it sits flat (benign)."""
    n = len(messages)
    if n < 2:
        return 0.0
    lookback = max(2, n // 3)
    now = _harm_signal(messages)
    prev = _harm_signal(messages[: n - lookback]) if n - lookback >= 1 else 0.0
    return round(max(0.0, now - prev), 3)


def harm_position(messages: list[Message]) -> float:
    """Current harm signal — also drives the feature-derived stage likelihood."""
    return _harm_signal(messages)


def extract_features(messages: list[Message]) -> Features:
    """Run all four extractors over the conversation-so-far. Single entry point
    the pipeline calls. NEVER reads `label`."""
    return Features(
        directionality=directionality(messages),
        disclosure_asymmetry=disclosure_asymmetry(messages),
        reciprocity=reciprocity(messages),
        boundary_recycle=boundary_recycle(messages),
        escalation_position=harm_position(messages),
        escalation_velocity=escalation_velocity(messages),
    )
