"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface GraphNode { id: string; title: string; tags: string[]; folder: string }
export interface GraphEdge { source: string; target: string; label?: string }

interface SimNode extends GraphNode { x: number; y: number; vx: number; vy: number; degree: number }

const FOLDER_COLORS: Record<string, string> = {
  Personal:  "#60a5fa",
  Business:  "#4ade80",
  Education: "#facc15",
  Resources: "#f87171",
  inbox:     "#c084fc",
};
const nodeColor = (f: string) => FOLDER_COLORS[f] || "#94a3b8";

// Stable star field
const STARS = Array.from({ length: 120 }, (_, i) => ({
  x: ((i * 137.508 + 13) * 1.618) % 1,
  y: ((i * 97.345 + 7) * 2.71) % 1,
  r: 0.3 + (i % 5) * 0.18,
  o: 0.1 + (i % 9) * 0.03,
}));

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function KnowledgeGraph({
  nodes: rawNodes,
  edges: rawEdges,
  onClickNode,
  loading,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onClickNode?: (id: string) => void;
  loading?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const animRef = useRef<number>(0);
  const iterRef = useRef(0);
  const sizeRef = useRef({ w: 800, h: 600 });
  const hoveredRef = useRef<string | null>(null);
  const draggingRef = useRef<string | null>(null);
  const dragOffRef = useRef({ x: 0, y: 0 });
  const wasDragRef = useRef(false);
  const [cursor, setCursor] = useState("default");

  // ── Measure container ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    const update = () => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      sizeRef.current = { w: parent.clientWidth, h: parent.clientHeight };
    };
    const ro = new ResizeObserver(update);
    ro.observe(parent);
    update();
    return () => ro.disconnect();
  }, []);

  // ── Init simulation from props ─────────────────────────────────────────────
  useEffect(() => {
    const { w: W, h: H } = sizeRef.current;
    const degrees: Record<string, number> = {};
    for (const e of rawEdges) {
      degrees[e.source] = (degrees[e.source] || 0) + 1;
      degrees[e.target] = (degrees[e.target] || 0) + 1;
    }
    const existing = new Map(simRef.current.map((n) => [n.id, n]));
    simRef.current = rawNodes.map((n) => {
      const p = existing.get(n.id);
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * Math.min(W, H) * 0.3;
      return {
        ...n,
        x: p?.x ?? W / 2 + Math.cos(angle) * dist,
        y: p?.y ?? H / 2 + Math.sin(angle) * dist,
        vx: 0, vy: 0,
        degree: degrees[n.id] || 0,
      };
    });
    edgesRef.current = rawEdges;
    iterRef.current = 0;
  }, [rawNodes, rawEdges]);

  // ── Main render + physics loop ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const MAX_ITER = 700;
    const REPULSION = 4000;
    const SPRING_K = 0.022;
    const SPRING_LEN = 140;
    const GRAVITY = 0.003;
    const DAMP = 0.78;

    // Animated pulse phase
    let phase = 0;

    function frame() {
      phase += 0.025;
      const { w: W, h: H } = sizeRef.current;
      const nodes = simRef.current;
      const dragging = draggingRef.current;
      const hov = hoveredRef.current;

      // ── Physics ────────────────────────────────────────────────────────────
      if (iterRef.current < MAX_ITER) {
        for (const n of nodes) {
          if (n.id === dragging) continue;
          let fx = (W / 2 - n.x) * GRAVITY;
          let fy = (H / 2 - n.y) * GRAVITY;
          for (const o of nodes) {
            if (o === n) continue;
            const dx = n.x - o.x, dy = n.y - o.y;
            const d2 = Math.max(dx * dx + dy * dy, 25);
            const d = Math.sqrt(d2);
            const f = REPULSION / d2;
            fx += (dx / d) * f;
            fy += (dy / d) * f;
          }
          n.vx = (n.vx + fx) * DAMP;
          n.vy = (n.vy + fy) * DAMP;
        }
        for (const e of edgesRef.current) {
          const s = nodes.find((n) => n.id === e.source);
          const t = nodes.find((n) => n.id === e.target);
          if (!s || !t || s.id === dragging || t.id === dragging) continue;
          const dx = t.x - s.x, dy = t.y - s.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = (d - SPRING_LEN) * SPRING_K;
          s.vx += (dx / d) * f; s.vy += (dy / d) * f;
          t.vx -= (dx / d) * f; t.vy -= (dy / d) * f;
        }
        const pad = 55;
        for (const n of nodes) {
          if (n.id === dragging) continue;
          n.x = Math.max(pad, Math.min(W - pad, n.x + n.vx));
          n.y = Math.max(pad, Math.min(H - pad, n.y + n.vy));
        }
        iterRef.current++;
      }

      // ── Clear + Background ─────────────────────────────────────────────────
      canvas.width = W; canvas.height = H;
      const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.8);
      bg.addColorStop(0, "#0e0823");
      bg.addColorStop(0.5, "#080518");
      bg.addColorStop(1, "#02020a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Subtle grid
      ctx.strokeStyle = "rgba(255,255,255,0.018)";
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let gx = 0; gx < W; gx += gridSize) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      for (let gy = 0; gy < H; gy += gridSize) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

      // Stars
      for (const s of STARS) {
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.o})`;
        ctx.fill();
      }

      // ── Edges ──────────────────────────────────────────────────────────────
      for (const e of edgesRef.current) {
        const s = nodes.find((n) => n.id === e.source);
        const t = nodes.find((n) => n.id === e.target);
        if (!s || !t) continue;
        const isHov = hov === e.source || hov === e.target;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        if (isHov) {
          const grad = ctx.createLinearGradient(s.x, s.y, t.x, t.y);
          grad.addColorStop(0, `${nodeColor(s.folder)}60`);
          grad.addColorStop(1, `${nodeColor(t.folder)}60`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = "rgba(148,163,184,0.07)";
          ctx.lineWidth = 0.8;
        }
        ctx.stroke();
      }

      // ── Nodes ──────────────────────────────────────────────────────────────
      for (const n of nodes) {
        const r = Math.max(6, Math.min(18, 7 + n.degree * 1.8));
        const color = nodeColor(n.folder);
        const isHov = n.id === hov;
        const isDrag = n.id === dragging;
        const pulse = isHov ? 1 + Math.sin(phase * 3) * 0.15 : 1;

        // Outer glow
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = isHov ? 28 : 14;

        const grad = ctx.createRadialGradient(n.x - r * 0.3, n.y - r * 0.3, 0, n.x, n.y, r * pulse);
        grad.addColorStop(0, `${color}ff`);
        grad.addColorStop(0.6, `${color}cc`);
        grad.addColorStop(1, `${color}66`);
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        // Inner highlight
        ctx.save();
        ctx.globalAlpha = 0.35;
        const hl = ctx.createRadialGradient(n.x - r * 0.35, n.y - r * 0.35, 0, n.x - r * 0.35, n.y - r * 0.35, r * 0.7);
        hl.addColorStop(0, "white");
        hl.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = hl;
        ctx.fill();
        ctx.restore();

        // Animated ring on hover
        if (isHov || isDrag) {
          const ringR = r * pulse + 5 + Math.sin(phase * 4) * 3;
          ctx.beginPath();
          ctx.arc(n.x, n.y, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `${color}50`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Label
        if (isHov || nodes.length <= 12) {
          ctx.font = isHov ? "bold 11px system-ui" : "10px system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          const label = n.title.length > 22 ? n.title.slice(0, 21) + "…" : n.title;
          // Text shadow
          ctx.shadowColor = "black";
          ctx.shadowBlur = 8;
          ctx.fillStyle = isHov ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)";
          ctx.fillText(label, n.x, n.y + r * pulse + 6);
          ctx.shadowBlur = 0;
        }
      }

      // ── Tooltip ────────────────────────────────────────────────────────────
      if (hov) {
        const n = nodes.find((nd) => nd.id === hov);
        if (n) {
          const TW = 190, TH = 64;
          const tx = Math.min(n.x + 18, W - TW - 8);
          const ty = Math.max(8, Math.min(n.y - TH / 2, H - TH - 8));

          ctx.save();
          ctx.shadowColor = "rgba(139,92,246,0.4)";
          ctx.shadowBlur = 16;
          roundRect(ctx, tx, ty, TW, TH, 10);
          ctx.fillStyle = "rgba(7,4,20,0.94)";
          ctx.strokeStyle = "rgba(139,92,246,0.45)";
          ctx.lineWidth = 1;
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          ctx.font = "bold 11px system-ui";
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.fillText(n.title.slice(0, 26), tx + 12, ty + 20);

          ctx.font = "10px system-ui";
          ctx.fillStyle = nodeColor(n.folder);
          ctx.fillText(n.folder, tx + 12, ty + 35);

          if (n.tags.length > 0) {
            ctx.fillStyle = "rgba(148,163,184,0.6)";
            ctx.fillText(n.tags.slice(0, 3).join("  "), tx + 12, ty + 52);
          }
        }
      }

      animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Hit testing ────────────────────────────────────────────────────────────
  const hitNode = useCallback((x: number, y: number): SimNode | null => {
    let closest: SimNode | null = null, minD = 28;
    for (const n of simRef.current) {
      const r = Math.max(6, Math.min(18, 7 + n.degree * 1.8));
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < r + 10 && d < minD) { minD = d; closest = n; }
    }
    return closest;
  }, []);

  const canvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = canvasPos(e);
    if (draggingRef.current) {
      wasDragRef.current = true;
      const n = simRef.current.find((nd) => nd.id === draggingRef.current);
      if (n) { n.x = x - dragOffRef.current.x; n.y = y - dragOffRef.current.y; n.vx = 0; n.vy = 0; }
    } else {
      const hit = hitNode(x, y);
      hoveredRef.current = hit?.id ?? null;
      setCursor(hit ? "pointer" : "default");
    }
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = canvasPos(e);
    const n = hitNode(x, y);
    if (n) {
      draggingRef.current = n.id;
      wasDragRef.current = false;
      dragOffRef.current = { x: x - n.x, y: y - n.y };
      iterRef.current = 0;
      setCursor("grabbing");
    }
  };

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const was = wasDragRef.current;
    draggingRef.current = null;
    setCursor("default");
    if (!was) {
      const { x, y } = canvasPos(e);
      const n = hitNode(x, y);
      if (n) onClickNode?.(n.id);
    }
  };

  // ── Empty / loading states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "#02020a" }}>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full mx-auto mb-3 animate-pulse"
            style={{ background: "radial-gradient(circle, rgba(124,58,237,0.5) 0%, transparent 70%)" }} />
          <p className="text-xs" style={{ color: "#475569" }}>Building graph…</p>
        </div>
      </div>
    );
  }

  if (rawNodes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5"
        style={{ background: "radial-gradient(ellipse at center, #0e0823 0%, #02020a 100%)" }}>
        {/* Decorative constellation */}
        <svg width="180" height="160" style={{ opacity: 0.7 }}>
          <defs>
            <radialGradient id="ng" cx="50%" cy="50%"><stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" /><stop offset="100%" stopColor="#7c3aed" stopOpacity="0" /></radialGradient>
          </defs>
          <circle cx="90" cy="80" r="70" fill="url(#ng)" />
          {/* Orbit rings */}
          <circle cx="90" cy="80" r="60" fill="none" stroke="rgba(124,58,237,0.15)" strokeWidth="1" strokeDasharray="3 6" />
          <circle cx="90" cy="80" r="40" fill="none" stroke="rgba(96,165,250,0.12)" strokeWidth="1" strokeDasharray="2 8" />
          {/* Floating nodes */}
          {[{x:90,y:20,c:"#60a5fa",r:5},{x:145,y:95,c:"#4ade80",r:4},{x:115,y:140,c:"#facc15",r:4.5},{x:45,y:130,c:"#f87171",r:3.5},{x:30,y:65,c:"#c084fc",r:4}].map((pt,i)=>(
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r={pt.r + 4} fill={pt.c} opacity="0.12" />
              <circle cx={pt.x} cy={pt.y} r={pt.r} fill={pt.c} opacity="0.85" />
            </g>
          ))}
          {/* Connection lines */}
          {[[90,20,145,95],[145,95,115,140],[115,140,45,130],[45,130,30,65],[30,65,90,20],[90,20,115,140]].map(([x1,y1,x2,y2],i)=>(
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
          ))}
          {/* Center node */}
          <circle cx="90" cy="80" r="7" fill="#7c3aed" opacity="0.9" />
          <circle cx="90" cy="80" r="14" fill="none" stroke="rgba(124,58,237,0.35)" strokeWidth="1.5" />
        </svg>
        <div className="text-center">
          <p className="text-sm font-medium mb-1" style={{ color: "#94a3b8" }}>Your knowledge graph is empty</p>
          <p className="text-xs" style={{ color: "#475569" }}>Add notes — connections appear automatically based on tags and folders</p>
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="flex-1 w-full h-full block"
      style={{ cursor }}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={() => { draggingRef.current = null; hoveredRef.current = null; setCursor("default"); }}
    />
  );
}
