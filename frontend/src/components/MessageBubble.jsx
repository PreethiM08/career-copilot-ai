import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MessageBubble({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[75%] min-w-0 rounded-2xl px-4 py-2 prose prose-invert prose-sm break-words overflow-x-auto ${isUser ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-100"
          }`}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}