# Lighthome

> Catch the *shape* of an online grooming conversation — not the bad words — and alert a parent before anything explicit is said.

Most safety systems wait for **Stage 4** (explicit content), because that's where the flagged words are. By then it's too late. Grooming follows a documented staged arc — **Trust → Isolation → Desensitization → Escalation** — and the real signal is the **Stage 1 → Stage 2 transition**: the structural shift from friendly to isolating. That transition contains *no flagged words*. Lighthome catches it there.

Research shows a predator can move from first contact to high-risk grooming in **~45 minutes**. Our demo line: **we catch it at minute 12.**

---

## How it works

```
[Message]
   → 4 feature extractors        (local Python, run BEFORE Claude sees anything)
   → Claude synthesis            (features + message → stage likelihoods)
   → Bayesian update             (prior P → posterior P over the 4 stages)
   → Alert engine                (fires only when 4 structural conditions hold at once)
   → ONE DecisionRecord          → { Redis state, Arize/Phoenix trace, Sentry }
   → API projects to a view      → parent | tns
   → frontend renders
```

The thing that makes this more than a prompt wrapper: the four structural features are computed **independently** of Claude, so when Claude is wrong the features can **overrule** it — and that disagreement is logged as a first-class, queryable signal in the Arize/Phoenix trace.

**Privacy by projection.** There is one internal `DecisionRecord`. The API serves two views — `parent` (probabilities, dominant stage, alert level, guidance — *nothing else*) and `tns` (the full record). "The parent never sees raw messages" is enforced at the **API boundary**, not by frontend convention.

The alert fires only when **all four** structural conditions hold simultaneously (`harmful_mass`, `directionality`, `reciprocity`, `velocity`). This is what keeps the negative cases green — a teen saying *"don't tell my mom"* does **not** trip the alert, and the T&S panel shows exactly *which* condition held it green.

---

## Tech stack

### Backend — Python / FastAPI
| Tool | Role |
|------|------|
| **FastAPI + Uvicorn** | `/analyze-message` API, live SSE stream, view projections |
| **Pydantic v2** | `DecisionRecord` contract + `parent`/`tns` projections |
| **spaCy** | directionality / linguistic feature extraction |
| **VADER (vaderSentiment)** | sentiment signal for the desensitization feature |
| **sentence-transformers** | embeddings for boundary-recycling + escalation velocity |
| **NumPy** | Bayesian stage tracker math |
| **pytest + httpx** | acceptance + contract test harness |

### Frontend — Next.js / React
| Tool | Role |
|------|------|
| **Next.js 16** (App Router, Turbopack) | parent dashboard, T&S panel, marketing landing |
| **React 19** | UI |
| **Tailwind CSS v4** | styling (CSS-first, no config file) |
| **Zustand** | client state |
| **Zod** | schema validation |
| **lucide-react** | icons |
| **OpenUI** (`@openuidev/*`) | generative-UI dashboard playground |

### Ingestion (optional, off the critical path)
- **`ingestion/photon/`** — Photon/Spectrum iMessage → Contract B adapter (TypeScript, dry-run by default).

---

## Sponsors & what we built with them

| Sponsor | How we used it |
|---------|----------------|
| **Anthropic (Claude)** | The **stage-likelihood synthesis layer**. Claude takes the message + the four locally-computed structural features and returns a probability distribution over the four grooming stages via `messages.parse()`. Crucially it is *one input among several, not the brain* — the structural features run before it and can overrule it. Offline feature-fallback keeps the demo running if the API is unavailable. |
| **Arize (Phoenix)** | **Decision observability / audit trail.** Every Claude synthesis call is captured as an OpenInference span (prompt, structural features in, stage likelihoods out, latency) via OTel auto-instrumentation. We log the **feature-vs-Claude disagreement** as first-class span attributes, making "the structure overruled the model" *queryable* in the Phoenix UI — our single best technical-credibility moment. |
| **Redis** | **Conversation state & arc tracking.** Holds per-session state across the message stream so the Bayesian tracker maintains a running prior. Coded behind a `StateStore` protocol — swaps to an in-memory `DictStateStore` with one line if Redis is down. |
| **Sentry** | **Error + alert-event monitoring.** Not a bare `init()` — it tracks real alert-fire events and pipeline failures so we can show live monitoring of the detection system itself. |

---

## Repository structure

```
lighthome/
├── CLAUDE.md                    # project context & working agreement (AI + team)
├── CONTRACTS.md                 # interface specs across role boundaries (A–E)
├── PRODUCT.md                   # users, brand, design principles
├── HANDOFF.md                   # session/state handoff notes
│
├── backend/                     # Person 1 — FastAPI backend + AI pipeline
│   ├── app/
│   │   ├── main.py              # Contract B endpoints + live SSE read path
│   │   ├── models.py            # Contract C: DecisionRecord + parent/tns views
│   │   ├── features.py          # the 4 feature extractors (run before Claude)
│   │   ├── claude_synthesis.py  # Claude messages.parse() + feature fallback
│   │   ├── bayes.py             # Bayesian stage tracker (prior → posterior)
│   │   ├── alert.py             # 4-condition alert engine
│   │   ├── pipeline.py          # assembles the DecisionRecord
│   │   ├── embeddings.py        # sentence-transformers helpers
│   │   ├── protocols.py         # StateStore / RecordSink interfaces (Contracts D/E)
│   │   ├── state.py             # Redis-backed conversation state
│   │   ├── record_store.py      # RecordSink implementation
│   │   ├── telemetry.py         # Arize/Phoenix tracing of the Claude call
│   │   ├── observability.py     # disagreement-signal logging + local trace sink
│   │   ├── integration_bridge.py# reconciles pipeline ↔ integration lane
│   │   └── demo_loader.py       # loads the 3 demo conversations
│   ├── scripts/                 # replay.py, sentry_test.py
│   ├── tests/                   # acceptance, contract, demo-conversation tests
│   └── requirements.txt
│
├── frontend/                    # Person 2 — Next.js dashboard + T&S panel
│   ├── app/
│   │   ├── (marketing)/         # lighthouse landing page
│   │   ├── dashboard/           # overview
│   │   ├── parent/              # parent view (no raw messages)
│   │   ├── platform/            # Trust & Safety panel
│   │   └── api/chat/            # gen-UI chat route
│   ├── components/              # ProbabilityBar, StageTimeline, AlertBadge,
│   │   │                        #   ConditionsTable, AppShell, genui/*, …
│   ├── lib/
│   │   ├── api.ts               # Contract B/C client + types
│   │   ├── demos.ts             # 3 demo scripts
│   │   ├── usePlayer.ts         # demo message-player state
│   │   └── openui/              # OpenUI generative-UI playground
│   └── public/demos/            # demo conversation JSONs
│
├── ingestion/photon/            # optional iMessage → Contract B adapter (TS)
├── demo/                        # 3 demo conversations (grooming / adult / teen)
├── fixtures/                    # sample_records.json (one record per state)
└── docs/                        # architecture, devpost, pitch, reconciliation
```

---

## Running it

```bash
# Backend — live pipeline + Phoenix tracing (reads backend/.env)
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --port 8000

# Frontend
cd frontend
npm install
npm run dev            # http://localhost:3000
```

Environment:
- `backend/.env` — `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `PHOENIX_*` (Arize Phoenix), `REDIS_URL`, `SENTRY_DSN`, `PIPELINE_MODE=live`. See `backend/.env.example`. **Gitignored — never commit it.**
- `frontend` — `NEXT_PUBLIC_API_URL` overrides the backend URL (default `http://localhost:8000`).

### Tests
```bash
cd backend && .venv/bin/python -m pytest tests -q          # mock pipeline
PIPELINE_MODE=live .venv/bin/python -m pytest tests -q     # live pipeline
```
The acceptance gate asserts the three demo outcomes: **grooming → alert 🔴**, **friendly adult → none 🟢**, **teen relationship → none 🟢**.

---

## Demo cases

Three clearly-fictional, clearly-labeled, restrained conversations:
1. **Grooming** — fires the alert (~message 12).
2. **Friendly adult** — stays green.
3. **Teen relationship** ("don't tell my mom") — stays green, with the reason visibly shown.

The system **never** blocks, bans, or reports automatically — always human-in-the-loop.

---

*Prototype informed by published grooming research. A production version would require partnership with organizations like Thorn or NCMEC and extensive false-positive/negative testing.*
