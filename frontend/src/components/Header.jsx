import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Logo } from "./Logo";

const link = ({ isActive }) =>
  `rounded-full px-3.5 py-1.5 text-sm transition-colors ${
    isActive ? "bg-teal-tint font-medium text-teal-deep" : "text-ink-soft hover:bg-black/5"
  }`;

export function Header() {
  const { user, logout } = useAuth();
  const initials = user?.name?.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <Link to="/" aria-label="Knowledge Navigator home"><Logo /></Link>

        {user && (
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/" end className={link}>Ask</NavLink>
            {(user.role === "researcher" || user.role === "admin") && (
              <NavLink to="/submit" className={link}>Submit research</NavLink>
            )}
            {(user.role === "doctor" || user.role === "admin") && (
              <NavLink to="/reviews" className={link}>Reviews</NavLink>
            )}
            <div className="ml-3 flex items-center gap-3 border-l border-line pl-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-xs font-semibold text-white" title={user.name}>
                {initials}
              </span>
              <span className="hidden text-sm leading-tight sm:block">
                <span className="block text-ink">{user.name}</span>
                <span className="block text-xs capitalize text-slate">{user.role}</span>
              </span>
              <button onClick={logout} className="rounded-full px-3 py-1.5 text-sm text-teal hover:bg-teal-tint">
                Sign out
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
