"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface GraphNode { id: string; title: string; tags: string[]; folder: string }
export interface GraphEdge { source: string; target: string; label?: string }

interface SimNode extends GraphNode { x: number; y: number; vx: number; vy: number; degree: number }

const FOLDER_COLORS: Record<string, string> = {
  Personal:  "#60a5fa",
  Business:  "#4ade80",
  Education: "#f59e0b",
  Resources: "#f87171",
  inbox:     "#a78bfa",
  plans:     "#38bdf8",
  Teams:     "#34d399",
  Projects:  "#fb923c",
};
const nodeColor = (f: string) => FOLDER_COLORS[f] || "#64748b";

// Square node size based on degree
const nodeSize = (degree: number) => Math.max(7, Math.min(16, 8 + degree * 1.6));

export default function KnowledgeGraph({
  nodes: rawNodes,
  edges: rawEdges,
  onClickNode,
  loading,
  className,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onClickNode?: (id: string) => void;
  loading?: boolean;
  className?: string;
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
  // Pan + zoom state
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const [cursor, setCursor] = useState("default");

  // Measure container
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

  // Init simulation from props
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
      const dist = Math.random() * Math.min(W, H) * 0.28;
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
    panRef.current = { x: 0, y: 0 };
    zoomRef.current = 1;
  }, [rawNodes, rawEdges]);

  // Render + physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const MAX_ITER = 500;
    const REPULSION = 3500;
    const SPRING_K = 0.018;
    const SPRING_LEN = 120;
    const GRAVITY = 0.004;
    const DAMP = 0.75;

    function drawSquare(x: number, y: number, s: number, r = 2) {
      const half = s / 2;
      ctx.beginPath();
      ctx.moveTo(x - half + r, y - half);
      ctx.lineTo(x + half - r, y - half);
      ctx.arcTo(x + half, y - half, x + half, y - half + r, r);
      ctx.lineTo(x + half, y + half - r);
      ctx.arcTo(x + half, y + half, x + half - r, y + half, r);
      ctx.lineTo(x - half + r, y + half);
      ctx.arcTo(x - half, y + half, x - half, y + half - r, r);
      ctx.lineTo(x - half, y - half + r);
      ctx.arcTo(x - half, y - half, x - half + r, y - half, r);
      ctx.closePath();
    }

    function frame() {
      const { w: W, h: H } = sizeRef.current;
      const nodes = simRef.current;
      const dragging = draggingRef.current;
      const hov = hoveredRef.current;

      // Physics
      if (iterRef.current < MAX_ITER) {
        for (const n of nodes) {
          if (n.id === dragging) continue;
          let fx = (W / 2 - n.x) * GRAVITY;
          let fy = (H / 2 - n.y) * GRAVITY;
          for (const o of nodes) {
            if (o === n) continue;
            const dx = n.x - o.x, dy = n.y - o.y;
            const d2 = Math.max(dx * dx + dy * dy, 16);
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
        const pad = 45;
        for (const n of nodes) {
          if (n.id === dragging) continue;
          n.x = Math.max(pad, Math.min(W - pad, n.x + n.vx));
          n.y = Math.max(pad, Math.min(H - pad, n.y + n.vy));
        }
        iterRef.current++;
      }

      // Clear — minimal dark background
      canvas.width = W; canvas.height = H;
      ctx.fillStyle = "#0c0c0f";
      ctx.fillRect(0, 0, W, H);

      // Very subtle dot grid
      ctx.fillStyle = "rgba(255,255,255,0.025)";
      const gridSz = 28;
      for (let gx = gridSz; gx < W; gx += gridSz) {
        for (let gy = gridSz; gy < H; gy += gridSz) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Apply pan + zoom transform
      ctx.save();
      ctx.translate(panRef.current.x, panRef.current.y);
      ctx.scale(zoomRef.current, zoomRef.current);

      // Edges
      for (const e of edgesRef.current) {
        const s = nodes.find((n) => n.id === e.source);
        const t = nodes.find((n) => n.id === e.target);
        if (!s || !t) continue;
        const isHov = hov === e.source || hov === e.target;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = isHov
          ? `rgba(255,255,255,0.35)`
          : "rgba(255,255,255,0.08)";
        ctx.lineWidth = isHov ? 1 : 0.6;
        ctx.stroke();
      }

      // Nodes
      for (const n of nodes) {
        const sz = nodeSize(n.degree);
        const color = nodeColor(n.folder);
        const isHov = n.id === hov;
        const isDrag = n.id === dragging;
        const active = isHov || isDrag;

        if (active) {
          // Soft glow (square outline)
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
          ctx.strokeStyle = `${color}60`;
          ctx.lineWidth = 1;
          drawSquare(n.x, n.y, sz + 8, 3);
          ctx.stroke();
          ctx.restore();
        }

        // Square fill
        drawSquare(n.x, n.y, sz, 2);
        ctx.fillStyle = active ? color : `${color}cc`;
        ctx.fill();

        // Subtle border
        ctx.strokeStyle = active ? `${color}` : `${color}66`;
        ctx.lineWidth = active ? 1.2 : 0.6;
        ctx.stroke();

        // Label
        const showLabel = active || nodes.length <= 8 || n.degree >= 3;
        if (showLabel) {
          const label = n.title.length > 20 ? n.title.slice(0, 19) + "…" : n.title;
          ctx.font = active ? "bold 10px -apple-system,system-ui,sans-serif" : "9.5px -apple-system,system-ui,sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)";
          ctx.fillText(label, n.x, n.y + sz / 2 + 4);
        }

        // Hover: folder color dot + tag list
        if (isHov) {
          const TW = 170, TH = n.tags.length > 0 ? 54 : 38;
          const tx = Math.min(n.x + sz + 10, W / zoomRef.current - TW - 8);
          const ty = Math.max(8, Math.min(n.y - TH / 2, H / zoomRef.current - TH - 8));
          ctx.save();
          ctx.fillStyle = "rgba(10,10,15,0.92)";
          ctx.strokeStyle = `${color}40`;
          ctx.lineWidth = 1;
          const r2 = 8;
          ctx.beginPath();
          ctx.moveTo(tx + r2, ty); ctx.lineTo(tx + TW - r2, ty);
          ctx.arcTo(tx + TW, ty, tx + TW, ty + r2, r2);
          ctx.lineTo(tx + TW, ty + TH - r2);
          ctx.arcTo(tx + TW, ty + TH, tx + TW - r2, ty + TH, r2);
          ctx.lineTo(tx + r2, ty + TH);
          ctx.arcTo(tx, ty + TH, tx, ty + TH - r2, r2);
          ctx.lineTo(tx, ty + r2);
          ctx.arcTo(tx, ty, tx + r2, ty, r2);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.restore();

          ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
          ctx.font = "bold 10px -apple-system,system-ui,sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.fillText(n.title.slice(0, 22), tx + 10, ty + 17);

          ctx.font = "9px -apple-system,system-ui,sans-serif";
          ctx.fillStyle = color;
          ctx.fillText(n.folder, tx + 10, ty + 30);

          if (n.tags.length > 0) {
            ctx.fillStyle = "rgba(148,163,184,0.55)";
            ctx.fillText(n.tags.slice(0, 3).map(t => `#${t}`).join(" "), tx + 10, ty + 46);
          }
        }
      }

      ctx.restore();

      animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Convert screen coords to sim coords (accounting for pan/zoom)
  const toSimCoords = useCallback((sx: number, sy: number) => {
    return {
      x: (sx - panRef.current.x) / zoomRef.current,
      y: (sy - panRef.current.y) / zoomRef.current,
    };
  }, []);

  // Hit testing
  const hitNode = useCallback((sx: number, sy: number): SimNode | null => {
    const { x, y } = toSimCoords(sx, sy);
    let closest: SimNode | null = null, minD = 30;
    for (const n of simRef.current) {
      const sz = nodeSize(n.degree);
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < sz + 8 && d < minD) { minD = d; closest = n; }
    }
    return closest;
  }, [toSimCoords]);

  const canvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = canvasPos(e);
    if (draggingRef.current) {
      wasDragRef.current = true;
      const { x: sx, y: sy } = toSimCoords(x, y);
      const n = simRef.current.find((nd) => nd.id === draggingRef.current);
      if (n) { n.x = sx - dragOffRef.current.x; n.y = sy - dragOffRef.current.y; n.vx = 0; n.vy = 0; }
    } else if (isPanningRef.current) {
      panRef.current = {
        x: panRef.current.x + (x - panStartRef.current.x),
        y: panRef.current.y + (y - panStartRef.current.y),
      };
      panStartRef.current = { x, y };
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
      const sim = toSimCoords(x, y);
      dragOffRef.current = { x: sim.x - n.x, y: sim.y - n.y };
      iterRef.current = 0;
      setCursor("grabbing");
    } else {
      isPanningRef.current = true;
      panStartRef.current = { x, y };
      setCursor("grabbing");
    }
  };

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isPanningRef.current = false;
    const was = wasDragRef.current;
    draggingRef.current = null;
    setCursor("default");
    if (!was) {
      const { x, y } = canvasPos(e);
      const n = hitNode(x, y);
      if (n) onClickNode?.(n.id);
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x, y } = canvasPos(e);
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(4, zoomRef.current * delta));
    // Zoom toward mouse position
    panRef.current = {
      x: x - (x - panRef.current.x) * (newZoom / zoomRef.current),
      y: y - (y - panRef.current.y) * (newZoom / zoomRef.current),
    };
    zoomRef.current = newZoom;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className ?? "flex-1"}`} style={{ background: "#0c0c0f" }}>
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-sm mx-auto animate-pulse" style={{ background: "#4ade8040" }} />
          <p className="text-[10px]" style={{ color: "#334155" }}>Loading graph…</p>
        </div>
      </div>
    );
  }

  if (rawNodes.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className ?? "flex-1"}`} style={{ background: "#0c0c0f" }}>
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ opacity: 0.35 }}>
          {[[20,20],[60,20],[20,60],[60,60],[40,40]].map(([x,y],i) => (
            <rect key={i} x={x-4} y={y-4} width={8} height={8} rx={1.5}
              fill={["#60a5fa","#4ade80","#a78bfa","#f87171","#f59e0b"][i]} />
          ))}
          {[[20,20,60,20],[60,20,60,60],[20,60,60,60],[20,20,40,40],[60,60,40,40]].map(([x1,y1,x2,y2],i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} />
          ))}
        </svg>
        <p className="text-[11px]" style={{ color: "#334155" }}>No connections yet</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full ${className ?? ""}`}
      style={{ cursor }}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={() => {
        draggingRef.current = null;
        isPanningRef.current = false;
        hoveredRef.current = null;
        setCursor("default");
      }}
      onWheel={onWheel}
    />
  );
}
