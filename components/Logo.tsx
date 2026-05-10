// AgentPlayground logo — colorful minimal node-graph mark

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="var(--color-surface-3)" stroke="rgba(99,102,241,0.35)" strokeWidth="1" />
      {/* Top node — violet */}
      <circle cx="16" cy="10" r="2.5" fill="#a78bfa" />
      {/* Bottom nodes — indigo */}
      <circle cx="10" cy="20" r="2.5" fill="#6366f1" />
      <circle cx="22" cy="20" r="2.5" fill="#6366f1" />
      {/* Lines */}
      <line x1="16" y1="12.5" x2="10" y2="17.5" stroke="rgba(139,92,246,0.55)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="12.5" x2="22" y2="17.5" stroke="rgba(139,92,246,0.55)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12.5" y1="20" x2="19.5" y2="20" stroke="rgba(99,102,241,0.55)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function LogoMarkLight({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="#1e1b4b" />
      <circle cx="16" cy="10" r="2.5" fill="#a78bfa" />
      <circle cx="10" cy="20" r="2.5" fill="#6366f1" />
      <circle cx="22" cy="20" r="2.5" fill="#6366f1" />
      <line x1="16" y1="12.5" x2="10" y2="17.5" stroke="rgba(139,92,246,0.7)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="12.5" x2="22" y2="17.5" stroke="rgba(139,92,246,0.7)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12.5" y1="20" x2="19.5" y2="20" stroke="rgba(99,102,241,0.7)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
