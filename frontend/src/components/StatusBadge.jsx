const STATUS = {
  pending_review: { label: "Awaiting reviewers", cls: "bg-slate/10 text-slate", dot: "bg-slate" },
  under_review: { label: "Under review", cls: "bg-amber/10 text-amber", dot: "bg-amber" },
  approved: { label: "Approved", cls: "bg-teal/10 text-teal-deep", dot: "bg-teal" },
  rejected: { label: "Rejected", cls: "bg-brick/10 text-brick", dot: "bg-brick" },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending_review;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
