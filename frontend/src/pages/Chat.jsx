import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { streamChat } from "../api/chatStream";
import ChatWindow from "../components/ChatWindow";
import ChatInput from "../components/ChatInput";
import ModelSelector from "../components/ModelSelector";

export default function Chat() {
  const { token, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [model, setModel] = useState("gpt-4o-mini");
  const [streaming, setStreaming] = useState(false);
  const queueRef = useRef([]);
  const flushingRef = useRef(false);

  function appendToLastMessage(text) {
    setMessages((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        content: updated[updated.length - 1].content + text,
      };
      return updated;
    });
  }

  function startQueueFlusher() {
    if (flushingRef.current) return;
    flushingRef.current = true;

    function tick() {
      if (queueRef.current.length === 0) {
        flushingRef.current = false;
        return;
      }
      // release a few characters per tick for a smooth typing feel
      const chunk = queueRef.current.splice(0, 3).join("");
      appendToLastMessage(chunk);
      setTimeout(tick, 12); // ~12ms between renders
    }
    tick();
  }

  function handleSend(content) {
    setMessages((prev) => [...prev, { role: "user", content }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setStreaming(true);
    queueRef.current = [];

    streamChat({
      content,
      conversationId,
      model,
      token,
      onConversationId: (id) => setConversationId(Number(id)),
      onToken: (chunk) => {
        queueRef.current.push(...chunk.split(""));
        startQueueFlusher();
      },
      onDone: () => setStreaming(false),
      onError: (err) => {
        setStreaming(false);
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err}` }]);
      },
    });
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      <header className="flex justify-between items-center p-4 border-b border-slate-700">
        <h1 className="text-white font-semibold">AI Research & Career Copilot</h1>
        <div className="flex gap-3 items-center">
          <ModelSelector model={model} setModel={setModel} />
          <button onClick={logout} className="text-slate-400 text-sm hover:text-white">
            Log out
          </button>
        </div>
      </header>
      <ChatWindow messages={messages} />
      <ChatInput onSend={handleSend} disabled={streaming} />
    </div>
  );
}