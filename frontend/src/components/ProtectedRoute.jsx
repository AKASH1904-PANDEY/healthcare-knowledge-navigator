import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Requires a logged-in user. If `roles` is given, users with any other
// role are sent back to the home page instead.
export function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate">
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}
