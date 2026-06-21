"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { analyzeMessage, probeBackend, resetSession } from "./api";
import { scenarios } from "./demoData";
import type { DecisionFrame, ScenarioId, View } from "./types";

const STEP_MS = 1600;

export type BackendStatus = "checking" | "online" | "offline";

export interface DemoPlayer {
  scenarioId: ScenarioId;
  setScenario: (id: ScenarioId) => void;
  frames: DecisionFrame[];
  /** Frames revealed so far (turn 0 .. current). */
  visible: DecisionFrame[];
  current: DecisionFrame;
  index: number;
  atEnd: boolean;
  playing: boolean;
  backend: BackendStatus;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  reset: () => void;
}

/**
 * Drives a scenario through its frames. Rendering is always mock-first so the
 * visuals are guaranteed; when a backend is reachable each step also sends the
 * message and overlays the live decision on top of the mock frame.
 */
export function useDemoPlayer(
  view: View,
  initial: ScenarioId = "grooming",
): DemoPlayer {
  const [scenarioId, setScenarioId] = useState<ScenarioId>(initial);
  const baseFrames = scenarios[scenarioId].frames;

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [backend, setBackend] = useState<BackendStatus>("checking");
  const [live, setLive] = useState<Record<number, Partial<DecisionFrame>>>({});

  // Stable, deterministic session id; a reset counter freshens it without
  // calling impure APIs during render.
  const baseId = useId();
  const resetSeq = useRef(0);
  const sessionId = useRef(`demo-${scenarioId}-${baseId}`);

  // Merge any live backend overlay onto the mock frames.
  const frames = useMemo(() => {
    return baseFrames.map((f, i) =>
      live[i] ? { ...f, ...live[i], turn: f.turn, message: f.message } : f,
    );
  }, [baseFrames, live]);

  const lastIndex = frames.length - 1;
  const atEnd = index >= lastIndex;

  // Probe the backend once on mount.
  useEffect(() => {
    let cancelled = false;
    probeBackend().then((ok) => {
      if (!cancelled) setBackend(ok ? "online" : "offline");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // When backend is online, fetch the live decision for the current frame.
  useEffect(() => {
    if (backend !== "online") return;
    if (live[index]) return;
    let cancelled = false;
    const msg = baseFrames[index]?.message;
    if (!msg) return;
    analyzeMessage(sessionId.current, msg, view).then((partial) => {
      if (!cancelled && partial) {
        setLive((prev) => ({ ...prev, [index]: partial }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [backend, index, baseFrames, view, live]);

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, frames.length - 1));
  }, [frames.length]);

  const resetTo = useCallback(
    (id: ScenarioId) => {
      setPlaying(false);
      setIndex(0);
      setLive({});
      resetSeq.current += 1;
      sessionId.current = `demo-${id}-${baseId}-${resetSeq.current}`;
      void resetSession(sessionId.current);
    },
    [baseId],
  );

  const reset = useCallback(() => resetTo(scenarioId), [resetTo, scenarioId]);

  const setScenario = useCallback(
    (id: ScenarioId) => {
      setScenarioId(id);
      resetTo(id);
    },
    [resetTo],
  );

  const play = useCallback(() => {
    if (atEnd) {
      setIndex(0);
      setLive({});
    }
    setPlaying(true);
  }, [atEnd]);

  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => {
    if (playing) setPlaying(false);
    else play();
  }, [playing, play]);

  // Auto-advance while playing. The stop-at-end is done inside the async
  // timeout callback (not synchronously in the effect body) so playback
  // halts cleanly on the final turn.
  useEffect(() => {
    if (!playing || index >= lastIndex) return;
    const timer = setTimeout(() => {
      setIndex((i) => Math.min(i + 1, lastIndex));
      if (index + 1 >= lastIndex) setPlaying(false);
    }, STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, index, lastIndex]);

  const clamped = Math.min(index, frames.length - 1);

  return {
    scenarioId,
    setScenario,
    frames,
    visible: frames.slice(0, clamped + 1),
    current: frames[clamped],
    index: clamped,
    atEnd,
    playing,
    backend,
    play,
    pause,
    toggle,
    next,
    reset,
  };
}
