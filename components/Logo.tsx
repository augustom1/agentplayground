// Agent Playground — Play-button mark (circle + triangle, distinct from Claude asterisk)

function PlayMark({ size, color }: { size: number; color: string }) {
  const r = size / 2;
  const strokeW = size * 0.085;
  // Triangle points — slightly right-biased for optical balance
  const tx = r * 0.28;
  const ty = r * 0.35;
  const p1 = `${r - tx},${r - ty}`;
  const p2 = `${r - tx},${r + ty}`;
  const p3 = `${r + tx * 1.6},${r}`;

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Agent Playground"
    >
      <circle
        cx={r} cy={r} r={r - strokeW / 2}
        stroke={color} strokeWidth={strokeW}
      />
      <polygon points={`${p1} ${p2} ${p3}`} fill={color} />
    </svg>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return <PlayMark size={size} color="var(--color-brand)" />;
}

export function LogoMarkDark({ size = 32 }: { size?: number }) {
  return <PlayMark size={size} color="#38BDF8" />;
}

export function LogoMarkLight({ size = 32 }: { size?: number }) {
  return <PlayMark size={size} color="#0EA5E9" />;
}
