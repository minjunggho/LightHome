# Backend — Lighthome (Person 1)

FastAPI backend + AI pipeline. Produces the `DecisionRecord` (Contract C).

## Status
- **Hour 0/1 — DONE:** mock `/analyze-message` (both views) + `/session/reset`,
  `fixtures/sample_records.json`, contract models & protocols, contract tests.
- **Hour 1–8 — TODO:** real pipeline — implement `features.py`,
  `claude_synthesis.py`, wire `bayes.py` + `alert.py` into the runtime sequence.
  Swap `mock_decision_record` for the real pipeline behind the unchanged contract.

## Run the mock
```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

```bash
# parent view (whitelisted) | tns view (full record)
curl "localhost:8000/analyze-message?view=parent" -H 'content-type: application/json' \
  -d '{"session_id":"demo-grooming-01","turn":8,"speaker":"A","text":"keep this between us","t_offset_sec":312}'

curl localhost:8000/session/reset -H 'content-type: application/json' \
  -d '{"session_id":"demo-grooming-01"}'
```
The mock holds per-session state, so replaying a session ramps green → watch → alert.

## Tests (CONTRACTS.md validation checklist, as code)
```bash
cd backend && .venv/bin/python -m pytest tests -q
```

## Module map
| File | Role |
|------|------|
| `app/models.py` | Contract C — `DecisionRecord`, `StageProbabilities`, projections |
| `app/protocols.py` | Contracts D & E — `StateStore`, `RecordSink` (Person 3 implements) |
| `app/main.py` | Contract B — `/analyze-message`, `/session/reset` |
| `app/demo_data.py` | Mock record generator + the 3 canonical fixtures |
| `app/features.py` | 4 extractors (run before Claude; never read `label`) — TODO |
| `app/claude_synthesis.py` | Claude stage-likelihood synthesis — TODO |
| `app/bayes.py` | Bayesian prior→posterior update — DONE |
| `app/alert.py` | 4-condition alert engine — DONE |
