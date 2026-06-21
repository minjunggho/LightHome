# LightHome

## Inspiration

Online grooming often does not begin with explicit language. The early danger can be the shift from friendly rapport into isolation, secrecy, and boundary testing. LightHome was built around the idea of catching that dangerous pattern earlier, before a conversation becomes explicit.

## What it does

LightHome analyzes the shape of a conversation over time instead of scanning only for bad words. It tracks structural signals such as directionality, reciprocity, boundary recycling, escalation velocity, and instrumentalized flattery. The system maintains stage probabilities across trust-building, isolation, desensitization, and escalation. It alerts only when multiple structural conditions line up, helping avoid simplistic keyword-based decisions. LightHome includes a privacy-respecting parent dashboard and a platform trust-and-safety view for human moderator review.

## How we built it

We built LightHome as an explainable safety prototype with separate layers for feature extraction, stage tracking, synthesis, storage, and observability. Claude is used as a synthesis layer, not the whole classifier: the system computes structural features before Claude sees the message, then combines those signals with probabilistic stage tracking.

- Python and FastAPI for the backend API
- Custom feature extractors for conversation dynamics
- A Bayesian stage tracker for prior and posterior risk estimates
- Claude API for structured synthesis of the decision trace
- Redis state storage with an in-memory fallback for demos
- Arize-style observability with local JSONL fallback traces
- Sentry initialization for error monitoring when configured
- Next.js and Tailwind CSS for the parent and trust-and-safety views

## Challenges we ran into

One challenge was avoiding a keyword-only detector. We wanted LightHome to recognize structural movement, such as one person extracting information, reducing support systems, and recycling boundaries, without overreacting to harmless surface language.

Another challenge was designing negative demos that should not trigger. The teen relationship case was especially important because it includes casual secrecy language, but the underlying structure is mutual, age-peer, and non-coercive.

We also had to keep the demo restrained and safe while still making the risky pattern visible, and we built fallback layers so Redis, Arize, or Sentry failures would not break the hackathon demo.

## Accomplishments that we're proud of

- We built three clear demo cases: a grooming arc that should trigger, a normal adult-child conversation that should not trigger, and a teen relationship false-positive case that should not trigger.
- We made the decision trace explainable, with raw features, stage likelihoods, Bayesian priors and posteriors, alert status, and alert reasons.
- We designed a parent view that can communicate risk progression without exposing raw private messages.

## What we learned

The hardest part is not detecting obvious bad content. The hard part is distinguishing similar surface language from different underlying structures, such as casual teen privacy versus adult-driven isolation. Safety tools need uncertainty, explainability, and human review instead of pretending that a single model score is enough.

## What's next for LightHome

Next, we would test LightHome against larger research datasets and improve false-positive and false-negative evaluation. Before any real deployment, we would want to partner with child safety organizations such as Thorn or NCMEC and work toward platform-level integration with trained human moderators. We would also expand the evaluation process with expert review, privacy review, and more realistic multi-turn scenarios.

## Safety and deployment note

Built and demoed entirely on fictional scenarios. Real deployment requires partnership with child safety organizations.

LightHome does not automatically ban, block, or report users. It is a prototype, not a replacement for professional child safety work. Any real deployment would require expert review, privacy review, and rigorous evaluation.
