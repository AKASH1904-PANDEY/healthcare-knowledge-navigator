// Hand-built SVG illustrations (no external assets). All use the app palette.

// Hero: a research paper feeding a network of verified knowledge nodes.
export function HeroArt({ className = "" }) {
  return (
    <svg viewBox="0 0 420 320" fill="none" className={className} role="img" aria-label="Documents connected to a knowledge network">
      <defs>
        <linearGradient id="h-bg" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e3f1ef" />
          <stop offset="1" stopColor="#cfe6e3" />
        </linearGradient>
        <linearGradient id="h-card" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#f2f7f6" />
        </linearGradient>
        <filter id="h-sh" x="-60%" y="-60%" width="220%" height="240%">
          <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#13293d" floodOpacity=".14" />
        </filter>
      </defs>
      <ellipse cx="215" cy="165" rx="200" ry="148" fill="url(#h-bg)" />
      {/* connections */}
      <g stroke="#0f6e6e" strokeOpacity=".4" strokeWidth="1.6" strokeDasharray="4 5">
        <path d="M210 150 330 70" /><path d="M210 150 350 190" />
        <path d="M210 150 320 270" /><path d="M210 150 78 250" /><path d="M210 150 60 80" />
      </g>
      {/* satellite nodes */}
      {[[330,70],[350,190],[320,270],[78,250],[60,80]].map(([x,y],i)=>(
        <g key={i}>
          <circle cx={x} cy={y} r="19" fill="#fff" filter="url(#h-sh)" />
          <circle cx={x} cy={y} r="7" fill={i%2? "#b8722e":"#0f6e6e"} />
        </g>
      ))}
      {/* main paper */}
      <g filter="url(#h-sh)">
        <rect x="140" y="82" width="140" height="170" rx="14" fill="url(#h-card)" />
      </g>
      <rect x="158" y="104" width="64" height="9" rx="4.5" fill="#13293d" />
      <rect x="158" y="124" width="104" height="6" rx="3" fill="#cdd8d6" />
      <rect x="158" y="138" width="96" height="6" rx="3" fill="#cdd8d6" />
      <rect x="158" y="152" width="104" height="6" rx="3" fill="#cdd8d6" />
      <rect x="158" y="172" width="104" height="30" rx="8" fill="#0f6e6e" fillOpacity=".1" />
      <path d="M168 187h22M168 187" stroke="#0f6e6e" strokeWidth="3" strokeLinecap="round" />
      <rect x="198" y="184" width="52" height="6" rx="3" fill="#0f6e6e" fillOpacity=".5" />
      {/* verified seal */}
      <circle cx="262" cy="236" r="26" fill="#0f6e6e" filter="url(#h-sh)" />
      <path d="m250 236 8 8 15-17" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      {/* floating medical cross */}
      <g transform="translate(112 52)">
        <rect width="34" height="34" rx="10" fill="#fff" filter="url(#h-sh)" />
        <path d="M14.5 8h5v6.5H26v5h-6.5V26h-5v-6.5H8v-5h6.5V8Z" fill="#b8722e" />
      </g>
    </svg>
  );
}

// Side panel art for sign in / sign up: layered pulse line over soft shapes.
export function AuthArt({ className = "" }) {
  return (
    <svg viewBox="0 0 480 640" fill="none" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="a-bg" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#0f6e6e" /><stop offset="1" stopColor="#082f3a" />
        </linearGradient>
        <radialGradient id="a-glow" cx=".3" cy=".25" r=".7">
          <stop stopColor="#3fc1b9" stopOpacity=".45" /><stop offset="1" stopColor="#3fc1b9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="480" height="640" fill="url(#a-bg)" />
      <rect width="480" height="640" fill="url(#a-glow)" />
      {/* node mesh */}
      <g stroke="#fff" strokeOpacity=".14">
        {[[60,120,200,200],[200,200,340,130],[340,130,430,260],[200,200,150,300],[150,300,330,330],[330,330,430,260],[330,330,400,470]].map(([a,b,c,d],i)=>(
          <path key={i} d={`M${a} ${b}L${c} ${d}`} />
        ))}
      </g>
      {[[60,120],[200,200],[340,130],[430,260],[150,300],[330,330],[400,470]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={i%3===0?7:4.5} fill="#fff" fillOpacity={i%3===0?.9:.5} />
      ))}
      {/* pulse line */}
      <path d="M0 590h120l24-40 36 78 30-56 18 18h252" stroke="#f3c98b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity=".9" />
    </svg>
  );
}

// Empty state: an empty tray with a magnifier.
export function EmptyArt({ className = "" }) {
  return (
    <svg viewBox="0 0 200 140" fill="none" className={className} aria-hidden="true">
      <ellipse cx="100" cy="120" rx="70" ry="10" fill="#dbe2e0" fillOpacity=".7" />
      <rect x="46" y="38" width="108" height="72" rx="12" fill="#fff" stroke="#dbe2e0" strokeWidth="2" />
      <rect x="62" y="56" width="52" height="7" rx="3.5" fill="#dbe2e0" />
      <rect x="62" y="72" width="76" height="6" rx="3" fill="#e9eeed" />
      <rect x="62" y="85" width="60" height="6" rx="3" fill="#e9eeed" />
      <circle cx="140" cy="48" r="20" fill="#e3f1ef" stroke="#0f6e6e" strokeWidth="3" />
      <path d="m154 62 14 14" stroke="#0f6e6e" strokeWidth="4" strokeLinecap="round" />
      <path d="M133 48h14M140 41v14" stroke="#0f6e6e" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-12 text-center">
      <EmptyArt className="mb-3 w-40" />
      <p className="text-sm text-slate">{message}</p>
    </div>
  );
}
