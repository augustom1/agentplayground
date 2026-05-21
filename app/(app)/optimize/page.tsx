"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  TrendingDown,
  Cpu,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Play,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Zap,
  BarChart2,
} from "lucide-react";
import { useSession } from "next-auth/react";

/* ─── Types ─────────────────────────────────────────────────── */

interface TaskProtocol {
  id: string;
  name: string;
  description: string;
  taskPattern: string;
  localModel: string;
  systemPrompt: string;
  instructions: string;
  category: string;
  confidence: number;
  successCount: number;
  failureCount: number;
  active: boolean;
  estimatedSaving: number;
  createdAt: string;
  updatedAt: string;
}

interface OptimizationScan {
  id: string;
  weekStart: string;
  weekEnd: string;
  apiCallsTotal: number;
  localCallsTotal: number;
  creditsSpent: number;
  creditsSaved: number;
  protocolsCreated: number;
  report: string | null;
  recommendations: Array<{
    title: string;
    description: string;
    estimatedSaving: number;
    priority: "high" | "medium" | "low";
  }> | null;
  createdAt: string;
}

/* ─── Helpers ────────────────────────────────────────────────── */

function categoryColor(cat: string): string {
  const map: Record<string, string> = {
    classification: "#60a5fa",
    extraction: "#34d399",
    generation: "var(--color-brand)",
    summarization: "#f59e0b",
    routing: "#f472b6",
    formatting: "#fb923c",
    general: "var(--color-muted)",
  };
  return map[cat] ?? "var(--color-muted)";
}

function modelBadgeColor(model: string): string {
  if (model.includes("0.5b")) return "#34d399";
  if (model.includes("1.5b")) return "#60a5fa";
  if (model.includes("7b")) return "var(--color-brand)";
  return "var(--color-muted)";
}

function priorityColor(p: string): string {
  return p === "high" ? "#f87171" : p === "medium" ? "#f59e0b" : "#6ee7b7";
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(0);
}

/* ─── Stat Card ─────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ size: number }>;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      className="rounded-xl p-4 flex gap-3 items-start"
      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
    >
      <div
        className="rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ width: 36, height: 36, background: "var(--color-surface-3)", color: color ?? "var(--color-text)" }}
      >
        <Icon size={16} />
      </div>
      <div>
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>{label}</p>
        <p className="text-lg font-semibold" style={{ color: color ?? "var(--color-text)" }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Protocol Row ───────────────────────────────────────────── */

function ProtocolRow({
  protocol,
  onToggle,
}: {
  protocol: TaskProtocol;
  onToggle: (id: string, active: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span style={{ color: "var(--color-muted)", flexShrink: 0 }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>

        {/* Name + category */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              {protocol.name}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-md font-mono"
              style={{
                background: "var(--color-surface-3)",
                color: categoryColor(protocol.category),
                border: `1px solid ${categoryColor(protocol.category)}40`,
              }}
            >
              {protocol.category}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-md font-mono"
              style={{
                background: "var(--color-surface-3)",
                color: modelBadgeColor(protocol.localModel),
              }}
            >
              {protocol.localModel}
            </span>
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-muted)" }}>
            {protocol.description}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs shrink-0" style={{ color: "var(--color-muted)" }}>
          <span title="Confidence">{pct(protocol.confidence)} confidence</span>
          <span title="Uses">
            <CheckCircle size={11} className="inline mr-0.5" style={{ color: "#34d399" }} />
            {protocol.successCount}
          </span>
          <span title="Est. credits saved per use" style={{ color: "#f59e0b" }}>
            ~{fmt(protocol.estimatedSaving)} cr/use
          </span>
        </div>

        {/* Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(protocol.id, !protocol.active);
          }}
          className="shrink-0"
          title={protocol.active ? "Disable protocol" : "Enable protocol"}
        >
          {protocol.active ? (
            <ToggleRight size={20} style={{ color: "#34d399" }} />
          ) : (
            <ToggleLeft size={20} style={{ color: "var(--color-muted)" }} />
          )}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="px-4 pb-4 pt-0 text-xs space-y-3"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <div className="mt-3">
            <p className="font-medium mb-1" style={{ color: "var(--color-muted)" }}>Match Pattern</p>
            <code
              className="block px-2 py-1.5 rounded-md font-mono text-xs"
              style={{ background: "var(--color-surface-3)", color: "var(--color-brand)", wordBreak: "break-all" }}
            >
              {protocol.taskPattern}
            </code>
          </div>
          <div>
            <p className="font-medium mb-1" style={{ color: "var(--color-muted)" }}>System Prompt for Local Model</p>
            <pre
              className="px-2 py-1.5 rounded-md whitespace-pre-wrap"
              style={{ background: "var(--color-surface-3)", color: "var(--color-text)", fontSize: 11 }}
            >
              {protocol.systemPrompt}
            </pre>
          </div>
          <div>
            <p className="font-medium mb-1" style={{ color: "var(--color-muted)" }}>Instructions</p>
            <pre
              className="px-2 py-1.5 rounded-md whitespace-pre-wrap"
              style={{ background: "var(--color-surface-3)", color: "var(--color-text)", fontSize: 11 }}
            >
              {protocol.instructions}
            </pre>
          </div>
          <p style={{ color: "var(--color-muted)" }}>
            Created {new Date(protocol.createdAt).toLocaleDateString()} · Last updated{" "}
            {new Date(protocol.updatedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */

export default function OptimizePage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  const [protocols, setProtocols] = useState<TaskProtocol[]>([]);
  const [scans, setScans] = useState<OptimizationScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeScan, setActiveScan] = useState<OptimizationScan | null>(null);
  const [filterCat, setFilterCat] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/optimize/protocols");
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as { protocols: TaskProtocol[]; scans: OptimizationScan[] };
      setProtocols(data.protocols);
      setScans(data.scans);
      if (data.scans.length > 0) setActiveScan(data.scans[0]);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id: string, active: boolean) => {
    setProtocols((prev) => prev.map((p) => (p.id === id ? { ...p, active } : p)));
    await fetch("/api/optimize/protocols", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/optimize/scan", { method: "POST" });
      if (!res.ok) throw new Error("Scan failed");
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setScanning(false);
    }
  };

  /* Aggregated stats */
  const totalSaved = protocols.reduce((sum, p) => sum + p.estimatedSaving * p.successCount, 0);
  const activeCount = protocols.filter((p) => p.active).length;
  const latestScan = scans[0];
  const localPct =
    latestScan && latestScan.apiCallsTotal + latestScan.localCallsTotal > 0
      ? Math.round(
          (latestScan.localCallsTotal /
            (latestScan.apiCallsTotal + latestScan.localCallsTotal)) *
            100
        )
      : 0;

  const categories = ["all", ...Array.from(new Set(protocols.map((p) => p.category)))];
  const filtered = filterCat === "all" ? protocols : protocols.filter((p) => p.category === filterCat);

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
            <Sparkles size={20} style={{ color: "var(--color-brand)" }} />
            Self-Optimization
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-muted)" }}>
            Automatically learns which tasks can run on free local models instead of paid API calls.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              opacity: scanning ? 0.6 : 1,
              cursor: scanning ? "not-allowed" : "pointer",
            }}
          >
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {scanning ? "Running scan…" : "Run scan now"}
          </button>
        )}
      </div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-2 text-sm"
          style={{ background: "#f8717120", border: "1px solid #f8717140", color: "#f87171" }}
        >
          <AlertCircle size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">dismiss</button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Sparkles}
          label="Active Protocols"
          value={`${activeCount} / ${protocols.length}`}
          sub="learned task patterns"
          color="var(--color-brand)"
        />
        <StatCard
          icon={TrendingDown}
          label="Credits Saved (all time)"
          value={`~${fmt(totalSaved)}`}
          sub="by routing to local models"
          color="#34d399"
        />
        <StatCard
          icon={Cpu}
          label="Local Usage (last scan)"
          value={`${localPct}%`}
          sub={latestScan ? `${latestScan.localCallsTotal} Ollama / ${latestScan.apiCallsTotal} API` : "no scan yet"}
          color="#60a5fa"
        />
        <StatCard
          icon={BarChart2}
          label="Last Scan"
          value={latestScan ? `${fmt(latestScan.creditsSpent)} cr spent` : "No scan yet"}
          sub={latestScan ? new Date(latestScan.createdAt).toLocaleDateString() : "Run a scan to start"}
          color="#f59e0b"
        />
      </div>

      {/* How it works */}
      <div
        className="rounded-xl p-4 text-sm"
        style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
      >
        <p className="font-medium mb-2" style={{ color: "var(--color-text)" }}>How the optimizer works</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs" style={{ color: "var(--color-muted)" }}>
          <div className="flex gap-2">
            <span style={{ color: "#60a5fa" }}>①</span>
            <span><strong style={{ color: "var(--color-text)" }}>After every Claude call</strong> — a local Ollama model (free) evaluates whether the task pattern could be done by a mini model next time.</span>
          </div>
          <div className="flex gap-2">
            <span style={{ color: "var(--color-brand)" }}>②</span>
            <span><strong style={{ color: "var(--color-text)" }}>Protocol written</strong> — if confidence ≥70%, a protocol is saved with the system prompt, instructions, and regex pattern to match future similar tasks.</span>
          </div>
          <div className="flex gap-2">
            <span style={{ color: "#34d399" }}>③</span>
            <span><strong style={{ color: "var(--color-text)" }}>Weekly scan</strong> — every Sunday, a full usage analysis identifies more optimization opportunities and updates the protocol library.</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Protocol library */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Protocol Library
            </h2>
            <div className="flex gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
                  className="px-2 py-1 rounded-md text-xs transition-colors"
                  style={{
                    background: filterCat === cat ? "var(--color-surface-3)" : "transparent",
                    color: filterCat === cat ? "var(--color-text)" : "var(--color-muted)",
                    border: filterCat === cat ? "1px solid var(--color-border)" : "1px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--color-muted)" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="rounded-xl p-8 text-center"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
            >
              <Sparkles size={28} className="mx-auto mb-3" style={{ color: "var(--color-muted)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                No protocols yet
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                Protocols are auto-generated after each Claude API call.
                <br />Start chatting and they&apos;ll appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((p) => (
                <ProtocolRow key={p.id} protocol={p} onToggle={handleToggle} />
              ))}
            </div>
          )}
        </div>

        {/* Right: Scan history + latest report */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Weekly Scan Reports
          </h2>

          {scans.length === 0 ? (
            <div
              className="rounded-xl p-6 text-center text-sm"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-muted)" }}
            >
              No scans yet. {isAdmin && "Click \"Run scan now\" to generate the first report."}
            </div>
          ) : (
            <>
              {/* Scan selector */}
              <div className="flex flex-col gap-1">
                {scans.map((scan) => (
                  <button
                    key={scan.id}
                    onClick={() => setActiveScan(scan)}
                    className="text-left px-3 py-2 rounded-lg text-xs transition-colors"
                    style={{
                      background: activeScan?.id === scan.id ? "var(--color-surface-3)" : "var(--color-surface-2)",
                      border: `1px solid ${activeScan?.id === scan.id ? "var(--color-border)" : "transparent"}`,
                      color: "var(--color-text)",
                      cursor: "pointer",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span>{new Date(scan.weekStart).toLocaleDateString()} → {new Date(scan.weekEnd).toLocaleDateString()}</span>
                      <span style={{ color: "#34d399" }}>−{fmt(scan.creditsSaved)} cr saved</span>
                    </div>
                    <div className="flex gap-3 mt-0.5" style={{ color: "var(--color-muted)" }}>
                      <span>{scan.apiCallsTotal} API · {scan.localCallsTotal} local</span>
                      <span>{scan.protocolsCreated} new protocols</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Active scan report */}
              {activeScan && (
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                >
                  {activeScan.report && (
                    <div className="text-xs" style={{ color: "var(--color-text)" }}>
                      <pre className="whitespace-pre-wrap font-sans leading-relaxed" style={{ fontSize: 11 }}>
                        {activeScan.report}
                      </pre>
                    </div>
                  )}

                  {activeScan.recommendations && activeScan.recommendations.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-2" style={{ color: "var(--color-muted)" }}>
                        Recommendations
                      </p>
                      <div className="space-y-2">
                        {activeScan.recommendations.map((rec, i) => (
                          <div
                            key={i}
                            className="rounded-lg px-3 py-2 text-xs"
                            style={{ background: "var(--color-surface-3)", border: "1px solid var(--color-border)" }}
                          >
                            <div className="flex items-center gap-2 mb-0.5">
                              <span
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{ background: `${priorityColor(rec.priority)}20`, color: priorityColor(rec.priority) }}
                              >
                                {rec.priority}
                              </span>
                              <span className="font-medium" style={{ color: "var(--color-text)" }}>{rec.title}</span>
                            </div>
                            <p style={{ color: "var(--color-muted)" }}>{rec.description}</p>
                            <p className="mt-1" style={{ color: "#f59e0b" }}>Est. save: ~{fmt(rec.estimatedSaving)} cr/week</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Refresh */}
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "var(--color-muted)", background: "none", border: "none", cursor: "pointer" }}
          >
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
