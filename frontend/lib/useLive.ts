"use client";

import { useEffect, useRef, useState } from "react";

import {
  listSessions,
  streamSession,
  type DecisionRecord,
  type ParentView,
  type SessionSummary,
  type View,
} from "./api";

export interface LiveSessionsState {
  sessions: SessionSummary[];
  connected: boolean;
  error: string | null;
  /** true until the first poll resolves */
  loading: boolean;
}

/** Polls `/sessions` so the console always reflects whatever conversations are
 *  currently flowing through the pipeline — real iMessage threads or the local
 *  test feed, the console can't tell the difference (and shouldn't). */
export function useLiveSessions(intervalMs = 2000): LiveSessionsState {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const s = await listSessions();
        if (!alive) return;
        setSessions(s);
        setConnected(true);
        setError(null);
      } catch (e) {
        if (!alive) return;
        setConnected(false);
        setError(String(e));
      } finally {
        if (!alive) return;
        setLoading(false);
        timer = setTimeout(poll, intervalMs);
      }
    };

    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [intervalMs]);

  return { sessions, connected, error, loading };
}

/** Subscribes to one session's SSE stream and accumulates its ordered records.
 *  The backend stream replays from turn 0 then tails live, so we dedupe by turn.
 *  Re-subscribes cleanly when `sessionId`/`view` changes. The record type follows
 *  the requested view — `parent` yields `ParentView`, `tns` yields the full
 *  `DecisionRecord` (raw text + per-message conditions). */
export function useLiveSession<R extends { turn: number } = ParentView>(
  sessionId: string | null,
  view: View = "parent",
): R[] {
  const [records, setRecords] = useState<R[]>([]);
  const seen = useRef<Set<number>>(new Set());

  useEffect(() => {
    seen.current = new Set();
    setRecords([]);
    if (!sessionId) return;

    const close = streamSession(sessionId, view, (r) => {
      const rec = r as unknown as R;
      if (rec == null || typeof (rec as { turn?: unknown }).turn !== "number") return;
      if (seen.current.has(rec.turn)) return;
      seen.current.add(rec.turn);
      setRecords((prev) => [...prev, rec].sort((a, b) => a.turn - b.turn));
    });
    return close;
  }, [sessionId, view]);

  return records;
}

export type { DecisionRecord };

/** A ticking clock (ms) for relative-time labels — re-renders consumers every
 *  `everyMs`. Kept in one place so cards don't each spin their own interval. */
export function useNow(everyMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}
