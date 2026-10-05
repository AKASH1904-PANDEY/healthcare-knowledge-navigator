// Brand mark: a medical cross whose arms are connected nodes — "knowledge
// network" meets "healthcare".
export function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="url(#lg)" />
      <path d="M17 9h6v8h8v6h-8v8h-6v-8H9v-6h8V9Z" fill="#fff" fillOpacity=".95" />
      <circle cx="20" cy="20" r="3" fill="#0f6e6e" />
      <circle cx="31" cy="9.5" r="2.2" fill="#f3c98b" />
      <path d="M23.5 16.5 29.6 10.8" stroke="#f3c98b" strokeWidth="1.4" strokeLinecap="round" />
      <defs>
        <linearGradient id="lg" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#14908f" />
          <stop offset="1" stopColor="#0a4f4f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ light = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className={`font-serif text-lg font-semibold leading-none ${light ? "text-white" : "text-ink"}`}>
        Knowledge Navigator
      </span>
    </span>
  );
}
