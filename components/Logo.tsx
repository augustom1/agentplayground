const FRAME_BLUE = "#2E9BE8";

export function LogoMark({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="AgentPlayground">
      <g fill={FRAME_BLUE}>
        <rect x="3" y="4" width="26" height="3" />
        <rect x="4" y="7" width="3" height="6" />
        <rect x="3" y="13" width="3" height="6" />
        <rect x="2" y="19" width="3" height="6" />
        <rect x="1" y="25" width="6" height="3" />
        <rect x="25" y="7" width="3" height="6" />
        <rect x="26" y="13" width="3" height="6" />
        <rect x="27" y="19" width="3" height="6" />
        <rect x="25" y="25" width="6" height="3" />
      </g>
      <g fill={color}>
        <rect x="11" y="7" width="2" height="2" />
        <rect x="11" y="10" width="2" height="2" />
        <rect x="11" y="13" width="2" height="2" />
        <rect x="11" y="16" width="2" height="2" />
        <rect x="19" y="7" width="2" height="2" />
        <rect x="19" y="10" width="2" height="2" />
        <rect x="19" y="13" width="2" height="2" />
        <rect x="19" y="16" width="2" height="2" />
        <rect x="8" y="19" width="16" height="3" />
      </g>
    </svg>
  );
}

export function LogoFull({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <LogoMark size={size} color={color} />
      <span style={{ fontWeight: 600, fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>AgentPlayground</span>
    </div>
  );
}
