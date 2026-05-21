// Agent Playground — Brain Network mark: brain outline + 3 nodes

function BrainNetwork({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Agent Playground"
    >
      {/* Brain outline — simplified organic shape */}
      <path
        d="M16 7C13.5 7 11.5 8.2 10.5 10C9.2 10.1 8 11.2 8 12.6C7 13.2 6.5 14.3 6.5 15.5C6.5 17.5 7.8 19.1 9.5 19.6C9.8 21 11 22 12.5 22H19.5C21 22 22.2 21 22.5 19.6C24.2 19.1 25.5 17.5 25.5 15.5C25.5 14.3 25 13.2 24 12.6C24 11.2 22.8 10.1 21.5 10C20.5 8.2 18.5 7 16 7Z"
        stroke={color}
        strokeWidth="1.3"
        strokeLinejoin="round"
        fill="none"
        opacity="0.9"
      />
      {/* Center line — brain division */}
      <line x1="16" y1="8" x2="16" y2="22" stroke={color} strokeWidth="0.9" opacity="0.45" />

      {/* Node 1 — top left */}
      <circle cx="7" cy="5" r="2" fill={color} opacity="0.95" />
      {/* Connection 1 → brain */}
      <line x1="8.7" y1="6.3" x2="10.8" y2="9.5" stroke={color} strokeWidth="1" opacity="0.55" />

      {/* Node 2 — top right */}
      <circle cx="25" cy="5" r="2" fill={color} opacity="0.95" />
      {/* Connection 2 → brain */}
      <line x1="23.3" y1="6.3" x2="21.2" y2="9.5" stroke={color} strokeWidth="1" opacity="0.55" />

      {/* Node 3 — bottom */}
      <circle cx="16" cy="27" r="2" fill={color} opacity="0.95" />
      {/* Connection 3 → brain */}
      <line x1="16" y1="25" x2="16" y2="22.3" stroke={color} strokeWidth="1" opacity="0.55" />
    </svg>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return <BrainNetwork size={size} color="var(--color-brand)" />;
}

export function LogoMarkDark({ size = 32 }: { size?: number }) {
  return <BrainNetwork size={size} color="#38BDF8" />;
}

export function LogoMarkLight({ size = 32 }: { size?: number }) {
  return <BrainNetwork size={size} color="#0EA5E9" />;
}
