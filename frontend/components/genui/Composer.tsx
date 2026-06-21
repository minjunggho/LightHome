"use client";

import { useCallback, useRef, useState, type KeyboardEvent } from "react";

/* The chat entry for the generative dashboard. A single soft rounded field that
   carries a live-data chip (how many conversations are attached as context),
   utility affordances, and a send control — the OpenUI-style prompt box, tuned
   to the soft-watch theme. */
export function Composer({
  value,
  onChange,
  onSubmit,
  dataCount,
  placeholder = "Summarize, chart, compare…",
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  dataCount: number;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Press-to-record dictation via Deepgram (see /api/transcribe).
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const appendTranscript = useCallback(
    (t: string) => {
      const next = value.trim() ? `${value.trim()} ${t}` : t;
      onChange(next);
      ref.current?.focus();
    },
    [value, onChange],
  );

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setMicError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError("Microphone access denied.");
      return;
    }

    const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      if (!blob.size) return;
      setTranscribing(true);
      try {
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": blob.type },
          body: blob,
        });
        const data = (await res.json()) as { transcript?: string; error?: string };
        if (!res.ok || data.error) setMicError(data.error ?? "Transcription failed.");
        else if (data.transcript) appendTranscript(data.transcript);
      } catch {
        setMicError("Transcription request failed.");
      } finally {
        setTranscribing(false);
      }
    };

    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }, [appendTranscript]);

  const toggleMic = useCallback(() => {
    if (transcribing) return;
    if (recording) stopRecording();
    else void startRecording();
  }, [recording, transcribing, startRecording, stopRecording]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSubmit();
    }
  };

  return (
    <div className="flex flex-col rounded-[1.75rem] border border-line bg-surface p-3.5 shadow-card transition-all duration-200 focus-within:border-line-strong focus-within:shadow-pop">
      {/* Prompt — a tall, multi-line field with the placeholder anchored top-left */}
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={3}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="block max-h-[40vh] min-h-[116px] w-full resize-none border-0 bg-transparent px-2 pt-1.5 text-[18px] leading-relaxed text-ink placeholder:italic placeholder:text-ink-3"
        style={{ fieldSizing: "content", outline: "none" } as React.CSSProperties}
      />

      {/* Control bar: attached context + tools on the left, model + send on the right */}
      <div className="mt-2 flex items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-semibold text-ink-2"
            title="Live detector data attached as context"
          >
            <LiveTag />
            {dataCount} conversation{dataCount === 1 ? "" : "s"}
          </span>
          {micError ? (
            <span className="truncate text-[12px] font-medium text-[oklch(0.55_0.18_25)]">
              {micError}
            </span>
          ) : recording ? (
            <span className="text-[12px] font-medium text-ink-3">Listening… tap to stop</span>
          ) : transcribing ? (
            <span className="text-[12px] font-medium text-ink-3">Transcribing…</span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <span className="hidden items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1.5 text-[12.5px] font-semibold text-ink-2 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
            Claude
          </span>
          <button
            type="button"
            onClick={toggleMic}
            disabled={transcribing}
            aria-label={recording ? "Stop recording" : "Dictate with your voice"}
            aria-pressed={recording}
            title={recording ? "Stop recording" : "Dictate"}
            className={`grid h-11 w-11 place-items-center rounded-full border transition-all duration-150 disabled:opacity-40 ${
              recording
                ? "border-transparent bg-[oklch(0.62_0.2_25)] text-white"
                : "border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {transcribing ? <Spinner /> : recording ? <StopIcon /> : <MicIcon />}
          </button>
          <button
            onClick={() => value.trim() && onSubmit()}
            disabled={!value.trim()}
            aria-label="Generate dashboard"
            className="grid h-11 w-11 place-items-center rounded-full bg-ink text-surface transition-all duration-150 enabled:hover:scale-105 disabled:opacity-30"
          >
            <ArrowIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
    </svg>
  );
}

function StopIcon() {
  return (
    <span className="relative flex h-3.5 w-3.5 items-center justify-center">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-sm bg-white/50" />
      <span className="relative h-3 w-3 rounded-[3px] bg-white" />
    </span>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function LiveTag() {
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span className="lh-blip inline-flex h-1.5 w-1.5 rounded-full bg-[oklch(0.66_0.11_168)]" />
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
