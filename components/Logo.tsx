// Agent Playground — Anthropic-inspired asterisk mark

function Asterisk({ size, color }: { size: number; color: string }) {
  const c = size / 2;
  const r1 = size * 0.38;  // outer radius
  const r2 = size * 0.14;  // inner radius (notch)
  const petals = 8;
  const points: string[] = [];

  for (let i = 0; i < petals * 2; i++) {
    const angle = (i * Math.PI) / petals - Math.PI / 2;
    const r = i % 2 === 0 ? r1 : r2;
    points.push(`${c + r * Math.cos(angle)},${c + r * Math.sin(angle)}`);
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Agent Playground"
    >
      <polygon points={points.join(" ")} fill={color} />
    </svg>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return <Asterisk size={size} color="var(--color-brand)" />;
}

export function LogoMarkDark({ size = 32 }: { size?: number }) {
  return <Asterisk size={size} color="#D4715A" />;
}

export function LogoMarkLight({ size = 32 }: { size?: number }) {
  return <Asterisk size={size} color="#C05A42" />;
}
