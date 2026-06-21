import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { generatePrompt } from "@openuidev/lang-core";

import { promptSpec } from "@/lib/openui/promptSpec";

export const runtime = "nodejs";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
} as const;

type ChatMessage = { role: "user" | "assistant"; content: string };
type Body = { messages: ChatMessage[]; liveData?: unknown };

// Built once from the generated component spec; cheap to memoize per process.
let SYSTEM: string | null = null;
function baseSystem(): string {
  if (SYSTEM == null) SYSTEM = generatePrompt(promptSpec);
  return SYSTEM;
}

export async function POST(req: NextRequest) {
  const { messages, liveData } = (await req.json()) as Body;

  // Claude is the model. Reads ANTHROPIC_API_KEY; CLAUDE_MODEL overrides the
  // default (claude-opus-4-8 — set CLAUDE_MODEL=claude-sonnet-4-6 for a faster,
  // cheaper demo). See .env.example.
  const apiKey = process.env.ANTHROPIC_API_KEY || "";
  const model = process.env.CLAUDE_MODEL || "claude-opus-4-8";

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "No Claude key set. Add ANTHROPIC_API_KEY to frontend/.env.local — see .env.example.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // System carries the openui-lang component spec + the live detector snapshot.
  // Anthropic takes `system` separately from the message turns.
  const system =
    baseSystem() +
    "\n\n<live-data>\n" +
    JSON.stringify(liveData ?? [], null, 2) +
    "\n</live-data>";

  // Keep only well-formed alternating turns; Anthropic requires a leading user turn.
  const turns: ChatMessage[] = (messages ?? []).filter(
    (m): m is ChatMessage =>
      !!m &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" &&
      m.content.trim().length > 0,
  );
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (turns.length === 0) {
    return new Response(JSON.stringify({ error: "No prompt provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      // Re-emit Claude's text deltas as the OpenAI-style SSE chunks the client
      // parser (lib/openui/llm-stream.ts) already reads — no client change.
      const sendDelta = (text: string) =>
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`),
        );
      try {
        const stream = client.messages.stream({
          model,
          max_tokens: 16000,
          system,
          messages: turns,
        });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            sendDelta(event.delta.text);
          }
        }
      } catch (e) {
        sendDelta(`Error: ${String((e as Error)?.message ?? e)}`);
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(readable, { headers: SSE_HEADERS });
}
