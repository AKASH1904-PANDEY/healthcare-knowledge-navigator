import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { value: "researcher", label: "Researcher", blurb: "Ask questions, submit new research" },
  { value: "doctor", label: "Doctor", blurb: "Review submitted research" },
];

export function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("researcher");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup(name, email, password, role);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join the Healthcare Knowledge Navigator.">

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition focus:border-teal focus:ring-4 focus:ring-teal/10"
            />
          </div>
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

          <div>
            <label className="mb-2 block text-sm text-ink-soft">I am a…</label>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 transition-colors ${
                    role === r.value
                      ? "border-teal bg-teal/5"
                      : "border-line bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm text-ink">{r.label}</span>
                    <span className="block text-xs text-slate">{r.blurb}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-amber">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-teal py-2.5 font-medium text-white shadow-sm transition hover:bg-teal-deep disabled:opacity-60"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate">
          Already have an account?{" "}
          <Link to="/login" className="text-teal hover:text-teal-deep">
            Sign in
          </Link>
        </p>
    </AuthLayout>
  );
}
