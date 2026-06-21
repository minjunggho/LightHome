import { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Speech-to-text proxy for the composer mic.
 *
 * The client records a short audio clip (MediaRecorder) and POSTs the raw bytes
 * here; we forward them to Deepgram's pre-recorded `listen` API with the server
 * key (never exposed to the browser) and return the transcript. Press-to-record,
 * one round trip — see Composer.tsx.
 */
const DEEPGRAM_LISTEN = "https://api.deepgram.com/v1/listen";

export async function POST(req: NextRequest) {
  const key = process.env.DEEPGRAM_API_KEY || "";
  if (!key) {
    return Response.json(
      {
        error:
          "No Deepgram key set. Add DEEPGRAM_API_KEY to frontend/.env.local — see .env.example.",
      },
      { status: 500 },
    );
  }

  const audio = await req.arrayBuffer();
  if (!audio.byteLength) {
    return Response.json({ error: "Empty audio" }, { status: 400 });
  }

  const contentType = req.headers.get("content-type") || "audio/webm";
  const params = new URLSearchParams({
    model: process.env.DEEPGRAM_STT_MODEL || "nova-3",
    smart_format: "true",
    punctuate: "true",
  });

  let dgRes: Response;
  try {
    dgRes = await fetch(`${DEEPGRAM_LISTEN}?${params}`, {
      method: "POST",
      headers: { Authorization: `Token ${key}`, "Content-Type": contentType },
      body: audio,
    });
  } catch (e) {
    return Response.json(
      { error: `Deepgram request failed: ${String((e as Error)?.message ?? e)}` },
      { status: 502 },
    );
  }

  if (!dgRes.ok) {
    const detail = await dgRes.text().catch(() => "");
    return Response.json(
      { error: `Deepgram error (${dgRes.status})`, detail: detail.slice(0, 500) },
      { status: 502 },
    );
  }

  const data = (await dgRes.json()) as {
    results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
  };
  const transcript =
    data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";

  return Response.json({ transcript });
}
