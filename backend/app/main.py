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

from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .demo_data import mock_decision_record
from .models import AnalyzeRequest, DecisionRecord, ResetRequest, StageProbabilities, View
from .record_store import InMemoryRecordSink

app = FastAPI(title="Lighthome backend", version="0.1.0-mock")

# Person 2's Next.js dev server talks to this directly during the build.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory prior per session so the mock's posterior chains turn-to-turn and
# /session/reset has real meaning. The REAL pipeline will keep this in the
# StateStore (Contract D) instead — this dict is mock scaffolding only.
_PRIORS: dict[str, StageProbabilities] = {}

# RecordSink (Contract E). Person 1 only CALLS this; Person 3 swaps the in-memory
# implementation for the Redis-backed one at hour 8. The read/stream endpoints
# below consume it and do not change when that swap happens.
sink: InMemoryRecordSink = InMemoryRecordSink()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "mode": "mock", "version": app.version}


@app.post("/analyze-message")
def analyze_message(req: AnalyzeRequest, view: View = Query("parent")) -> dict:
    """Contract B. Returns a DecisionRecord projected to `parent` or `tns`."""
    prior = _PRIORS.get(req.session_id)
    record = mock_decision_record(
        session_id=req.session_id,
        turn=req.turn,
        text=req.text,
        prior=prior,
    )
    # The current posterior becomes the next message's prior.
    _PRIORS[req.session_id] = record.stage_probabilities
    sink.emit(record.model_dump())  # capture for the dashboard read/stream path
    return record.project(view)


@app.post("/session/reset")
def reset_session(req: ResetRequest) -> dict:
    """Replay control — wipe server state so a conversation restarts at turn 0."""
    _PRIORS.pop(req.session_id, None)
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
