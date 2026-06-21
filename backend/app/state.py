from __future__ import annotations

import json
import logging
import os
from abc import ABC, abstractmethod
from typing import Any

try:
    import redis.asyncio as redis_async
except ImportError:
    redis_async = None


logger = logging.getLogger(__name__)

STATE_TTL_SECONDS = 3600


class StateStore(ABC):
    """Abstract async interface for conversation state storage."""

    @abstractmethod
    async def save_conversation_state(
        self, conversation_id: str, state: dict[str, Any]
    ) -> None:
        """Save the latest state for a conversation."""

    @abstractmethod
    async def get_conversation_state(
        self, conversation_id: str
    ) -> dict[str, Any] | None:
        """Return the latest state for a conversation, if one exists."""

    @abstractmethod
    async def append_turn(
        self, conversation_id: str, turn_data: dict[str, Any]
    ) -> None:
        """Append one analyzed turn to a conversation."""

    @abstractmethod
    async def get_all_turns(self, conversation_id: str) -> list[dict[str, Any]]:
        """Return every stored turn for a conversation."""

    @abstractmethod
    async def delete_conversation(self, conversation_id: str) -> None:
        """Delete all stored data for a conversation."""


class DictStateStore(StateStore):
    """Single-process in-memory state store for demos and Redis fallback."""

    def __init__(self) -> None:
        """Initialize empty state and turn storage dictionaries."""
        self._states: dict[str, dict[str, Any]] = {}
        self._turns: dict[str, list[dict[str, Any]]] = {}

    async def save_conversation_state(
        self, conversation_id: str, state: dict[str, Any]
    ) -> None:
        """Save a shallow copy of the latest conversation state."""
        self._states[conversation_id] = dict(state)

    async def get_conversation_state(
        self, conversation_id: str
    ) -> dict[str, Any] | None:
        """Return a shallow copy of the stored state, or None if absent."""
        state = self._states.get(conversation_id)
        if state is None:
            return None
        return dict(state)

    async def append_turn(
        self, conversation_id: str, turn_data: dict[str, Any]
    ) -> None:
        """Append a shallow copy of one turn to the conversation history."""
        self._turns.setdefault(conversation_id, []).append(dict(turn_data))

    async def get_all_turns(self, conversation_id: str) -> list[dict[str, Any]]:
        """Return shallow copies of all stored turns, or an empty list."""
        return [dict(turn) for turn in self._turns.get(conversation_id, [])]

    async def delete_conversation(self, conversation_id: str) -> None:
        """Remove any stored state and turns for a conversation."""
        self._states.pop(conversation_id, None)
        self._turns.pop(conversation_id, None)


class RedisStateStore(StateStore):
    """Redis-backed state store that persists JSON strings with a short TTL."""

    def __init__(self, client: Any) -> None:
        """Initialize the store with an async Redis client."""
        self._client = client

    def _state_key(self, conversation_id: str) -> str:
        return f"lighthome:state:{conversation_id}"

    def _turns_key(self, conversation_id: str) -> str:
        return f"lighthome:turns:{conversation_id}"

    async def save_conversation_state(
        self, conversation_id: str, state: dict[str, Any]
    ) -> None:
        """Serialize and save the latest conversation state in Redis."""
        payload = json.dumps(state)
        key = self._state_key(conversation_id)
        try:
            await self._client.set(key, payload, ex=STATE_TTL_SECONDS)
        except Exception:
            logger.exception("Failed to save Redis state for %s", conversation_id)

    async def get_conversation_state(
        self, conversation_id: str
    ) -> dict[str, Any] | None:
        """Load and parse the latest conversation state from Redis."""
        key = self._state_key(conversation_id)
        try:
            payload = await self._client.get(key)
        except Exception:
            logger.exception("Failed to load Redis state for %s", conversation_id)
            return None

        if payload is None:
            return None

        try:
            state = json.loads(payload)
        except (json.JSONDecodeError, TypeError, UnicodeDecodeError):
            logger.exception("Invalid JSON in Redis state for %s", conversation_id)
            return None

        if not isinstance(state, dict):
            logger.warning("Redis state for %s was not a JSON object", conversation_id)
            return None

        return state

    async def append_turn(
        self, conversation_id: str, turn_data: dict[str, Any]
    ) -> None:
        """Serialize and append one analyzed turn to the Redis list."""
        payload = json.dumps(turn_data)
        key = self._turns_key(conversation_id)
        try:
            await self._client.rpush(key, payload)
            await self._client.expire(key, STATE_TTL_SECONDS)
        except Exception:
            logger.exception("Failed to append Redis turn for %s", conversation_id)

    async def get_all_turns(self, conversation_id: str) -> list[dict[str, Any]]:
        """Load and parse all stored turns from the Redis list."""
        key = self._turns_key(conversation_id)
        try:
            payloads = await self._client.lrange(key, 0, -1)
        except Exception:
            logger.exception("Failed to load Redis turns for %s", conversation_id)
            return []

        turns: list[dict[str, Any]] = []
        for payload in payloads:
            try:
                turn = json.loads(payload)
            except (json.JSONDecodeError, TypeError, UnicodeDecodeError):
                logger.exception("Invalid JSON in Redis turn for %s", conversation_id)
                continue

            if not isinstance(turn, dict):
                logger.warning("Redis turn for %s was not a JSON object", conversation_id)
                continue

            turns.append(turn)

        return turns

    async def delete_conversation(self, conversation_id: str) -> None:
        """Delete state and turn data for a conversation from Redis."""
        try:
            await self._client.delete(
                self._state_key(conversation_id),
                self._turns_key(conversation_id),
            )
        except Exception:
            logger.exception("Failed to delete Redis data for %s", conversation_id)


async def create_state_store(redis_url: str | None = None) -> StateStore:
    """Try Redis first, falling back to DictStateStore if unavailable."""
    redis_url = redis_url or os.getenv("REDIS_URL")
    if not redis_url:
        return DictStateStore()

    if redis_async is None:
        logger.warning("Redis package is not installed; using DictStateStore")
        return DictStateStore()

    try:
        client = redis_async.from_url(redis_url)
        await client.ping()
    except Exception:
        logger.warning("Redis unavailable at %s; using DictStateStore", redis_url)
        return DictStateStore()

    return RedisStateStore(client)
