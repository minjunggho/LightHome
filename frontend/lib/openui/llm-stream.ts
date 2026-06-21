// Client-side reader for the OpenAI-compatible SSE the /api/chat route proxies.
// Trimmed from the official openui-dashboard example (tool-call handling kept so
// it stays a drop-in, even though this integration doesn't register tools yet).

export type LLMToolCall = { id: string; name: string; status: "calling" | "done"; result?: string };

export async function streamChat(
  endpoint: string,
  body: unknown,
  onChunk: (text: string) => void,
  onDone: (usage?: { prompt_tokens?: number; completion_tokens?: number }) => void,
  signal?: AbortSignal,
  onFirstChunk?: () => void,
) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.error ? `Error: ${j.error}` : msg;
    } catch {
      /* keep status */
    }
    onChunk(msg);
    onDone();
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastUsage: { prompt_tokens?: number; completion_tokens?: number } | undefined;
  let firstChunkFired = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        onDone(lastUsage);
        return;
      }
      try {
        const chunk = JSON.parse(data);
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          if (!firstChunkFired) {
            firstChunkFired = true;
            onFirstChunk?.();
          }
          onChunk(content);
        }
        if (chunk.usage) lastUsage = chunk.usage;
      } catch {
        /* skip malformed chunks */
      }
    }
  }
  onDone(lastUsage);
}
