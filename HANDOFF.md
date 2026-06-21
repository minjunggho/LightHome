# Lighthome — Session Handoff

Continuation notes for a fresh Claude Code session (restarting to pick up the
`impeccable` design skill). Project: **Lighthome / "First 45"** — detects the
*shape* of an online grooming conversation (the structural shift trust →
isolation → desensitization → escalation) and alerts a parent before anything
explicit is said. Read `CLAUDE.md` and `CONTRACTS.md` at the repo root first.

## ▶ Immediate next task
**Design pass on the dashboard using the `impeccable` skill.** The dashboard was
unreadable (a Tailwind v4 + dark-mode CSS bug painted a black canvas with faded
text). That bug is **already fixed** (`frontend/app/globals.css` — locked a light
theme, removed the `prefers-color-scheme: dark` override). The layout is now a
working app-shell (sidebar + topbar + stat cards + card grid) but wants a real
design polish: typography scale, spacing/density, color hierarchy, and the
data-viz (probability bar, risk timeline, conditions table, stat cards).

Run the skill against `frontend/` — the design-relevant files are listed below.

## Git state (same machine — working tree persists across restart)
- **On branch `frontend-dashboard`** (PR **#5 OPEN** → base `main`).
- **Uncommitted local changes** (the app-shell redesign + the CSS fix) — NOT yet
  committed/pushed:
  - modified: `frontend/app/globals.css`, `app/page.tsx`, `app/parent/page.tsx`, `app/platform/page.tsx`
  - new: `frontend/components/AppShell.tsx`, `frontend/components/StatCard.tsx`
  - Decide whether to commit these to PR #5 before/after the design pass.
- `main` tip: `f157aae` (PR #4 merged). PRs #1–#4 merged (backend + integration).

## What's done & merged (on `main`)
- **Backend pipeline (Person 1)** — `backend/app/`:
  - Real pipeline behind `PIPELINE_MODE=live`: `features.py` (4 extractors) →
    `claude_synthesis.py` (Claude `messages.parse` + offline feature-fallback) →
    `bayes.py` → `alert.py` → `pipeline.py` assembles the `DecisionRecord`.
  - `main.py` Contract B endpoints + live SSE read path
    (`/analyze-message`, `/session/reset`, `/sessions`, `/session/{id}/latest`,
    `/transcript`, `/stream`). Loads `.env`.
  - `models.py` = Contract C (`DecisionRecord` + parent/tns projections).
  - `telemetry.py` = Phoenix tracing of the Claude call (wired & verified).
  - Integration bridges + demo loader reconcile with Person 3's code.
  - Tests: `cd backend && .venv/bin/python -m pytest tests -q` → 22 passed (mock);
    `PIPELINE_MODE=live ... pytest` → 24 passed. Acceptance gate (grooming→alert,
    friendly→none, teen→none) is green.
- **Frontend (PR #5, this branch)** — `frontend/`: API client, demo player,
  parent dashboard, T&S panel, shared viz components. Builds clean.

## How to run the full demo (this machine)
```bash
# Backend (live pipeline + Phoenix tracing — reads backend/.env)
cd backend && .venv/bin/python -m uvicorn app.main:app --port 8000
# Frontend
cd frontend && npm install && npm run dev      # http://localhost:3000
```
- `backend/.env` already has real `ANTHROPIC_API_KEY`, `CLAUDE_MODEL=claude-sonnet-4-5`,
  `PHOENIX_*` (Phoenix Cloud space `editstudio10`, project `LightHome`),
  `PIPELINE_MODE=live`. **It's gitignored — never commit it.**
- Frontend backend URL override: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).
- Verify build: `cd frontend && npm run build`.

## Frontend architecture (what the design pass touches)
- **Shell**: `components/AppShell.tsx` (sidebar nav + topbar), `components/StatCard.tsx`.
- **Pages**: `app/page.tsx` (Overview), `app/parent/page.tsx` (parent view),
  `app/platform/page.tsx` (T&S).
- **Viz components**: `ProbabilityBar`, `StageTimeline`, `AlertBadge`,
  `ConditionsTable`, `FeatureGrid`, `PlayerControls`; colors in `components/theme.ts`.
- **Data**: `lib/api.ts` (Contract B/C client + types), `lib/demos.ts` +
  `public/demos/*.json` (3 demo scripts), `lib/usePlayer.ts` (player state hook).
- Stack: Next.js 16 (App Router, Turbopack), React 19, Tailwind **v4**
  (`@import "tailwindcss"`, no config file). Geist fonts.

## Non-negotiable constraints (don't break in the redesign)
- **Privacy by projection**: the **parent view never shows raw messages** — only
  probabilities, dominant stage, alert level, guidance. The backend enforces this
  (parent projection whitelist); don't add message text to the parent UI.
- **The four-condition alert** (`harmful_mass`, `directionality`, `reciprocity`,
  `velocity` — all must hold) is the credibility centerpiece; the T&S
  `ConditionsTable` showing *which* condition held the teen case green is the
  key "no false positive" moment — keep it prominent.
- **Demo cases**: grooming → 🔴 alert; friendly adult & teen → 🟢 none.
- Tailwind v4 gotcha that caused the bug: un-layered CSS (e.g. `body {}`) beats
  layered utility classes. Keep theme in `:root`/`body`, don't reintroduce a
  dark-mode override.

## Project status / who's left
- Person 1 (backend) ✅, Frontend ✅ (PR #5, polishing now), Person 3
  (integration/data) ✅ demos+state+observability merged.
- **Remaining**: dashboard design polish (this task) → merge PR #5; Person 3's
  Devpost writeup + backup demo video; full end-to-end rehearsal.

## Optional ingestion (not on critical path)
`ingestion/photon/` — Photon/Spectrum iMessage → Contract B adapter (dry-run
default). BlueBubbles was discussed as a better fit but not built. Both are
off the demo critical path.
