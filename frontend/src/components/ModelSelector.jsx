export default function ModelSelector({ model, setModel }) {
  return (
    <select
      value={model}
      onChange={(e) => setModel(e.target.value)}
      className="bg-slate-700 text-white text-sm rounded px-2 py-1 outline-none"
    >
      <option value="gpt-4o-mini">GPT-4o mini</option>
      <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
    </select>
  );
}