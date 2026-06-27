import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../api/client";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await signup(email, password);
      navigate("/login");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-xl w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-white">Create account</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 rounded bg-slate-700 text-white outline-none"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 rounded bg-slate-700 text-white outline-none"
          required
        />
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white p-2 rounded">
          Sign up
        </button>
        <p className="text-slate-400 text-sm">
          Already have an account? <Link to="/login" className="text-blue-400">Log in</Link>
        </p>
      </form>
    </div>
  );
}