# Lighthome — CONTRACTS

The interfaces between the three roles. Freeze these in **hour 0**. Once frozen,
each person mocks the others' outputs and works fully in parallel. Read
CLAUDE.md for the project and role context.

**How to use this doc:** Person 1 ships a mock `/analyze-message` that returns a
schema-valid `DecisionRecord` (Contract C) in hour one. Person 2 builds the UI
against it; Person 3 builds the storage/logging consumer against it. At hour 8
the mock is swapped for the real pipeline behind the same contract — no other
code changes.

---

## Shared vocabulary (fix once, never drift)

- **Stages:** `trust | isolation | desensitization | escalation`
- **Alert levels:** `none | watch | alert`
- **Conversation labels (ground truth, test-harness only):**
  `grooming | friendly_adult | teen_relationship`

All probability maps carry **all four** stage keys and **sum to 1.0**.

---

## Ownership map

| Contract | What it is | Produced by | Consumed by |
|----------|-----------|-------------|-------------|
| A | Demo conversation file | Person 3 | Person 1 (tune), Person 2 (player) |
| B | `/analyze-message` request | Person 2 | Person 1 |
| C | `DecisionRecord` + `parent`/`tns` views | Person 1 | Person 2, Person 3 |
| D | `StateStore` interface | Person 1 (calls) | Person 3 (implements) |
| E | `RecordSink` interface | Person 1 (calls) | Person 3 (implements) |

---

## Contract A — Demo conversation file

**Person 3 → Person 1 & Person 2.** One file per demo case, in `fixtures/`.

```json
{
  "conversation_id": "grooming_arc_01",
  "label": "grooming",
  "title": "First contact to isolation",
  "participants": {
    "A": { "role": "adult", "display": "Stranger" },
    "B": { "role": "minor", "display": "Jordan, 13" }
  },
  "messages": [
    { "turn": 0, "speaker": "A", "text": "...", "t_offset_sec": 0 },
    { "turn": 1, "speaker": "B", "text": "...", "t_offset_sec": 14 }
  ]
}
```

- `label` is **ground truth** for the test harness. The harness asserts
  `grooming` reaches `alert` and the other two stay `none`.
- **The detector must never read `label`.** That would be cheating.
- `t_offset_sec` powers the "minute 12 of 45" framing and the velocity story.
- Build three files: `grooming_arc_01`, `friendly_adult_01`,
  `teen_relationship_01`.

---

## Contract B — `/analyze-message` request

**Person 2's message player → Person 1's backend.** The server holds state per
`session_id`, so the client only ever sends the next message.

```
POST /analyze-message?view=parent        // or ?view=tns
```
```json
{
  "session_id": "demo-grooming-01",
  "turn": 7,
  "speaker": "A",
  "text": "...",
  "t_offset_sec": 312
}
```

Response: a `DecisionRecord` projected to the requested view (see Contract C).

**Also required — replay control for the live demo:**
```
POST /session/reset
```
```json
{ "session_id": "demo-grooming-01" }
```
Resets server state so a conversation can be replayed from turn 0 on stage.

---

## Contract C — `DecisionRecord`

**Person 1 emits one per message. This is the spine of the whole system.**

```json
{
  "schema_version": 1,
  "session_id": "demo-grooming-01",
  "turn": 7,
  "dominant_stage": "isolation",
  "prior_probabilities":  { "trust": 0.55, "isolation": 0.30, "desensitization": 0.10, "escalation": 0.05 },
  "stage_probabilities":  { "trust": 0.22, "isolation": 0.48, "desensitization": 0.20, "escalation": 0.10 },

  "features": {
    "directionality": 0.83,
    "disclosure_asymmetry": 0.79,
    "reciprocity": 0.28,
    "boundary_recycle": { "detected": true, "count": 2, "avg_gap_turns": 3.5 },
    "escalation_position": 0.41,
    "escalation_velocity": 0.06
  },

  "claude": {
    "stage_likelihoods": { "trust": 0.20, "isolation": 0.50, "desensitization": 0.20, "escalation": 0.10 },
    "rationale": "Questions are one-directional; no reciprocal disclosure.",
    "model": "claude-opus-4-8",
    "latency_ms": 820
  },

  "alert": {
    "level": "watch",
    "fired": false,
    "conditions": {
      "harmful_mass":   { "value": 0.78, "threshold": 0.75, "op": ">", "met": true },
      "directionality": { "value": 0.83, "threshold": 0.70, "op": ">", "met": true },
      "reciprocity":    { "value": 0.28, "threshold": 0.35, "op": "<", "met": true },
      "velocity":       { "value": 0.06, "threshold": 0.05, "op": ">", "met": true }
    },
    "reason": "all four structural conditions held"
  },

  "guidance": "This conversation is shifting toward isolation.",
  "raw_text": "...",
  "conversation_label": "grooming",
  "timestamp": "2026-06-20T19:14:03Z"
}
```

### Field notes

- **`prior_probabilities` + `stage_probabilities`** (posterior) together give
  Person 2 the "watch it shift — two more messages will clarify" animation, and
  give Arize the before/after delta to log.
- **`alert.conditions`** carries value + threshold + op + met per condition. This
  powers *both* the green/yellow/red bar *and* the false-positive answer: the
  teen-relationship case visibly shows `reciprocity 0.6` failing the `< 0.35`
  test, on screen, no hand-waving.
- **`alert.level`** semantics: `none` = green, `watch` = some conditions met
  (yellow), `alert` = `fired: true` (red).
- **`conversation_label`** is echoed for the T&S/debug view only. The detector
  still must not consume it upstream.

### The two projections (both derived from the one record)

The API returns one of these depending on `?view=`:

**`parent`** — whitelist, nothing else:
```json
{
  "dominant_stage": "isolation",
  "prior_probabilities": { "...": "..." },
  "stage_probabilities": { "...": "..." },
  "alert": { "level": "watch" },
  "guidance": "This conversation is shifting toward isolation."
}
```
No `features`, no `claude`, no `raw_text`, no `conditions`. Privacy is enforced
here, at the boundary.

**`tns`** — the full `DecisionRecord` above, for the moderator queue.

---

## Contract D — `StateStore`

**Person 1 codes against this. Person 3 implements it.** This is the line that
makes the "Redis down → in-memory dict" fallback a one-line swap.

```python
from typing import Protocol, TypedDict

class SessionState(TypedDict):
    posterior: dict[str, float]       # current P over the four stages
    turn: int
    tallies: dict                     # per-speaker question counts, entities, vulnerability scores
    embeddings: list[list[float]]     # message-embedding history for boundary-recycle + velocity

class StateStore(Protocol):
    def get(self, session_id: str) -> SessionState | None: ...
    def set(self, session_id: str, state: SessionState) -> None: ...
    def reset(self, session_id: str) -> None: ...
```

Person 3 ships two implementations satisfying this protocol:
`RedisStateStore` and `DictStateStore`. Wiring one vs the other at startup is the
entire fallback. Person 1 never knows which is active.

---

## Contract E — `RecordSink`

**Person 1 calls this once per message. Person 3 implements it.** Everything
sponsor-facing (Redis persistence, Arize logging, Sentry) lives behind `emit`.

```python
from typing import Protocol

class RecordSink(Protocol):
    def emit(self, record: dict) -> None: ...                  # store in Redis, log to Arize, wrap in Sentry
    def transcript(self, session_id: str) -> list[dict]: ...   # ordered DecisionRecords, feeds the T&S panel
```

- `emit` is fire-and-forget from Person 1's view: call it, move on.
- `transcript(session_id)` returns the ordered list of `DecisionRecord`s for a
  session — this is exactly what the T&S panel's full-transcript view renders.
- Sentry should track real signal here (alert events, pipeline exceptions), not a
  bare `init()`.

---

## Shared artifact — `fixtures/sample_records.json`

The one file that ties the parallel build together. Person 1 writes it in hour
one: one valid `DecisionRecord` per state.

```json
{
  "green":  { "...": "a record with alert.level = none, balanced probabilities" },
  "watch":  { "...": "the worked example in Contract C, alert.level = watch" },
  "fired":  { "...": "alert.level = alert, fired = true, all conditions met" }
}
```

Person 2 builds the dashboard against these three. Person 3 builds the
`RecordSink` consumer and Arize logging against these three. If the fixtures
render correctly in the UI and log correctly to Arize, the hour-8 integration is
nearly free.

---

## Validation checklist (run before hour 8)

- [ ] Every probability map has all four stage keys and sums to ~1.0
- [ ] `parent` projection contains zero of: `features`, `claude`, `raw_text`,
      `conditions`
- [ ] `alert.level` is consistent with `fired` (`alert` ⇒ `fired: true`)
- [ ] Detector code contains no read of `label` / `conversation_label`
- [ ] `DictStateStore` and `RedisStateStore` are interchangeable at startup
- [ ] `transcript(session_id)` returns records in turn order
- [ ] All three conversation files parse and the test harness asserts
      `grooming → alert`, `friendly_adult → none`, `teen_relationship → none`
