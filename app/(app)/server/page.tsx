"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, Server, Cpu, HardDrive, MemoryStick, RotateCcw,
  CircleCheck, CircleDot, CircleX, Download, ChevronRight, Loader2,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useLanguage } from "@/components/LanguageProvider";

type ContainerInfo = {
  name: string;
  status: "healthy" | "running" | "exited" | "unknown";
  image: string;
  runningFor: string;
  rawStatus: string;
};

type OllamaModel = { name: string; size: string };
type MemoryInfo = { total: number; used: number; free: number; usedPct: number };
type DiskInfo = { total: string; used: string; free: string; usedPct: string };

type Stats = {
  containers: ContainerInfo[];
  ollamaModels: OllamaModel[];
  memory: MemoryInfo | null;
  disk: DiskInfo | null;
  ts: string;
};

const STATUS_ICON = {
  healthy: <CircleCheck size={13} style={{ color: "var(--color-green)", flexShrink: 0 }} />,
  running: <CircleDot size={13} style={{ color: "var(--color-yellow)", flexShrink: 0 }} />,
  exited: <CircleX size={13} style={{ color: "var(--color-red)", flexShrink: 0 }} />,
  unknown: <CircleDot size={13} style={{ color: "var(--color-muted)", flexShrink: 0 }} />,
};

const KNOWN_MODELS = ["qwen2.5:3b", "qwen2.5:7b", "qwen2.5:14b", "llama3.2:3b", "nomic-embed-text"];

export default function ServerPage() {
  const { addToast } = useToast();
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pullModel, setPullModel] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/server/stats");
      if (res.ok) setStats(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  async function doAction(action: string, target: string, label: string) {
    setActionLoading(target + action);
    try {
      const res = await fetch("/api/server/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, target }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message || "Done", "success");
        setTimeout(fetchStats, 3000);
      } else {
        addToast(data.error || "Failed", "error");
      }
    } catch {
      addToast("Request failed", "error");
    } finally {
      setActionLoading(null);
    }
  }

  const lastUpdated = stats?.ts ? new Date(stats.ts).toLocaleTimeString() : "—";

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            {t("serverControl")}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            {t("serverDesc")} · Updated {lastUpdated}
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="btn-ghost flex items-center gap-2 px-3 py-2"
          style={{ fontSize: "13px" }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* System Resources */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          {stats.memory && (
            <div className="glass-card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <MemoryStick size={14} style={{ color: "var(--color-muted)" }} />
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                  Memory
                </span>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: "var(--color-text)" }}>{stats.memory.used} MB used</span>
                  <span style={{ color: "var(--color-muted)" }}>{stats.memory.total} MB total</span>
                </div>
                <div style={{ height: "6px", background: "var(--color-surface-3)", borderRadius: "3px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${stats.memory.usedPct}%`,
                      background: stats.memory.usedPct > 85 ? "var(--color-red)" : stats.memory.usedPct > 65 ? "var(--color-yellow)" : "var(--color-green)",
                      borderRadius: "3px",
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
                <p className="text-[11px] mt-1" style={{ color: "var(--color-muted)" }}>
                  {stats.memory.usedPct}% used · {stats.memory.free} MB free
                </p>
              </div>
            </div>
          )}

          {stats.disk && (
            <div className="glass-card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <HardDrive size={14} style={{ color: "var(--color-muted)" }} />
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                  Disk (/)
                </span>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: "var(--color-text)" }}>{stats.disk.used} used</span>
                  <span style={{ color: "var(--color-muted)" }}>{stats.disk.total} total</span>
                </div>
                <div style={{ height: "6px", background: "var(--color-surface-3)", borderRadius: "3px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: stats.disk.usedPct,
                      background: parseInt(stats.disk.usedPct) > 85 ? "var(--color-red)" : parseInt(stats.disk.usedPct) > 65 ? "var(--color-yellow)" : "var(--color-green)",
                      borderRadius: "3px",
                    }}
                  />
                </div>
                <p className="text-[11px] mt-1" style={{ color: "var(--color-muted)" }}>
                  {stats.disk.usedPct} used · {stats.disk.free} free
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Containers */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div className="flex items-center gap-2">
            <Server size={14} style={{ color: "var(--color-muted)" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
              Containers
            </span>
          </div>
          {stats && (
            <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
              {stats.containers.filter((c) => c.status !== "exited").length}/{stats.containers.length} running
            </span>
          )}
        </div>

        {loading && !stats ? (
          <div className="flex flex-col gap-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse" style={{ height: "44px", borderRadius: "8px", background: "var(--color-surface-3)" }} />
            ))}
          </div>
        ) : (
          <div>
            {(stats?.containers ?? []).map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {STATUS_ICON[c.status]}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
                      {c.name}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: "var(--color-muted)" }}>
                      {c.rawStatus}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => doAction("restart", c.name, c.name)}
                  disabled={actionLoading === c.name + "restart"}
                  className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 shrink-0 ml-3"
                  style={{ fontSize: "12px" }}
                  title="Restart container"
                >
                  {actionLoading === c.name + "restart" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RotateCcw size={12} />
                  )}
                  Restart
                </button>
              </div>
            ))}
            {(stats?.containers ?? []).length === 0 && (
              <p className="px-4 py-6 text-center text-sm" style={{ color: "var(--color-muted)" }}>
                No containers found — is Docker accessible?
              </p>
            )}
          </div>
        )}
      </div>

      {/* Ollama Models */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div className="flex items-center gap-2">
            <Cpu size={14} style={{ color: "var(--color-muted)" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
              Ollama Models
            </span>
          </div>
        </div>

        <div>
          {(stats?.ollamaModels ?? []).map((m) => (
            <div
              key={m.name}
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <div className="flex items-center gap-3">
                <CircleCheck size={13} style={{ color: "var(--color-green)" }} />
                <p className="text-sm font-mono" style={{ color: "var(--color-text)" }}>{m.name}</p>
              </div>
              <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>{m.size}</span>
            </div>
          ))}

          {/* Pull new model */}
          <div className="p-4">
            <p className="text-xs mb-3 font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Pull a model
            </p>
            <div className="flex gap-2">
              <div className="flex gap-1.5 flex-wrap flex-1">
                {KNOWN_MODELS.filter((m) => !stats?.ollamaModels.some((om) => om.name === m)).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPullModel(m)}
                    className="btn-ghost px-2.5 py-1"
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      background: pullModel === m ? "var(--color-surface-3)" : undefined,
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            {pullModel && (
              <div className="flex gap-2 mt-3">
                <input
                  value={pullModel}
                  onChange={(e) => setPullModel(e.target.value)}
                  placeholder="model:tag"
                  className="glass-input px-3 py-2 text-sm flex-1"
                  style={{ fontFamily: "var(--font-mono)" }}
                />
                <button
                  onClick={() => { doAction("pull-model", pullModel, pullModel); setPullModel(""); }}
                  disabled={!pullModel.trim() || actionLoading === pullModel + "pull-model"}
                  className="btn-primary flex items-center gap-2 px-4 py-2"
                  style={{ fontSize: "13px" }}
                >
                  {actionLoading === pullModel + "pull-model" ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}
                  Pull
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
