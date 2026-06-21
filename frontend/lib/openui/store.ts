"use client";

// Module-level store for the generative dashboard. Living outside the React tree
// means generated dashboards survive route changes (Next unmounts the page on
// navigation) and accumulate into a browsable history — the same store backs the
// active canvas and the History tab.

import { create } from "zustand";
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

export interface Dashboard {
  id: string;
  title: string;
  conversation: GenMessage[];
  code: string | null;
  createdAt: number;
  updatedAt: number;
}

interface GenState {
  dashboards: Dashboard[];
  /** the dashboard currently shown on the Build tab; null = show the composer */
  activeId: string | null;
  isStreaming: boolean;
  streamingText: string;
  elapsed: number | null;
  send: (text: string, liveData: unknown, endpoint?: string) => Promise<void>;
  newDashboard: () => void;
  selectDashboard: (id: string) => void;
  deleteDashboard: (id: string) => void;
}

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `d-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

function titleFrom(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 48 ? `${t.slice(0, 47)}…` : t;
}

// In-flight accumulation for the single active stream.
let responseBuf = "";
let abort: AbortController | null = null;
let startedAt: number | null = null;

export const useGenStore = create<GenState>((set, get) => {
  const patch = (id: string, fn: (d: Dashboard) => Dashboard) =>
    set({ dashboards: get().dashboards.map((d) => (d.id === id ? fn(d) : d)) });

  return {
    dashboards: [],
    activeId: null,
    isStreaming: false,
    streamingText: "",
    elapsed: null,

    newDashboard: () => set({ activeId: null }),
    selectDashboard: (id) => set({ activeId: id }),
    deleteDashboard: (id) =>
      set((s) => ({
        dashboards: s.dashboards.filter((d) => d.id !== id),
        activeId: s.activeId === id ? null : s.activeId,
      })),

    send: async (text, liveData, endpoint = "/api/chat") => {
      const trimmed = text.trim();
      if (!trimmed || get().isStreaming) return;

      let { dashboards, activeId } = get();
      let active = dashboards.find((d) => d.id === activeId) ?? null;

      const now = Date.now();
      if (!active) {
        active = {
          id: uid(),
          title: titleFrom(trimmed),
          conversation: [],
          code: null,
          createdAt: now,
          updatedAt: now,
        };
        dashboards = [active, ...dashboards];
        activeId = active.id;
      }

      const id = active.id;
      const existingCode = active.code;
      const conversation: GenMessage[] = [
        ...active.conversation,
        { role: "user", content: trimmed, hasCode: false },
      ];
      const title = active.conversation.length === 0 ? titleFrom(trimmed) : active.title;

      responseBuf = "";
      startedAt = null;

      set({
        dashboards: dashboards.map((d) =>
          d.id === id ? { ...active!, title, conversation, updatedAt: now } : d,
        ),
        activeId,
        isStreaming: true,
        streamingText: "",
        elapsed: null,
      });

      // Give the model the current dashboard so follow-ups edit rather than restart.
      const apiMessages = conversation.map((m, i) => {
        if (m.role === "user" && i === conversation.length - 1 && existingCode) {
          return {
            role: m.role,
            content: `${m.content}\n\n<current-dashboard>\n${existingCode}\n</current-dashboard>`,
          };
        }
        return { role: m.role, content: m.role === "assistant" ? m.text ?? m.content : m.content };
      });

      abort?.abort();
      abort = new AbortController();

      await streamChat(
        endpoint,
        { messages: apiMessages, liveData },
        (chunk) => {
          responseBuf += chunk;
          const raw = responseBuf;
          set({ streamingText: extractText(raw) || "" });
          // Render progressively into the active dashboard.
          patch(id, (d) => ({ ...d, code: existingCode ? `${existingCode}\n${raw}` : raw }));
        },
        () => {
          const raw = responseBuf;
          const hasCode = responseHasCode(raw);
          const pureCode = isPureCode(raw);
          const text = pureCode ? undefined : extractText(raw) || undefined;
          const newCode = hasCode ? (pureCode ? raw : extractCodeOnly(raw)) : null;

          patch(id, (d) => {
            const finalCode =
              hasCode && newCode
                ? existingCode
                  ? mergeStatements(existingCode, newCode)
                  : newCode
                : existingCode;
            return {
              ...d,
              conversation: [...d.conversation, { role: "assistant", content: raw, text, hasCode }],
              code: finalCode,
              updatedAt: Date.now(),
            };
          });
          set({
            isStreaming: false,
            streamingText: "",
            elapsed: startedAt ? Date.now() - startedAt : null,
          });
        },
        abort.signal,
        () => {
          startedAt = Date.now();
        },
      );
    },
  };
});
