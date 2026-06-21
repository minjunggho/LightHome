"""Message embeddings for boundary-recycle + escalation-velocity.

Uses sentence-transformers when installed (the intended production path). Falls
back to a deterministic offline lexical embedding (hashed bag-of-words) so the
pipeline runs and the demo/tests are reproducible without downloading a model.
Both return L2-normalized vectors, so cosine similarity == dot product.
"""

from __future__ import annotations

import hashlib
import re

import numpy as np

_DIM = 256
_TOKEN = re.compile(r"[a-z0-9']+")
_model = None
_tried_model = False


def _load_model():
    global _model, _tried_model
    if _tried_model:
        return _model
    _tried_model = True
    try:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer("all-MiniLM-L6-v2")
    except Exception:
        _model = None  # offline fallback
    return _model


def _hashed_bow(text: str) -> np.ndarray:
    vec = np.zeros(_DIM, dtype=np.float32)
    for tok in _TOKEN.findall(text.lower()):
        h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
        vec[h % _DIM] += 1.0
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 0 else vec


def embed(text: str) -> list[float]:
    model = _load_model()
    if model is not None:
        v = model.encode(text, normalize_embeddings=True)
        return np.asarray(v, dtype=np.float32).tolist()
    return _hashed_bow(text).tolist()


def cosine(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0
    av, bv = np.asarray(a), np.asarray(b)
    denom = np.linalg.norm(av) * np.linalg.norm(bv)
    return float(np.dot(av, bv) / denom) if denom > 0 else 0.0
