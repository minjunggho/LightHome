"""Test-suite guards.

Keep the suite deterministic and offline: force the feature-derived synthesis
path (no real Claude calls / no cost / no network) regardless of what's in
backend/.env, and default to mock mode unless a caller explicitly set
PIPELINE_MODE (e.g. `PIPELINE_MODE=live pytest`, which then exercises the live
pipeline via the deterministic feature fallback).

This runs before app.main is imported, and app.main's load_dotenv uses
override=False, so these values win.
"""

import os

os.environ["ANTHROPIC_API_KEY"] = ""        # force feature-fallback (no Claude call)
os.environ.setdefault("PIPELINE_MODE", "mock")
os.environ["PHOENIX_COLLECTOR_ENDPOINT"] = ""  # no tracing during tests
