import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to the Healthcare Knowledge Navigator.">

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition focus:border-teal focus:ring-4 focus:ring-teal/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition focus:border-teal focus:ring-4 focus:ring-teal/10"
            />
          </div>

          {error && <p className="text-sm text-amber">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-teal py-2.5 font-medium text-white shadow-sm transition hover:bg-teal-deep disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate">
          Don't have an account?{" "}
          <Link to="/signup" className="text-teal hover:text-teal-deep">
            Create one
          </Link>
        </p>
    </AuthLayout>
  );
}
