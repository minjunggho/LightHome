# Contract reconciliation: `person1-backend` ↔ `integration`

The two lanes merge cleanly (no git conflicts) but Person 3's implementations
drifted from the frozen contracts. Rather than have either side rewrite, the drift
is absorbed by **adapters on the backend side**. Person 1's pipeline keeps coding
against the clean Contract D/E; the adapters translate to Person 3's code.

## The drift

| Contract | Frozen (Person 1 codes to) | `integration` (Person 3 shipped) |
|---|---|---|
| **D — StateStore** | sync `get/set/reset(session_id)`, `SessionState` | async `save_conversation_state / get_conversation_state / append_turn / get_all_turns / delete_conversation(conversation_id)` |
| **E — RecordSink** | `emit(record)` / `transcript(session_id)` | `ArizeLogger.log_classification(convo_id, turn, data)` + `init_sentry()`; transcript folded into StateStore |
| **A — demo JSON** | `conversation_id`, `label`, `t_offset_sec`, A/B speakers | `id`, `expected_alert` + `expected_reason`, `timestamp_offset_seconds`, named speakers, per-msg `stage_hint`, 1-indexed turns |

## How it's reconciled (this branch)

- **`backend/app/demo_loader.py`** — reads *either* demo schema and returns one
  normalized shape. `scripts/replay.py` and `tests/test_acceptance.py` use it, so
  they work on Person 3's `demo/*.json` (acceptance now asserts against
  `expected_alert` instead of `label`).
- **`backend/app/integration_bridge.py`**
  - `BridgedStateStore` — Person 1's sync `get/set/reset` over Person 3's async
    store (`session_id` ↔ `conversation_id`).
  - `BridgedRecordSink` — Person 1's `emit`/`transcript` (+ the demo read helpers
    `latest`/`reset`/`sessions`) over Person 3's StateStore turn-list + ArizeLogger.
  - Async is driven from sync FastAPI handlers via a dedicated background loop.
- **`backend/app/main.py`** — sink is pluggable. Default `STORE_BACKEND=memory`
  (mock/demo, unchanged). `STORE_BACKEND=integration` fans out to Person 3's Redis
  StateStore + Arize logger through the bridge; the read/stream endpoints are
  identical either way. Falls back safely if Redis/Arize are unavailable.

## Still a team decision

These adapters keep Contracts D/E **canonical** and adapt to Person 3's code. If
the team would rather adopt Person 3's shapes as canonical instead, update
`protocols.py` + `CONTRACTS.md` and drop the adapters. Either way, `CONTRACTS.md`
should be updated to reflect the agreed shapes — the "freeze at hour 0" rule
slipped and the doc is now ahead of reality.
