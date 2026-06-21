"""Contracts D & E — the StateStore and RecordSink interfaces.

Person 1 codes the pipeline AGAINST these protocols and never imports a concrete
Redis/Arize class. Person 3 ships implementations (RedisStateStore /
DictStateStore, and a RecordSink that fans out to Redis + Arize + Sentry).
Wiring one vs the other at startup is the entire fallback story.
"""

from __future__ import annotations

from typing import Protocol, TypedDict


class SessionState(TypedDict):
    posterior: dict[str, float]      # current P over the four stages
    turn: int
    tallies: dict                    # per-speaker question counts, entities, vulnerability scores
    embeddings: list[list[float]]    # message-embedding history for boundary-recycle + velocity


class StateStore(Protocol):
    def get(self, session_id: str) -> SessionState | None: ...
    def set(self, session_id: str, state: SessionState) -> None: ...
    def reset(self, session_id: str) -> None: ...


class RecordSink(Protocol):
    def emit(self, record: dict) -> None: ...
    """Store in Redis, log to Arize, wrap in Sentry. Fire-and-forget."""

    def transcript(self, session_id: str) -> list[dict]: ...
    """Ordered DecisionRecords for a session — feeds the T&S transcript panel."""
