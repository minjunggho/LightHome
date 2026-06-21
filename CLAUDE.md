# Lighthome — Project Context & Working Agreement

> Drop this at the repo root. Claude Code and Cursor auto-detect `CLAUDE.md`,
> so it doubles as shared context for the team **and** for our AI coding tools.
> Interface specs live in **CONTRACTS.md** — read that before writing any code
> that crosses a role boundary.

---

## What we're building

**One-liner:** An AI system that detects the *shape* of an online grooming
conversation — not bad words, but the progression through documented predator
stages — and alerts a parent before anything explicit has been said.

**Core insight:** Grooming follows a staged arc — Trust → Isolation →
Desensitization → Escalation. Most systems wait for Stage 4 (explicit content)
because that's where the flagged words are. By then it's too late. The real
signal is the **transition from Stage 1 to Stage 2** — the structural shift from
friendly to isolating. That transition contains no flagged words. We catch it
there.

**Name:** Research shows a predator can move from first contact to high-risk
grooming in ~45 minutes. **Lighthome** catches it in those first minutes. Our
demo line: *we catch it at minute 12.*

---

## MVP scope (build exactly this)

- Four feature extractors: directionality, reciprocity, boundary recycling,
  escalation velocity
- Bayesian stage tracker (live probability distribution over four stages, not a
  binary label)
- Claude synthesis layer (features + message → stage likelihoods; one input
  among several, **not** the brain)
- Alert engine: fires only when **four** structural conditions hold at once
- Redis conversation state, Arize decision logging, Sentry error monitoring
- Parent dashboard: live probability bar, stage timeline, alert + guidance —
  **no raw messages**
- Platform T&S panel: flagged queue + full transcript + per-message feature
  decomposition
- **Three demo conversations:** grooming (fires), friendly adult (stays green),
  teen relationship saying "don't tell my mom" (stays green, with visible reason
  why)

**Do NOT build:** real platform ingestion, real monitoring, auto-blocking or
auto-reporting (always human-in-the-loop), voice analysis, auth/accounts, mobile.

---

## Tech stack

| Tool | Role | Sponsor prize |
|------|------|---------------|
| Python (spaCy, VADER/TextBlob, sentence-transformers) | Feature extraction | — |
| Claude API | Stage-likelihood synthesis | ✅ |
| Redis | Conversation state, arc tracking | ✅ |
| Arize | Decision observability / audit trail | ✅ |
| Sentry | Error + alert-event monitoring | ✅ |
| Next.js | Parent dashboard + T&S panel | — |

---

## Architecture (3 layers + observability)

```
[Message] 
   → 4 feature extractors (local Python, before Claude sees anything)
   → Claude synthesis (features + message → stage likelihoods)
   → Bayesian update (prior P → posterior P)
   → Alert engine (4 simultaneous conditions)
   → emit ONE DecisionRecord → {Redis state, Arize log, Sentry}
   → API projects to `parent` or `tns` view → frontend renders
```

The thing that makes this more than a prompt wrapper: the structural features are
computed **independently** of Claude, so when Claude is wrong the features can
overrule it — and that disagreement is visible in the Arize trace. That trace is
our single best technical-credibility moment.

---

## How we split the work

Each person owns one vertical lane. They meet only at the interfaces in
CONTRACTS.md.

### Person 1 — Backend / AI Pipeline Lead
Owns: FastAPI backend, the four feature extractors, Bayesian tracker, alert
engine, Claude synthesis, the `/analyze-message` endpoint. **Produces** the
`DecisionRecord`. Codes against the `StateStore` and `RecordSink` interfaces —
does **not** implement them. This person makes the technical complexity real and
**fields all technical Q&A** at judging (the Bayesian update equation,
"isn't this just a prompt," pulling up the Arize trace).

### Person 2 — Frontend / Demo UX Lead
Owns: Next.js app, parent dashboard, T&S panel, live probability bar, stage
timeline, demo message player. Builds the entire UI against mocked
`DecisionRecord`s from hour one — never blocked on the real pipeline. This person
makes the project look judge-ready.

### Person 3 — Integration / Reliability / Data Lead
Owns: the three demo conversation JSONs, Redis state storage, Arize logging,
Sentry, the test harness for all three demo cases, the Devpost technical writeup,
and the backup demo recording. **Implements** `StateStore` and `RecordSink`;
**consumes** the `DecisionRecord`. Person 1 reviews the Devpost technical claims
before submit so nothing misstates how the tracker works.

**Presenting:** decide now — one person drives the live message player, one
narrates. Person 1 takes technical Q&A regardless of who's narrating.

---

## The build flow

### Three principles

1. **Contract-first, mock-first.** Person 1's *first* commit is an
   `/analyze-message` route returning a hardcoded but schema-valid
   `DecisionRecord`. That unblocks Person 2 (build UI against it) and Person 3
   (build the consumer against it) immediately. At hour 8, swap the mock for the
   real pipeline behind the unchanged contract — nothing else breaks.

2. **Privacy by projection.** There is one internal `DecisionRecord`. The API
   serves two *views*: `parent` (probabilities, dominant stage, alert level,
   guidance — nothing else) and `tns` (the full record). "The parent never sees
   raw messages" is enforced at the API boundary, not by frontend convention.

3. **Demo scripts are an hour-zero input, not a deliverable.** Person 1 tunes
   extractors *against* the three conversations, so Person 3's very first action —
   before Redis, before anything — is shipping rough drafts of all three JSONs.

### Runtime sequence (per message)

```
client sends next message
  → StateStore.get(session_id)
  → run 4 extractors
  → Claude synthesis
  → Bayesian update (prior → posterior)
  → alert engine
  → assemble DecisionRecord
  → StateStore.set(...) + RecordSink.emit(record)
  → API projects to parent | tns
  → frontend renders
```

---

## Checkpoints (24h)

| When | Milestone | If we're behind |
|------|-----------|-----------------|
| **Hour 0–1** | Freeze the contracts. Person 1 ships mock `/analyze-message` + `fixtures/sample_records.json`. Person 3 ships rough drafts of all 3 conversation JSONs. | Nothing starts until contracts are frozen. |
| **Hour 8** | Backend runs end-to-end on the grooming conversation with the real pipeline. | Person 3 pairs onto extractors instead of polishing Sentry — a late Sentry costs nothing, a late pipeline costs everything. |
| **Hour 14** | Frontend talks to the live backend (both views). | Keep frontend on fixtures; wire the parent view first. |
| **Hour 17** | Full end-to-end on all three conversations; test harness green. | This is the make-or-break case — protect it. |
| **Hour 21** | Freeze. Record the backup demo video. Rehearse 3× out loud. | No new features after freeze. |

---

## Coordination rules (non-negotiable)

- **The detector NEVER reads `label`.** Ground truth is for the test harness
  only. Reading it in the pipeline is cheating and will be caught.
- **Producer/consumer boundary is sacred.** Person 1 produces the
  `DecisionRecord` and calls `StateStore` / `RecordSink`. Person 3 implements
  those and consumes the record. Neither edits the other's code.
- **One shared fixture file.** `fixtures/sample_records.json` holds one valid
  record per state (green / watch / fired). Everyone builds against it until the
  real pipeline lands at hour 8.
- **Sentry must do something real** — track alert events or pipeline failures,
  not a bare `init()`. It's the only sponsor prize with a guaranteed interview.

---

## Interfaces → see CONTRACTS.md

| Contract | Shape | Producer → Consumer |
|----------|-------|---------------------|
| A | Demo conversation file | Person 3 → Person 1 & 2 |
| B | `/analyze-message` request | Person 2 → Person 1 |
| C | `DecisionRecord` (+ `parent`/`tns` views) | Person 1 → everyone |
| D | `StateStore` | Person 1 calls → Person 3 implements |
| E | `RecordSink` | Person 1 calls → Person 3 implements |

---

## Fallback plan (rehearse these)

- **Claude API down:** pre-generate stage classifications for all three demo
  conversations, store locally; demo runs identically from cache.
- **Redis down:** `StateStore` swaps `RedisStateStore` → `DictStateStore` at
  startup. One line. No judge will know.
- **Arize down:** `RecordSink` logs to local JSON; show traces from file.
- **Anything breaks live:** play the 90-second backup video without panic.

---

## Framing to say out loud at judging

- "Prototype informed by published grooming research. A real version would need
  partnership with orgs like Thorn or NCMEC and extensive false-positive/negative
  testing." Costs 10 seconds, buys huge credibility.
- The demo conversations are clearly fictional, clearly labeled, and restrained.
  The **timeline visualization** is the visual focus, not the message content.
- The system never blocks, bans, or reports automatically. Always
  human-in-the-loop.
- The negative cases (friendly adult, teen relationship) are where we win or
  lose. Spend real time making them *visibly* stay green with the reason shown.

---

## For AI coding assistants (Claude Code / Cursor)

- Respect the producer/consumer boundary above. Do not inline Redis/Arize/Sentry
  calls into the pipeline — emit a `DecisionRecord` and call `RecordSink.emit`.
- Code the pipeline against the `StateStore` / `RecordSink` protocols in
  CONTRACTS.md, never against concrete Redis classes.
- The four extractors run **before** any Claude call and must not depend on it.
- Never read the `label` field from a conversation file inside detection code.
- Keep the `parent` projection strictly limited to the whitelisted fields — no
  `features`, no `claude`, no `raw_text`.
