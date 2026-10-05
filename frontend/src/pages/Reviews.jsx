import { SubmissionList } from "../components/SubmissionList";

export function Reviews() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="mb-2 font-serif text-3xl font-semibold text-ink">
        Review queue
      </h1>
      <p className="mb-10 text-slate">
        Submissions assigned to you. Open one to read it, see the AI's
        advisory notes, and record your decision.
      </p>
      <SubmissionList emptyMessage="Nothing has been assigned to you yet." />
    </div>
  );
}
