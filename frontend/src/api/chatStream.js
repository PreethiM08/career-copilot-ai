const API_URL = import.meta.env.VITE_API_URL;

export async function streamChat({ content, conversationId, model, token, onToken, onConversationId, onDone, onError }) {
  try {
    const res = await fetch(`${API_URL}/api/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content,
        conversation_id: conversationId,
        model,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Request failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE messages are separated by double newlines
      const parts = buffer.split("\n\n");
      buffer = parts.pop(); // keep incomplete chunk for next read

      for (const part of parts) {
        const lines = part.split("\n");
        let event = "message";
        let data = "";
        for (const line of lines) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          if (line.startsWith("data:")) data = line.slice(5).trim();
        }

        if (event === "conversation_id") onConversationId?.(data);
        else if (event === "token") {
          const parsed = JSON.parse(data);
          onToken?.(parsed.content);
        } else if (event === "done") onDone?.();
      }
    }
  } catch (err) {
    onError?.(err.message);
  }
}