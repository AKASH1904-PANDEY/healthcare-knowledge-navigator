import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/StatusBadge";

const ISSUE_TYPES = [
  { value: "factual_error", label: "Factual error" },
  { value: "unsupported_claim", label: "Unsupported claim" },
  { value: "unclear", label: "Unclear" },
  { value: "contradicts_existing_guideline", label: "Contradicts existing guideline" },
];
const issueLabel = (v) => ISSUE_TYPES.find((t) => t.value === v)?.label ?? v;

// The backend stores chunk indices from 0; people read them from 1.
const chunkLabel = (i) => `Chunk ${i + 1}`;

const inputClass =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-teal focus:ring-4 focus:ring-teal/10";

function ReviewForm({ submission, existingVote, onDone }) {
  const [decision, setDecision] = useState(existingVote?.decision ?? "approve");
  const [comment, setComment] = useState(existingVote?.comment ?? "");
  const [flags, setFlags] = useState(existingVote?.flags ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const chunkCount = submission.textChunks?.length ?? 0;

  function addFlag() {
    setFlags([...flags, { chunkIndex: 0, issueType: "unsupported_claim", comment: "" }]);
  }
  function updateFlag(i, patch) {
    setFlags(flags.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function removeFlag(i) {
    setFlags(flags.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.reviewSubmission(submission._id, {
        decision,
        comment,
        // The backend requires a comment on every flag, so blank ones are dropped.
        flags: flags
          .filter((f) => f.comment.trim())
          .map((f) => ({
            chunkIndex: Number(f.chunkIndex),
            issueType: f.issueType,
            comment: f.comment.trim(),
          })),
      });
      await onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form id="review-form" onSubmit={handleSubmit} className="space-y-5">
      <h2 className="font-serif text-xl text-ink">
        {existingVote ? "Update your review" : "Your review"}
      </h2>

      <div className="flex gap-3">
        {["approve", "reject"].map((d) => (
          <label
            key={d}
            className={`flex-1 cursor-pointer rounded border px-4 py-2 text-center text-sm capitalize transition-colors ${
              decision === d
                ? d === "approve"
                  ? "border-teal bg-teal/5 text-teal-deep"
                  : "border-brick bg-brick/5 text-brick"
                : "border-line bg-white text-ink-soft"
            }`}
          >
            <input
              type="radio"
              name="decision"
              value={d}
              checked={decision === d}
              onChange={() => setDecision(d)}
              className="sr-only"
            />
            {d}
          </label>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm text-ink-soft">
          Overall comment (required)
        </label>
        <textarea
          required
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className={`w-full ${inputClass}`}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-ink-soft">Flag specific chunks (optional)</span>
          <button
            type="button"
            onClick={addFlag}
            className="text-sm text-teal hover:text-teal-deep"
          >
            + Add flag
          </button>
        </div>
        <div className="space-y-3">
          {flags.map((f, i) => (
            <div key={i} className="rounded border border-line bg-white p-3">
              <div className="mb-2 flex flex-wrap gap-2">
                <select
                  value={f.chunkIndex}
                  onChange={(e) => updateFlag(i, { chunkIndex: Number(e.target.value) })}
                  className={inputClass}
                >
                  {Array.from({ length: chunkCount }, (_, idx) => (
                    <option key={idx} value={idx}>
                      {chunkLabel(idx)}
                    </option>
                  ))}
                </select>
                <select
                  value={f.issueType}
                  onChange={(e) => updateFlag(i, { issueType: e.target.value })}
                  className={inputClass}
                >
                  {ISSUE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeFlag(i)}
                  className="ml-auto text-sm text-slate hover:text-brick"
                >
                  Remove
                </button>
              </div>
              <input
                value={f.comment}
                onChange={(e) => updateFlag(i, { comment: e.target.value })}
                placeholder="What is wrong with this chunk?"
                className={`w-full ${inputClass}`}
              />
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-amber">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-teal px-6 py-2.5 font-medium text-white shadow-sm transition hover:bg-teal-deep disabled:opacity-60"
      >
        {submitting ? "Saving…" : existingVote ? "Update review" : "Submit review"}
      </button>
    </form>
  );
}

export function SubmissionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [submission, setSubmission] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setSubmission(await api.getSubmission(id));
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return <div className="mx-auto max-w-4xl px-6 py-16 text-amber">{error}</div>;
  }
  if (!submission) {
    return <div className="mx-auto max-w-4xl px-6 py-16 text-slate">Loading…</div>;
  }

  // /auth/login returns `id`, /auth/me returns `_id`, so accept either.
  const myId = user.id ?? user._id;
  const isReviewerRole = user.role === "doctor" || user.role === "admin";
  const isAssigned = submission.assignedDoctors.some((d) => (d._id ?? d) === myId);
  const isOpen = ["pending_review", "under_review"].includes(submission.status);
  const canReview = isOpen && ((user.role === "doctor" && isAssigned) || user.role === "admin");
  const existingVote = submission.reviews.find((r) => (r.doctorId?._id ?? r.doctorId) === myId);

  const report = submission.aiFlagsReport;
  const aiFlagged = new Set((report?.contradictions ?? []).map((c) => c.chunkIndex));
  const backTo = isReviewerRole ? "/reviews" : "/submit";

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link to={backTo} className="text-sm text-teal hover:text-teal-deep">
        ← Back
      </Link>

      <div className="mt-6 mb-8">
        <div className="mb-2 flex items-start justify-between gap-4">
          <h1 className="font-serif text-3xl font-semibold text-ink">{submission.title}</h1>
          <div className="pt-2">
            <StatusBadge status={submission.status} />
          </div>
        </div>
        <p className="text-sm text-slate">
          Submitted by {submission.submittedBy?.name ?? "unknown"} on{" "}
          {new Date(submission.createdAt).toLocaleDateString()}
        </p>
        {submission.status === "approved" && (
          <p className="mt-3 text-sm text-teal-deep">
            Approved and added to the searchable corpus.
          </p>
        )}
        {submission.status === "rejected" && (
          <p className="mt-3 text-sm text-brick">
            Rejected. The reviewers' comments are below.
          </p>
        )}
        {canReview && (
          <a href="#review-form" className="mt-3 inline-block text-sm text-teal hover:text-teal-deep">
            Jump to review form
          </a>
        )}
      </div>

      <section className="mb-10 border-t border-line pt-6">
        <h2 className="mb-1 font-serif text-xl text-ink">AI advisory notes</h2>
        <p className="mb-4 text-xs text-slate">
          Advisory only. This checks for conflicts with the existing corpus and is
          not a verification of accuracy.
        </p>
        {report ? (
          <>
            <p className="text-sm text-ink-soft">{report.summary}</p>
            {report.contradictions?.length > 0 && (
              <ul className="mt-4 space-y-3">
                {report.contradictions.map((c, i) => (
                  <li key={i} className="border-l-2 border-amber pl-3 text-sm">
                    <a href={`#chunk-${c.chunkIndex}`} className="text-amber hover:underline">
                      {chunkLabel(c.chunkIndex)}
                    </a>{" "}
                    <span className="text-slate">
                      may conflict with {c.conflictingSourceTitle}
                    </span>
                    <p className="mt-1 text-ink-soft">{c.note}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-sm text-slate">No AI report was generated for this submission.</p>
        )}
      </section>

      <section className="mb-10 border-t border-line pt-6">
        <h2 className="mb-4 font-serif text-xl text-ink">
          Submission text{" "}
          <span className="text-sm font-normal text-slate">
            ({submission.textChunks?.length ?? 0} chunks)
          </span>
        </h2>
        <div className="max-h-[32rem] space-y-3 overflow-y-auto rounded border border-line bg-white p-4">
          {(submission.textChunks ?? []).map((text, i) => (
            <div
              key={i}
              id={`chunk-${i}`}
              className={`border-l-2 pl-3 ${aiFlagged.has(i) ? "border-amber" : "border-line"}`}
            >
              <p className="mb-1 text-xs text-slate">{chunkLabel(i)}</p>
              <p className="text-sm leading-relaxed text-ink">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10 border-t border-line pt-6">
        <h2 className="mb-4 font-serif text-xl text-ink">Reviews</h2>
        {submission.reviews.length === 0 ? (
          <p className="text-sm text-slate">No reviews yet.</p>
        ) : (
          <ul className="space-y-5">
            {submission.reviews.map((r, i) => (
              <li key={i} className="text-sm">
                <p className="text-ink">
                  {r.doctorId?.name ?? "A doctor"}{" "}
                  <span className={r.decision === "approve" ? "text-teal-deep" : "text-brick"}>
                    {r.decision === "approve" ? "approved" : "rejected"}
                  </span>
                </p>
                <p className="mt-1 text-ink-soft">{r.comment}</p>
                {r.flags?.length > 0 && (
                  <ul className="mt-2 space-y-1 border-l-2 border-line pl-3">
                    {r.flags.map((f, j) => (
                      <li key={j} className="text-slate">
                        <a href={`#chunk-${f.chunkIndex}`} className="text-teal hover:underline">
                          {chunkLabel(f.chunkIndex)}
                        </a>{" "}
                        · {issueLabel(f.issueType)}: {f.comment}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canReview && (
        <section className="border-t border-line pt-6">
          <ReviewForm
            key={existingVote ? "existing" : "new"}
            submission={submission}
            existingVote={existingVote}
            onDone={load}
          />
        </section>
      )}
    </div>
  );
}
