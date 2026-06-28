import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { streamChat } from "../api/chatStream";
import { getConversationMessages } from "../api/client";
import ChatWindow from "../components/ChatWindow";
import ChatInput from "../components/ChatInput";
import ModelSelector from "../components/ModelSelector";
import Sidebar from "../components/Sidebar";

export default function Chat() {
  const { token, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [model, setModel] = useState("gpt-4o-mini");
  const [streaming, setStreaming] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [animating, setAnimating] = useState(false);

  const abortRef = useRef(null);
  const queueRef = useRef([]);
  const flushingRef = useRef(false);
  const sessionIdRef = useRef(0);       // identifies the "current" stream
  const assistantIndexRef = useRef(-1); // which messages[] index this session writes to

  function appendToIndex(index, text) {
    setMessages((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const updated = [...prev];
      updated[index] = { ...updated[index], content: updated[index].content + text };
      return updated;
    });
  }

  function startQueueFlusher(mySessionId, myIndex) {
    if (flushingRef.current) return;
    flushingRef.current = true;
    setAnimating(true);

    function tick() {
      if (sessionIdRef.current !== mySessionId) {
        flushingRef.current = false;
        setAnimating(false);
        return;
      }
      if (queueRef.current.length === 0) {
        flushingRef.current = false;
        setAnimating(false);
        return;
      }
      const chunk = queueRef.current.splice(0, 3).join("");
      appendToIndex(myIndex, chunk);
      setTimeout(tick, 12);
    }
    tick();
  }

  function handleSend(content) {
    // Invalidate any previous session's flusher immediately
    sessionIdRef.current += 1;
    const mySessionId = sessionIdRef.current;
    queueRef.current = [];
    flushingRef.current = false;

    setMessages((prev) => {
      const updated = [...prev, { role: "user", content }, { role: "assistant", content: "" }];
      assistantIndexRef.current = updated.length - 1;
      return updated;
    });

    setStreaming(true);
    abortRef.current = new AbortController();
    const myIndex = assistantIndexRef.current;

    streamChat({
      content,
      conversationId,
      model,
      token,
      signal: abortRef.current.signal,
      onConversationId: (id) => {
        setConversationId(Number(id));
        setRefreshKey((k) => k + 1);
      },
      onTitle: () => setRefreshKey((k) => k + 1),
      onToken: (chunk) => {
        if (sessionIdRef.current !== mySessionId) return; // stale stream, ignore
        queueRef.current.push(...chunk.split(""));
        startQueueFlusher(mySessionId, myIndex);
      },
      onDone: () => {
        if (sessionIdRef.current === mySessionId) setStreaming(false);
      },
      onError: (err) => {
        if (sessionIdRef.current !== mySessionId) return;
        setStreaming(false);
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err}` }]);
      },
    });
  }

  function handleStop() {
    abortRef.current?.abort();
    sessionIdRef.current += 1;
    queueRef.current = [];
    flushingRef.current = false;
    setStreaming(false);
    setAnimating(false);
    setTimeout(() => setRefreshKey((k) => k + 1), 500);
  }

  function handleNewChat() {
    abortRef.current?.abort();  
    sessionIdRef.current += 1;
    queueRef.current = [];
    flushingRef.current = false;
    setStreaming(false);  
    setConversationId(null);
    setMessages([]);
  }

  async function handleSelectConversation(id) {
    abortRef.current?.abort();
    sessionIdRef.current += 1;
    queueRef.current = [];
    flushingRef.current = false;
    setAnimating(false);
    setStreaming(false); 
    setConversationId(id);
    try {
      const msgs = await getConversationMessages(id, token);
      setMessages(msgs.map((m) => ({ role: m.role, content: m.content })));
    } catch {
      setMessages([]);
    }
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-900">
      <div
        className={`flex-shrink-0 overflow-hidden transition-all duration-200 ${sidebarOpen ? "w-64" : "w-0"
          }`}
      >
        <Sidebar
          token={token}
          activeId={conversationId}
          onSelect={handleSelectConversation}
          onNewChat={handleNewChat}
          refreshKey={refreshKey}
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <header className="flex justify-between items-center gap-3 p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? "Hide history" : "Show history"}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 flex-shrink-0"
            >
              ☰
            </button>
            <h1 className="text-white font-semibold truncate">AI Research & Career Copilot</h1>
          </div>
          <div className="flex gap-3 items-center flex-shrink-0">
            <ModelSelector model={model} setModel={setModel} />
            <button onClick={logout} className="text-slate-400 text-sm hover:text-white whitespace-nowrap">
              Log out
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatWindow messages={messages} />
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-slate-700 flex-shrink-0">
          <ChatInput onSend={handleSend} disabled={streaming} />
          {(streaming || animating) && (
            <button
              onClick={handleStop}
              className="text-red-400 text-sm hover:text-red-300 border border-red-400/40 rounded-lg px-3 py-2 whitespace-nowrap flex-shrink-0"
            >
              ■ Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}