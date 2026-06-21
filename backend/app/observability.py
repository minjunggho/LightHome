from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


logger = logging.getLogger(__name__)

LOCAL_TRACE_PATH = Path("logs/arize_traces.jsonl")

try:
    from arize.pandas.logger import Client as ArizeClient
except ImportError:
    ArizeClient = None
except Exception:
    logger.warning("Arize SDK import failed; using local JSONL fallback", exc_info=True)
    ArizeClient = None


class ArizeLogger:
    """Log classification traces to Phoenix/Arize and mirror them to JSONL."""

    def __init__(
        self, api_key: str | None = None, space_key: str | None = None
    ) -> None:
        """Initialize Arize logging or fall back to local JSONL logging."""
        self.api_key = api_key or os.getenv("ARIZE_API_KEY")
        self.space_key = (
            space_key or os.getenv("ARIZE_SPACE_KEY") or os.getenv("ARIZE_SPACE_ID")
        )
        self.phoenix_endpoint = os.getenv("PHOENIX_COLLECTOR_ENDPOINT")
        self.phoenix_api_key = os.getenv("PHOENIX_API_KEY")
        self.phoenix_project = (
            os.getenv("PHOENIX_PROJECT")
            or os.getenv("PHOENIX_PROJECT_NAME")
            or "LightHome"
        )
        self._client: Any | None = None
        self._tracer: Any | None = None
        self._tracer_provider: Any | None = None

        if self._init_phoenix():
            return

        if not self.api_key or not self.space_key:
            logger.warning("Arize keys are not configured; using local JSONL fallback")
            return

        if ArizeClient is None:
            logger.warning("Arize SDK is unavailable; using local JSONL fallback")
            return

        try:
            self._client = ArizeClient(api_key=self.api_key, space_key=self.space_key)
        except Exception:
            logger.exception("Failed to initialize Arize client; using local JSONL fallback")
            return

        # TODO: Wire this to the team's final Arize SDK logging call when the
        # package version and dataframe/schema contract are available.
        logger.warning("Arize client initialized, but local JSONL fallback remains active")

    def log_classification(
        self, conversation_id: str, turn: int, data: dict[str, Any]
    ) -> None:
        """Log a single classification decision."""
        if self._tracer is not None:
            try:
                self._log_phoenix_span(
                    conversation_id=conversation_id,
                    turn=turn,
                    data=data,
                )
            except Exception:
                logger.exception("Phoenix trace logging failed; using local JSONL fallback")

        self._log_local_jsonl(conversation_id=conversation_id, turn=turn, data=data)

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
        self, conversation_id: str, turn: int, data: dict[str, Any]
    ) -> None:
        if self._tracer is None:
            raise RuntimeError("Phoenix tracer is not initialized")

        with self._tracer.start_as_current_span("lighthome.classification") as span:
            span.set_attribute("lighthome.conversation_id", conversation_id)
            span.set_attribute("lighthome.turn", turn)

            alert_fired = data.get("alert_fired")
            if isinstance(alert_fired, bool):
                span.set_attribute("lighthome.alert_fired", alert_fired)

            for key, value in data.items():
                attribute_name = f"lighthome.{key}"
                if isinstance(value, (str, bool, int, float)):
                    span.set_attribute(attribute_name, value)
                else:
                    span.set_attribute(attribute_name, json.dumps(value, default=str))

        if self._tracer_provider is not None and hasattr(
            self._tracer_provider, "force_flush"
        ):
            self._tracer_provider.force_flush()

    def _log_local_jsonl(
        self, conversation_id: str, turn: int, data: dict[str, Any]
    ) -> None:
        record = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "sink": "local_jsonl",
            "conversation_id": conversation_id,
            "turn": turn,
            "data": data,
        }

        try:
            LOCAL_TRACE_PATH.parent.mkdir(parents=True, exist_ok=True)
            with LOCAL_TRACE_PATH.open("a", encoding="utf-8") as trace_file:
                json.dump(record, trace_file, ensure_ascii=False)
                trace_file.write("\n")
        except Exception:
            logger.exception("Failed to write local Arize trace")


def init_sentry(dsn: str | None = None) -> None:
    """Initialize Sentry SDK. If DSN or SDK is unavailable, skip silently."""
    dsn = dsn or os.getenv("SENTRY_DSN")
    if not dsn:
        return

    try:
        import sentry_sdk
    except ImportError:
        logger.warning("Sentry DSN is configured, but sentry_sdk is not installed")
        return

    try:
        sentry_sdk.init(
            dsn=dsn,
            traces_sample_rate=1.0,
        )
    except Exception:
        logger.exception("Failed to initialize Sentry SDK")
