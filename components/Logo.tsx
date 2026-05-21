// Agent Playground — Copper node-graph mark, warm ops identity

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Agent Playground"
    >
      {/* Background: inherits the surface color so it adapts to theme */}
      <rect
        width="32"
        height="32"
        rx="8"
        fill="var(--color-surface)"
        stroke="var(--color-brand-muted)"
        strokeWidth="1"
      />
      {/* Top node — operator (brightest) */}
      <circle cx="16" cy="9.5" r="2.5" fill="var(--color-brand)" />
      {/* Bottom-left node — agent */}
      <circle cx="10" cy="21.5" r="2" fill="var(--color-brand)" opacity="0.72" />
      {/* Bottom-right node — agent */}
      <circle cx="22" cy="21.5" r="2" fill="var(--color-brand)" opacity="0.72" />
      {/* Edges */}
      <line
        x1="16" y1="12" x2="10.8" y2="19.5"
        stroke="var(--color-brand-muted)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="16" y1="12" x2="21.2" y2="19.5"
        stroke="var(--color-brand-muted)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="12" y1="21.5" x2="20" y2="21.5"
        stroke="var(--color-brand-muted)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Pinned-color dark variant (for favicon / export / email)
export function LogoMarkDark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Agent Playground"
    >
      <rect width="32" height="32" rx="8" fill="#1d1b13" stroke="rgba(207,140,74,0.35)" strokeWidth="1" />
      <circle cx="16" cy="9.5" r="2.5" fill="#cf8c4a" />
      <circle cx="10" cy="21.5" r="2" fill="#cf8c4a" opacity="0.72" />
      <circle cx="22" cy="21.5" r="2" fill="#cf8c4a" opacity="0.72" />
      <line x1="16" y1="12" x2="10.8" y2="19.5" stroke="rgba(207,140,74,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="12" x2="21.2" y2="19.5" stroke="rgba(207,140,74,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="21.5" x2="20" y2="21.5" stroke="rgba(207,140,74,0.5)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Pinned-color light variant (for use on dark/opaque backgrounds)
export function LogoMarkLight({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Agent Playground"
    >
      <rect width="32" height="32" rx="8" fill="#f4f0e6" stroke="rgba(184,116,44,0.3)" strokeWidth="1" />
      <circle cx="16" cy="9.5" r="2.5" fill="#b8742c" />
      <circle cx="10" cy="21.5" r="2" fill="#b8742c" opacity="0.7" />
      <circle cx="22" cy="21.5" r="2" fill="#b8742c" opacity="0.7" />
      <line x1="16" y1="12" x2="10.8" y2="19.5" stroke="rgba(184,116,44,0.45)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="12" x2="21.2" y2="19.5" stroke="rgba(184,116,44,0.45)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="21.5" x2="20" y2="21.5" stroke="rgba(184,116,44,0.45)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
