const RUST = "#D4715A";

export function LogoMark({ size = 20, color = RUST }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-label="AgentPlayground">
      <line x1="13" y1="2" x2="13" y2="24" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="2.5" y1="8.5" x2="23.5" y2="17.5" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="2.5" y1="17.5" x2="23.5" y2="8.5" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

export function LogoFull({ size = 20, color = RUST }: { size?: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <LogoMark size={size} color={color} />
      <span style={{ fontWeight: 600, fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>AgentPlayground</span>
    </div>
  );
}
