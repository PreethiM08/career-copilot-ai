import { useState } from "react";

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 flex-1">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Message the copilot..."
        disabled={disabled}
        className="flex-1 bg-slate-800 text-white rounded-lg px-4 py-2 outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
      >
        Send
      </button>
    </form>
  );
}