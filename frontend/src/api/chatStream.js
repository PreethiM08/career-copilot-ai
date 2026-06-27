const API_URL = import.meta.env.VITE_API_URL;

export async function streamChat({ content, conversationId, model, token, signal, onToken, onConversationId, onDone, onError }) {
  try {
    const res = await fetch(`${API_URL}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content, conversation_id: conversationId, model }),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Request failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    function processPart(part) {
      const lines = part.split(/\r?\n/);
      let event = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data = line.slice(5).trim();
      }
      if (!data) return;
      if (event === "conversation_id") onConversationId?.(data);
      else if (event === "token") {
        try {
          const parsed = JSON.parse(data);
          onToken?.(parsed.content);
        } catch {
          // ignore malformed chunk
        }
      } else if (event === "done") onDone?.();
    }

    while (true) {
      const { value, done } = await reader.read();
      if (signal?.aborted) {
        reader.cancel().catch(() => { });
        break;
      }
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop();
        for (const part of parts) {
          if (part.trim()) processPart(part);
        }
      }
      if (done) {
        if (buffer.trim()) processPart(buffer);
        break;
      }
    }
  } catch (err) {
    if (err.name === "AbortError") {
      onDone?.();
    } else {
      onError?.(err.message);
    }
  }
}
