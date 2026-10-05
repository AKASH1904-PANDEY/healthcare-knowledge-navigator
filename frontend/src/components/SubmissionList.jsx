import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./Illustrations";

// Lists submissions visible to the current user. The backend already
// filters by role: researchers see their own, doctors see the ones
// assigned to them, admins see everything.
export function SubmissionList({ refreshKey = 0, emptyMessage }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .listSubmissions()
      .then((data) => {
        if (!cancelled) {
          setError("");
          setItems(data);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (error) return <p className="text-sm text-amber">{error}</p>;
  if (!items)
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-[74px] rounded-2xl" />)}
      </div>
    );
  if (items.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <ul className="space-y-3">
      {items.map((s) => (
        <li key={s._id}>
          <Link
            to={`/submissions/${s._id}`}
            className="rise flex items-center justify-between gap-4 rounded-2xl border border-line bg-white px-5 py-4 shadow-card transition hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-lift"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{s.title}</p>
              <p className="mt-0.5 text-xs text-slate">
                {new Date(s.createdAt).toLocaleDateString()} ·{" "}
                {s.reviews?.length ?? 0} of {s.assignedDoctors?.length ?? 0} reviews in
              </p>
            </div>
            <StatusBadge status={s.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
