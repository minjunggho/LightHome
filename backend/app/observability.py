from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


logger = logging.getLogger(__name__)

LOCAL_TRACE_PATH = Path("logs/arize_traces.jsonl")


def _disagreement_signals(data: dict[str, Any]) -> dict[str, Any]:
    """Compute the feature-vs-Claude disagreement from a DecisionRecord dict.

    This is the signal CLAUDE.md calls our 'single best technical-credibility
    moment': the structural features are computed INDEPENDENTLY of Claude, so when
    they pick a different stage the trace shows the model being overruled. Logging
    it as first-class attributes makes that queryable/filterable in Arize Phoenix
    instead of buried inside the raw record."""
    try:
        from .claude_synthesis import feature_likelihood
        from .models import STAGES, Features, StageProbabilities

        feats = data.get("features")
        claude = (data.get("claude") or {}).get("stage_likelihoods")
        if not feats or not claude:
            return {}

        structural = feature_likelihood(Features.model_validate(feats))
        claude_dist = StageProbabilities.model_validate(claude)
        posterior_dom = data.get("dominant_stage")
        s_dom = structural.dominant()
        c_dom = claude_dist.dominant()
        l1 = sum(abs(getattr(structural, s) - getattr(claude_dist, s)) for s in STAGES)

        return {
            "disagreement.structural_dominant": s_dom,
            "disagreement.claude_dominant": c_dom,
            "disagreement.posterior_dominant": posterior_dom,
            "disagreement.structural_vs_claude_l1": round(l1, 4),
            "disagreement.structural_disagrees_with_claude": s_dom != c_dom,
            "disagreement.features_overruled_claude": (
                posterior_dom is not None and posterior_dom != c_dom
            ),
        }
    except Exception:
        logger.exception("disagreement computation failed")
        return {}


class ArizeLogger:
    """Log classification traces to Arize Phoenix (OTel) and mirror them to JSONL.

    Phoenix is configured via PHOENIX_COLLECTOR_ENDPOINT. When it is unset or the
    OTel packages are unavailable, logging degrades to the local JSONL file so the
    pipeline and demo still produce an inspectable decision trail offline."""

    def __init__(self) -> None:
        self.phoenix_endpoint = os.getenv("PHOENIX_COLLECTOR_ENDPOINT")
        self.phoenix_api_key = os.getenv("PHOENIX_API_KEY")
        self.phoenix_project = (
            os.getenv("PHOENIX_PROJECT")
            or os.getenv("PHOENIX_PROJECT_NAME")
            or "LightHome"
        )
        self._tracer: Any | None = None
        self._tracer_provider: Any | None = None

        if not self._init_phoenix():
            logger.info("Phoenix not configured; using local JSONL trace fallback")

    def log_classification(
        self, conversation_id: str, turn: int, data: dict[str, Any]
    ) -> None:
        """Log a single classification decision, enriched with the feature-vs-Claude
        disagreement signals, to Phoenix and the local JSONL mirror."""
        signals = _disagreement_signals(data)

        if self._tracer is not None:
            try:
                self._log_phoenix_span(
                    conversation_id=conversation_id,
                    turn=turn,
                    data=data,
                    signals=signals,
                )
            except Exception:
                logger.exception("Phoenix trace logging failed; using local JSONL fallback")

        self._log_local_jsonl(
            conversation_id=conversation_id, turn=turn, data=data, signals=signals
        )

    def _init_phoenix(self) -> bool:
        if not self.phoenix_endpoint:
            return False

        try:
            from opentelemetry import trace
            from phoenix.otel import register
        except ImportError:
            logger.warning("Phoenix OTEL packages are unavailable; using local JSONL fallback")
            return False
        except Exception as exc:
            logger.warning(
                "Phoenix OTEL import failed; using local JSONL fallback: %s", exc
            )
            return False

        try:
            endpoint = self._phoenix_trace_endpoint(self.phoenix_endpoint)
            protocol = "grpc" if endpoint.endswith(":4317") else "http/protobuf"
            self._tracer_provider = register(
                endpoint=endpoint,
                project_name=self.phoenix_project,
                api_key=self.phoenix_api_key,
                protocol=protocol,
                auto_instrument=False,
                batch=False,
                verbose=False,
            )
            self._tracer = trace.get_tracer("lighthome.observability")
        except Exception:
            logger.exception("Phoenix OTEL setup failed; using local JSONL fallback")
            self._tracer_provider = None
            self._tracer = None
            return False

        logger.info("Phoenix tracing initialized for project %s", self.phoenix_project)
        return True

    def _phoenix_trace_endpoint(self, endpoint: str | None) -> str:
        if not endpoint:
            return ""

        endpoint = endpoint.rstrip("/")
        if endpoint.endswith("/v1/traces") or endpoint.endswith(":4317"):
            return endpoint

        return f"{endpoint}/v1/traces"

    def _log_phoenix_span(
        self,
        conversation_id: str,
        turn: int,
        data: dict[str, Any],
        signals: dict[str, Any] | None = None,
    ) -> None:
        if self._tracer is None:
            raise RuntimeError("Phoenix tracer is not initialized")

        with self._tracer.start_as_current_span("lighthome.classification") as span:
            span.set_attribute("lighthome.conversation_id", conversation_id)
            span.set_attribute("lighthome.turn", turn)

            alert = data.get("alert")
            if isinstance(alert, dict) and isinstance(alert.get("fired"), bool):
                span.set_attribute("lighthome.alert_fired", alert["fired"])

            for key, value in data.items():
                attribute_name = f"lighthome.{key}"
                if isinstance(value, (str, bool, int, float)):
                    span.set_attribute(attribute_name, value)
                else:
                    span.set_attribute(attribute_name, json.dumps(value, default=str))

            # First-class disagreement attributes (queryable in Phoenix).
            for key, value in (signals or {}).items():
                span.set_attribute(f"lighthome.{key}", value)

        if self._tracer_provider is not None and hasattr(
            self._tracer_provider, "force_flush"
        ):
            self._tracer_provider.force_flush()

    def _log_local_jsonl(
        self,
        conversation_id: str,
        turn: int,
        data: dict[str, Any],
        signals: dict[str, Any] | None = None,
    ) -> None:
        record = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "sink": "local_jsonl",
            "conversation_id": conversation_id,
            "turn": turn,
            "disagreement": signals or {},
            "data": data,
        }

        try:
            LOCAL_TRACE_PATH.parent.mkdir(parents=True, exist_ok=True)
            with LOCAL_TRACE_PATH.open("a", encoding="utf-8") as trace_file:
                json.dump(record, trace_file, ensure_ascii=False)
                trace_file.write("\n")
        except Exception:
            logger.exception("Failed to write local Arize trace")


# --- Sentry: error monitoring + alert-event capture ------------------------

_SENTRY_READY = False


def init_sentry(dsn: str | None = None) -> bool:
    """Initialize Sentry once. Returns True if active. No-op without a DSN.

    Beyond a bare init() this wires three things:
      - LoggingIntegration: every `logger.exception(...)` already scattered across
        the pipeline/bridge surfaces as a Sentry issue with NO inline SDK calls —
        so the observability lane never touches the detection code (CLAUDE.md).
      - FastAPI/Starlette integration: endpoint errors are captured and each
        request gets a performance transaction (traces_sample_rate=1.0).
      - Domain events: alert-fires and Claude degradation (see capture_* below).
    """
    global _SENTRY_READY
    dsn = dsn or os.getenv("SENTRY_DSN")
    if not dsn:
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.logging import LoggingIntegration
    except ImportError:
        logger.warning("Sentry DSN is configured, but sentry_sdk is not installed")
        return False

    # ERROR-level logs become Sentry issues; INFO/WARN become breadcrumbs.
    integrations = [LoggingIntegration(level=logging.INFO, event_level=logging.ERROR)]
    try:  # FastAPI/Starlette integrations are optional — include if importable.
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        integrations += [StarletteIntegration(), FastApiIntegration()]
    except Exception:
        logger.debug("Sentry FastAPI/Starlette integrations unavailable", exc_info=True)

    try:
        sentry_sdk.init(
            dsn=dsn,
            environment=os.getenv("SENTRY_ENVIRONMENT")
            or os.getenv("PIPELINE_MODE", "mock"),
            release=os.getenv("SENTRY_RELEASE"),
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "1.0")),
            integrations=integrations,
            # Child-safety: never let message content reach Sentry by default.
            send_default_pii=False,
        )
    except Exception as exc:
        # A malformed DSN is a config issue, not a crash — keep it to one line.
        logger.warning("Failed to initialize Sentry SDK (check SENTRY_DSN): %s", exc)
        return False

    _SENTRY_READY = True
    logger.info(
        "Sentry initialized (env=%s)",
        os.getenv("SENTRY_ENVIRONMENT") or os.getenv("PIPELINE_MODE", "mock"),
    )
    return True


def _sentry() -> Any | None:
    """Return the SDK module if Sentry is active, else None (so callers no-op)."""
    if not _SENTRY_READY:
        return None
    try:
        import sentry_sdk

        return sentry_sdk
    except ImportError:
        return None


def capture_alert(record: dict[str, Any]) -> None:
    """Record a FIRED alert as a Sentry event. Structural data only — never
    `raw_text` — so the parent-privacy projection holds at the Sentry boundary too.

    Alerts group per session (fingerprint), so one conversation's escalation is a
    single issue with a timeline rather than N unrelated events."""
    sentry_sdk = _sentry()
    if sentry_sdk is None:
        return
    alert = record.get("alert") or {}
    if not alert.get("fired"):
        return
    try:
        with sentry_sdk.push_scope() as scope:
            scope.level = "error"
            scope.set_tag("lighthome.event", "alert_fired")
            scope.set_tag("session_id", record.get("session_id"))
            scope.set_tag("dominant_stage", record.get("dominant_stage"))
            scope.set_tag("conversation_label", record.get("conversation_label"))
            scope.set_tag("t_offset_sec", record.get("t_offset_sec"))
            scope.set_context(
                "alert",
                {"reason": alert.get("reason"), "conditions": alert.get("conditions")},
            )
            scope.set_context(
                "stage_probabilities", record.get("stage_probabilities") or {}
            )
            scope.set_context(
                "timing",
                {
                    "turn": record.get("turn"),
                    "t_offset_sec": record.get("t_offset_sec"),
                },
            )
            scope.fingerprint = ["alert_fired", record.get("session_id", "unknown")]
            sentry_sdk.capture_message(
                f"Grooming alert fired — {record.get('dominant_stage')} "
                f"(session {record.get('session_id')}, turn {record.get('turn')})"
            )
    except Exception:
        logger.exception("Sentry capture_alert failed")


def capture_degradation(record: dict[str, Any]) -> None:
    """Reliability signal: Claude synthesis fell back to the feature-derived path
    even though an API key is configured (a real Claude failure, NOT the intended
    offline mode). Surfaced as a warning so degraded runs are visible in Sentry."""
    sentry_sdk = _sentry()
    if sentry_sdk is None:
        return
    if not os.getenv("ANTHROPIC_API_KEY"):
        return  # no key -> feature-fallback is intended, not a degradation
    claude = record.get("claude") or {}
    if claude.get("model") != "feature-fallback":
        return
    try:
        with sentry_sdk.push_scope() as scope:
            scope.level = "warning"
            scope.set_tag("lighthome.event", "claude_degraded")
            scope.set_tag("session_id", record.get("session_id"))
            scope.fingerprint = ["claude_degraded"]
            sentry_sdk.capture_message(
                "Claude synthesis degraded to feature-fallback (structural features "
                "still drive detection)"
            )
    except Exception:
        logger.exception("Sentry capture_degradation failed")
