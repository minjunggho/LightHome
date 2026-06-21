"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { mergeStatements } from "@openuidev/react-lang";

import { streamChat } from "./llm-stream";
import {
  extractCodeOnly,
  extractText,
  isPureCode,
  responseHasCode,
} from "./response-parser";

export interface GenMessage {
  role: "user" | "assistant";
  content: string;
  /** assistant prose with the openui-lang stripped out */
  text?: string;
  hasCode: boolean;
}

/** Drives the generative dashboard: streams openui-lang from /api/chat, renders
 *  it live, and accumulates edits (each follow-up patches the current dashboard).
 *  A trimmed version of the official example's provider — no MCP tool layer; the
 *  live detector snapshot is passed straight through to the route. */
export function useGenDashboard(endpoint = "/api/chat") {
  const [conversation, setConversation] = useState<GenMessage[]>([]);
  const [dashboardCode, setDashboardCode] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [elapsed, setElapsed] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const responseRef = useRef("");
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isStreaming || startRef.current == null) return;
    const iv = setInterval(() => setElapsed(Date.now() - (startRef.current ?? 0)), 100);
    return () => clearInterval(iv);
  }, [isStreaming]);

  const send = useCallback(
    async (text: string, liveData: unknown) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setIsStreaming(true);
      setStreamingText("");
      setElapsed(null);
      startRef.current = null;
      responseRef.current = "";

      const userMsg: GenMessage = { role: "user", content: trimmed, hasCode: false };
      const updated = [...conversation, userMsg];
      setConversation(updated);
      const existingCode = dashboardCode;

      // Give the model the current dashboard so follow-ups edit rather than restart.
      const apiMessages = updated.map((m, i) => {
        if (m.role === "user" && i === updated.length - 1 && existingCode) {
          return {
            role: m.role,
            content: `${m.content}\n\n<current-dashboard>\n${existingCode}\n</current-dashboard>`,
          };
        }
        return { role: m.role, content: m.role === "assistant" ? m.text ?? m.content : m.content };
      });

      const controller = new AbortController();
      abortRef.current = controller;

      await streamChat(
        endpoint,
        { messages: apiMessages, liveData },
        (chunk) => {
          responseRef.current += chunk;
          const raw = responseRef.current;
          setStreamingText(extractText(raw) || "");
          // Render progressively: show whatever code has streamed so far.
          setDashboardCode(existingCode ? existingCode + "\n" + raw : raw);
        },
        () => {
          setIsStreaming(false);
          setStreamingText("");
          if (startRef.current) setElapsed(Date.now() - startRef.current);

          const raw = responseRef.current;
          const hasCode = responseHasCode(raw);
          const pureCode = isPureCode(raw);
          const text = pureCode ? undefined : extractText(raw) || undefined;

          setConversation((prev) => [
            ...prev,
            { role: "assistant", content: raw, text, hasCode },
          ]);

          if (hasCode) {
            const newCode = pureCode ? raw : extractCodeOnly(raw);
            if (newCode) {
              setDashboardCode((cur) =>
                existingCode ? mergeStatements(existingCode, newCode) : newCode,
              );
            }
          } else {
            // Pure prose reply — keep the prior dashboard untouched.
            setDashboardCode(existingCode);
          }
        },
        controller.signal,
        () => {
          startRef.current = Date.now();
        },
      );
    },
    [conversation, dashboardCode, endpoint, isStreaming],
  );

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setConversation([]);
    setDashboardCode(null);
    setIsStreaming(false);
    setStreamingText("");
    setElapsed(null);
    responseRef.current = "";
  }, []);

  return { conversation, dashboardCode, isStreaming, streamingText, elapsed, send, clear };
}
