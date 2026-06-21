"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  analyzeParent,
  analyzeTns,
  resetSession,
  type DecisionRecord,
  type ParentView,
  type View,
} from "./api";
import { loadDemo, type DemoConversation } from "./demos";

const STEP_MS = 1400;

export interface PlayerState<R> {
  demo: DemoConversation | null;
  activeFile: string | null;
  records: R[];
  playing: boolean;
  busy: boolean;
  error: string | null;
  atEnd: boolean;
  select: (file: string) => Promise<void>;
  step: () => Promise<void>;
  reset: () => Promise<void>;
  play: () => void;
  pause: () => void;
}

export function usePlayer<R extends ParentView | DecisionRecord>(
  view: View,
): PlayerState<R> {
  const [demo, setDemo] = useState<DemoConversation | null>(null);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [records, setRecords] = useState<R[]>([]);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const sessionId = demo ? `demo-${demo.id}-${view}` : "";
  const atEnd = !demo || records.length >= demo.messages.length;

  const select = useCallback(
    async (file: string) => {
      setPlaying(false);
      setError(null);
      try {
        const d = await loadDemo(file);
        setDemo(d);
        setActiveFile(file);
        setRecords([]);
        await resetSession(`demo-${d.id}-${view}`);
      } catch (e) {
        setError(String(e));
      }
    },
    [view],
  );

  const step = useCallback(async () => {
    if (busyRef.current || !demo) return;
    const idx = records.length;
    if (idx >= demo.messages.length) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const m = demo.messages[idx];
      const req = {
        session_id: sessionId,
        turn: m.turn,
        speaker: m.speaker,
        text: m.text,
        t_offset_sec: m.t_offset_sec,
      };
      const rec = view === "parent" ? await analyzeParent(req) : await analyzeTns(req);
      setRecords((r) => [...r, rec as R]);
    } catch (e) {
      setError(String(e));
      setPlaying(false);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [demo, records.length, sessionId, view]);

  const reset = useCallback(async () => {
    if (!demo) return;
    setPlaying(false);
    setRecords([]);
    try {
      await resetSession(sessionId);
    } catch (e) {
      setError(String(e));
    }
  }, [demo, sessionId]);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);

  // Autoplay: step on an interval until the conversation ends.
  useEffect(() => {
    if (!playing) return;
    if (atEnd) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(step, records.length === 0 ? 200 : STEP_MS);
    return () => clearTimeout(t);
  }, [playing, atEnd, records.length, step]);

  return { demo, activeFile, records, playing, busy, error, atEnd, select, step, reset, play, pause };
}
