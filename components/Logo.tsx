// AgentPlayground logo — a minimal geometric mark + wordmark
// Used in both the sidebar and landing page

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer rounded square */}
      <rect width="32" height="32" rx="8" fill="var(--color-surface-3)" stroke="var(--color-border)" strokeWidth="1" />
      {/* Hexagon node graph mark */}
      <circle cx="16" cy="10" r="2.5" fill="var(--color-text)" />
      <circle cx="10" cy="20" r="2.5" fill="var(--color-text-secondary)" />
      <circle cx="22" cy="20" r="2.5" fill="var(--color-text-secondary)" />
      <line x1="16" y1="12.5" x2="10" y2="17.5" stroke="var(--color-border-light)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="12.5" x2="22" y2="17.5" stroke="var(--color-border-light)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12.5" y1="20" x2="19.5" y2="20" stroke="var(--color-border-light)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function LogoMarkLight({ size = 32 }: { size?: number }) {
  // Version for light backgrounds (landing page)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="#1a1a1a" />
      <circle cx="16" cy="10" r="2.5" fill="#f5f5f5" />
      <circle cx="10" cy="20" r="2.5" fill="#888" />
      <circle cx="22" cy="20" r="2.5" fill="#888" />
      <line x1="16" y1="12.5" x2="10" y2="17.5" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="12.5" x2="22" y2="17.5" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12.5" y1="20" x2="19.5" y2="20" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
