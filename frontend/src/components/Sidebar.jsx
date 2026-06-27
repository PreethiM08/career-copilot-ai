import { useEffect, useState } from "react";
import { listConversations } from "../api/client";

export default function Sidebar({ token, activeId, onSelect, onNewChat, refreshKey }) {
    const [conversations, setConversations] = useState([]);

    useEffect(() => {
        listConversations(token).then(setConversations).catch(() => { });
    }, [token, refreshKey]);

    return (
        <div className="h-full w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
            <div className="p-3">
                <button
                    onClick={onNewChat}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 text-sm font-medium"
                >
                    + New Chat
                </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 space-y-1 min-h-0">
                {conversations.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => onSelect(c.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate ${c.id === activeId
                            ? "bg-slate-800 text-white"
                            : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                            }`}
                    >
                        {c.title}
                    </button>
                ))}
            </div>
        </div>
    );
}