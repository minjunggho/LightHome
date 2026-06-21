"""Arize Phoenix tracing for the Claude synthesis call.

Captures every Anthropic `messages.parse()` call as an OpenInference span — the
prompt, the structural features fed in, the returned stage likelihoods, and the
latency — and exports it to Phoenix. That trace is the "structural features
overruled Claude" credibility moment from the architecture.

Configured by PHOENIX_API_KEY / PHOENIX_PROJECT / PHOENIX_COLLECTOR_ENDPOINT.
Everything here is best-effort: if the deps or env vars are missing, tracing is a
no-op and the pipeline runs unchanged.

Lane note: observability is Person 3's domain. This module only wires the tracer +
auto-instrumentor so Person 1's Claude call shows up in Phoenix; Person 3 owns the
broader observability config and can extend it.
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)

_initialized = False


def init_tracing() -> bool:
    """Set up Phoenix/OTel tracing + Anthropic auto-instrumentation. Idempotent.
    Returns True if tracing was enabled, False if skipped."""
    global _initialized
    if _initialized:
        return True

    endpoint = os.getenv("PHOENIX_COLLECTOR_ENDPOINT")
    if not endpoint:
        logger.info("PHOENIX_COLLECTOR_ENDPOINT unset — Claude synthesis tracing disabled")
        return False

    try:
        from phoenix.otel import register
        from openinference.instrumentation.anthropic import AnthropicInstrumentor

        api_key = os.getenv("PHOENIX_API_KEY")
        if api_key:
            # Phoenix Cloud expects the key on the OTLP headers.
            os.environ.setdefault("PHOENIX_CLIENT_HEADERS", f"api_key={api_key}")
            os.environ.setdefault("OTEL_EXPORTER_OTLP_HEADERS", f"api_key={api_key}")

        tracer_provider = register(
            project_name=os.getenv("PHOENIX_PROJECT", "lighthome"),
            endpoint=endpoint,
            auto_instrument=False,
        )
        AnthropicInstrumentor().instrument(tracer_provider=tracer_provider)
        _initialized = True
        logger.info("Phoenix tracing enabled -> %s", endpoint)
        return True
    except Exception:
        logger.exception("Phoenix tracing setup failed; continuing without it")
        return False
