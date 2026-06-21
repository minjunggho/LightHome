import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

/**
 * Spoken summary of a generated dashboard answer.
 *
 * Deepgram does speech, not text summarization, so this is a two-step server
 * pipeline: Claude condenses the question + answer into one or two spoken
 * sentences, then Deepgram's Aura TTS voices it. Returns the audio (audio/mpeg);
 * the plain-text summary rides along in the `X-Summary-Text` header for captions
 * and accessibility.
 */
const DEEPGRAM_SPEAK = "https://api.deepgram.com/v1/speak";

type Body = { question?: string; answer?: string };

export async function POST(req: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY || "";
  const deepgramKey = process.env.DEEPGRAM_API_KEY || "";
  if (!anthropicKey) {
    return Response.json({ error: "No ANTHROPIC_API_KEY set." }, { status: 500 });
  }
  if (!deepgramKey) {
    return Response.json(
      {
        error:
          "No Deepgram key set. Add DEEPGRAM_API_KEY to frontend/.env.local — see .env.example.",
      },
      { status: 500 },
    );
  }

  const { question, answer } = (await req.json()) as Body;
  const q = (question ?? "").trim();
  const a = (answer ?? "").trim();
  if (!a) {
    return Response.json({ error: "No answer to summarize" }, { status: 400 });
  }

  // 1) Condense to a short spoken summary with Claude (a fast model is plenty).
  let summary: string;
  try {
    const client = new Anthropic({ apiKey: anthropicKey });
    const model = process.env.SUMMARY_MODEL || "claude-sonnet-4-6";
    const msg = await client.messages.create({
      model,
      max_tokens: 160,
      system:
        "You narrate a one- or two-sentence spoken summary of a dashboard answer for a parent-safety tool called LightHome. Plain spoken prose only — no markdown, no lists, no code, no preamble like 'Here is'. Lead with the answer to the question. Keep it under 45 words.",
      messages: [
        {
          role: "user",
          content: `Question: ${q || "(none)"}\n\nAnswer / generated view:\n${a.slice(0, 6000)}`,
        },
      ],
    });
    summary = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join(" ")
      .trim();
  } catch (e) {
    return Response.json(
      { error: `Summary failed: ${String((e as Error)?.message ?? e)}` },
      { status: 502 },
    );
  }

  if (!summary) {
    return Response.json({ error: "Empty summary" }, { status: 502 });
  }

  // 2) Voice it with Deepgram Aura.
  const params = new URLSearchParams({
    model: process.env.DEEPGRAM_TTS_MODEL || "aura-2-thalia-en",
  });
  let dgRes: Response;
  try {
    dgRes = await fetch(`${DEEPGRAM_SPEAK}?${params}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${deepgramKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: summary }),
    });
  } catch (e) {
    return Response.json(
      { error: `Deepgram request failed: ${String((e as Error)?.message ?? e)}` },
      { status: 502 },
    );
  }

  if (!dgRes.ok || !dgRes.body) {
    const detail = await dgRes.text().catch(() => "");
    return Response.json(
      { error: `Deepgram TTS error (${dgRes.status})`, detail: detail.slice(0, 500) },
      { status: 502 },
    );
  }

  return new Response(dgRes.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      // Header values must be latin1-safe; encode so any prose survives.
      "X-Summary-Text": encodeURIComponent(summary),
    },
  });
}
