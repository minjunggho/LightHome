"""FastAPI backend — Contract B endpoints + live-demo read/stream path.

HOUR 0/1 (now): `/analyze-message` returns a MOCK schema-valid DecisionRecord so
Persons 2 & 3 are unblocked. The mock holds per-session turn state so a
conversation can be replayed from turn 0 and the probability bar visibly shifts.

LIVE DEMO: judges text the iMessage adapter, which POSTs to /analyze-message. The
dashboard is a different client, so it READS via /session/{id}/latest,
/session/{id}/transcript, or subscribes to /session/{id}/stream (SSE) to update
the instant a text lands.

HOUR 8: swap `mock_decision_record` for the real pipeline
(features -> Claude synthesis -> Bayesian update -> alert engine) behind this same
contract. Nothing in this file's request/response shape changes.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os

from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from . import pipeline
from .demo_data import mock_decision_record
from .features import Message
from .models import AnalyzeRequest, DecisionRecord, ResetRequest, StageProbabilities, View
from .record_store import InMemoryRecordSink

logger = logging.getLogger(__name__)

# "mock" (turn-count ramp, content-blind) | "live" (real extractors + synthesis)
PIPELINE_MODE = os.getenv("PIPELINE_MODE", "mock").lower()

app = FastAPI(title="Lighthome backend", version="0.2.0")

# Person 2's Next.js dev server talks to this directly during the build.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Per-session prior (posterior chains turn-to-turn) and, in live mode, the
# conversation-so-far the extractors run over. In-process scaffolding; the real
# deployment keeps this in the StateStore (Contract D) via the bridge.
_PRIORS: dict[str, StageProbabilities] = {}
_HISTORY: dict[str, list[Message]] = {}

# RecordSink (Contract E). Person 1 only CALLS this. Default is the in-memory
# sink (mock/demo). Set STORE_BACKEND=integration to fan out to Person 3's Redis
# StateStore + Arize logger via the bridge — the read/stream endpoints below
# consume the same surface either way, so nothing else changes.
def _build_sink():
    if os.getenv("STORE_BACKEND", "memory").lower() != "integration":
        return InMemoryRecordSink()
    try:
        from .integration_bridge import BridgedRecordSink, run_async
        from .observability import ArizeLogger
        from .state import create_state_store

        store = run_async(create_state_store(os.getenv("REDIS_URL")))
        return BridgedRecordSink(store, ArizeLogger())
    except Exception:
        logger.exception("STORE_BACKEND=integration failed to initialize; "
                         "falling back to in-memory sink")
        return InMemoryRecordSink()


sink = _build_sink()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "mode": PIPELINE_MODE, "version": app.version}


@app.post("/analyze-message")
def analyze_message(req: AnalyzeRequest, view: View = Query("parent")) -> dict:
    """Contract B. Returns a DecisionRecord projected to `parent` or `tns`.

    PIPELINE_MODE=live runs the real pipeline (extractors -> Claude synthesis ->
    Bayesian update -> alert engine); otherwise the content-blind mock.
    """
    prior = _PRIORS.get(req.session_id)

    if PIPELINE_MODE == "live":
        msg: Message = {
            "turn": req.turn,
            "speaker": req.speaker,
            "text": req.text,
            "t_offset_sec": req.t_offset_sec,
        }
        history = _HISTORY.setdefault(req.session_id, [])
        history.append(msg)
        record = pipeline.analyze(req.session_id, history, prior)
    else:
        record = mock_decision_record(
            session_id=req.session_id, turn=req.turn, text=req.text, prior=prior
        )

    # The current posterior becomes the next message's prior.
    _PRIORS[req.session_id] = record.stage_probabilities
    sink.emit(record.model_dump())  # capture for the dashboard read/stream path
    return record.project(view)


@app.post("/session/reset")
def reset_session(req: ResetRequest) -> dict:
    """Replay control — wipe server state so a conversation restarts at turn 0."""
    _PRIORS.pop(req.session_id, None)
    _HISTORY.pop(req.session_id, None)
    sink.reset(req.session_id)
    return {"session_id": req.session_id, "reset": True}


# --- Live-demo read path (the dashboard consumes these) --------------------


@app.get("/sessions")
def list_sessions() -> list[dict]:
    """Active sessions, most-recently-active first. Lets the dashboard pick which
    judge's thread to follow (or auto-follow the latest texter)."""
    return sink.sessions()


@app.get("/session/{session_id}/latest")
def session_latest(session_id: str, view: View = Query("parent")) -> dict:
    """Most recent DecisionRecord for a session, projected to the view."""
    latest = sink.latest(session_id)
    if latest is None:
        return {}
    return DecisionRecord.model_validate(latest).project(view)


@app.get("/session/{session_id}/transcript")
def session_transcript(session_id: str, view: View = Query("tns")) -> list[dict]:
    """Ordered records for a session — feeds the T&S transcript panel."""
    return [DecisionRecord.model_validate(r).project(view) for r in sink.transcript(session_id)]


@app.get("/session/{session_id}/stream")
async def session_stream(session_id: str, request: Request, view: View = Query("parent")):
    """Server-Sent Events: push each new DecisionRecord as it is analyzed, so the
    dashboard lights up the instant a judge's text is processed.

    Frontend usage:  new EventSource(`${API}/session/${id}/stream?view=parent`)
    """

    async def event_generator():
        sent = 0
        # Replay anything already captured, then tail new records.
        while True:
            if await request.is_disconnected():
                break
            records = sink.transcript(session_id)
            while sent < len(records):
                projected = DecisionRecord.model_validate(records[sent]).project(view)
                yield f"data: {json.dumps(projected)}\n\n"
                sent += 1
            else:
                # Heartbeat keeps proxies/browsers from closing an idle stream.
                yield ": keep-alive\n\n"
            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
