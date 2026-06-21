# Product

## Register

product

## Users

Two operators of one detection system, each seeing a different projection of the
same `DecisionRecord`:

- **Parents** — non-technical, anxious, checking in. They need a calm,
  trustworthy read on whether their child's conversations are safe, with plain
  guidance. They never see raw messages (privacy by projection, enforced at the
  API). The job: *"is something wrong, and what do I do?"* — answered in seconds.
- **Trust & Safety analysts** — fluent in moderation tools, working a queue.
  They need the full record: transcript, the four structural features, and the
  four-condition alert logic. The job: *"why did this fire (or not), and can I
  defend the decision?"*

Plus a third audience for the demo itself: **hackathon judges**, watching the arc
unfold live on a projector. The timeline visualization — not the message content —
is the visual focus.

## Product Purpose

Lighthome detects the *shape* of an online grooming conversation — the structural
progression Trust → Isolation → Desensitization → Escalation — and alerts a
parent at the Stage 1→2 transition, before anything explicit is said. Four feature
extractors run independently of Claude, so the structure can overrule the model;
that disagreement is auditable. Success: the grooming case fires (~message 12),
and the two negative cases (friendly adult, teen relationship) stay green with the
reason visible on screen.

## Brand Personality

Calm, vigilant, approachable. Three words: **trustworthy, modern, humane.**
The visual register is a *soft watch console* — a clean, light, rounded
monitoring app (the whole UI floats as one rounded panel on a soft gray page,
with a light sidebar, hairline-divided columns, gentle shadows, and a friendly
blue accent). It feels current and unintimidating — a parent or analyst should
trust it on sight — while the content stays composed and never sensational.
Gravity lives in the data and the copy, not in a heavy or clinical skin.

## Anti-references

- **Dated / "enterprise" heaviness** — hard 1px rings on every card, dark
  command rails, cramped type, sharp corners, gray-on-gray. The build read "old";
  the fix is the soft light direction above.
- **Alarmist / true-crime aesthetic** — red everywhere, sirens, fear. The subject
  is grave; the tool stays composed.
- **Cheerful productivity-app tone** — the look is friendly and modern, but the
  voice is not playful. No confetti, mascots, or upbeat empty-state jokes.

## Design Principles

1. **The instrument is the hero.** The probability distribution, the risk
   trajectory, and the four-condition table are the credibility centerpieces.
   They get the space, contrast, and motion; everything else recedes.
2. **Composure over alarm.** A grave domain handled with a steady hand. Color and
   motion convey state and earn attention; they never sensationalize.
3. **Show the disagreement.** The whole technical claim is "features can overrule
   Claude." Make structure, model, and verdict legible side by side — especially
   *why a case stayed green.*
4. **Privacy by projection, visibly.** The parent view's restraint is a feature,
   not a limitation — design it as deliberate, not empty.
5. **Legible under pressure.** It will be read on a projector, live, in seconds.
   Bias toward strong contrast and clear hierarchy over subtle detail.
6. **Modern and unintimidating.** Light surfaces, generous rounding, soft
   shadows, one friendly blue accent. The craft signals "current and
   trustworthy" without ever turning the subject matter cheerful.

## Accessibility & Inclusion

- WCAG 2.1 **AA** for all text (body ≥ 4.5:1, large ≥ 3:1). No muted gray body
  text on tinted near-white — the prior build's main failure.
- Status is never conveyed by color alone (labels + position accompany every
  stage/alert color).
- All motion has a `prefers-reduced-motion` fallback.
- Light surface only; do **not** reintroduce a `prefers-color-scheme: dark`
  override (it silently inverted the theme before).
</content>
</invoke>
