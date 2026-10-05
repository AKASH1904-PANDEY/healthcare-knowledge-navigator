import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { SubmissionList } from "../components/SubmissionList";
import { StatusBadge } from "../components/StatusBadge";

export function Submit() {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0); // remounts the file input to clear it
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError("Choose a PDF to submit.");
      return;
    }
    setError("");
    setResult(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("file", file);
      const data = await api.submitPaper(form);
      setResult(data);
      setTitle("");
      setFile(null);
      setFileInputKey((k) => k + 1);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const assignedCount = result?.assignedDoctors?.length ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="mb-2 font-serif text-3xl font-semibold text-ink">
        Submit research
      </h1>
      <p className="mb-10 text-slate">
        Upload a paper as a PDF. It is checked against the existing corpus for
        possible contradictions, then reviewed by doctors. Only approved
        submissions become searchable.
      </p>

      <form onSubmit={handleSubmit} className="mb-10 space-y-4">
        <div>
          <label className="mb-1 block text-sm text-ink-soft">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition focus:border-teal focus:ring-4 focus:ring-teal/10"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink-soft">PDF file</label>
          <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${file ? "border-teal bg-teal-tint/60" : "border-line bg-white hover:border-teal/60"}`}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0f6e6e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {file ? <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 14l2 2 4-4" /></> : <><path d="M12 16V4m0 0L7 9m5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>}
            </svg>
            <span className="text-sm font-medium text-ink">{file ? file.name : "Click to choose a PDF"}</span>
            <span className="text-xs text-slate">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Research paper, PDF only"}</span>
            <input
              key={fileInputKey}
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
        </div>

        {error && <p className="text-sm text-amber">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-teal px-6 py-2.5 font-medium text-white shadow-sm transition hover:bg-teal-deep disabled:opacity-60"
        >
          {submitting ? "Analysing…" : "Submit for review"}
        </button>
        {submitting && (
          <p className="text-sm text-slate">
            Checking your paper against the corpus. Longer papers can take a
            minute or two, so keep this tab open.
          </p>
        )}
      </form>

      {result && (
        <div className="mb-10 rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="mb-2 flex items-center justify-between gap-4">
            <h2 className="font-serif text-lg text-ink">Submitted</h2>
            <StatusBadge status={result.status} />
          </div>
          <p className="text-sm text-slate">
            {assignedCount > 0
              ? `Assigned to ${assignedCount} doctor${assignedCount > 1 ? "s" : ""} for review.`
              : "No doctors are registered yet, so this is waiting for reviewers."}
          </p>
          {result.aiFlagsReport && (
            <p className="mt-3 text-sm text-ink-soft">{result.aiFlagsReport.summary}</p>
          )}
          <Link
            to={`/submissions/${result.id}`}
            className="mt-4 inline-block text-sm text-teal hover:text-teal-deep"
          >
            View submission
          </Link>
        </div>
      )}

      <h2 className="mb-4 font-serif text-xl text-ink">Your submissions</h2>
      <SubmissionList
        refreshKey={refreshKey}
        emptyMessage="You haven't submitted anything yet."
      />
    </div>
  );
}
