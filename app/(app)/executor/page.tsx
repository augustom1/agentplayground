"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Cpu, Play, FileText, CheckCircle2, Clock, AlertCircle,
  RefreshCw, ChevronRight, Loader2, Brain, ArrowRight,
} from "lucide-react";

interface QueueItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  teamId: string;
  teamName: string;
  hasPlan: boolean;
  planPath: string;
  createdAt: string;
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_COLOR: Record<string, string> = {
  urgent: "var(--color-red)",
  high: "#f97316",
  medium: "var(--color-yellow)",
  low: "var(--color-muted)",
};
const STATUS_ICON = {
  pending: <Clock size={13} />,
  running: <Loader2 size={13} className="animate-spin" />,
  completed: <CheckCircle2 size={13} />,
  failed: <AlertCircle size={13} />,
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ExecutorPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [planning, setPlanningId] = useState<string | null>(null);
  const [planningAll, setPlanningAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/executor/queue");
      const d = await r.json();
      setQueue((d.queue || []).sort((a: QueueItem, b: QueueItem) =>
        (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
      ));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function generatePlan(item: QueueItem) {
    setPlanningId(item.id);
    setPlan(null);
    try {
      const r = await fetch("/api/executor/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: item.id }),
      });
      const d = await r.json();
      if (d.planContent) {
        setPlan(d.planContent);
        setSelected({ ...item, hasPlan: true });
        await load();
      }
    } finally {
      setPlanningId(null);
    }
  }

  async function generateAllPlans() {
    setPlanningAll(true);
    const unplanned = queue.filter((q) => !q.hasPlan);
    for (const item of unplanned) {
      setPlanningId(item.id);
      await fetch("/api/executor/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: item.id }),
      }).catch(() => {});
    }
    setPlanningId(null);
    setPlanningAll(false);
    await load();
  }

  async function viewPlan(item: QueueItem) {
    setSelected(item);
    setPlan(null);
    const r = await fetch(`/api/brain/note?path=${encodeURIComponent(item.planPath)}`);
    if (r.ok) {
      const d = await r.json();
      setPlan(d.content);
    }
  }

  const unplanned = queue.filter((q) => !q.hasPlan);
  const planned = queue.filter((q) => q.hasPlan);

  return (
    <div className="flex h-full">
      {/* Left: Queue */}
      <div className="flex flex-col shrink-0" style={{ width: 320, borderRight: "1px solid var(--color-border)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div className="flex items-center gap-2">
            <Cpu size={15} style={{ color: "var(--color-brand)" }} />
            <h1 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Task Executor</h1>
          </div>
          <div className="flex items-center gap-1.5">
            {unplanned.length > 0 && !planningAll && (
              <button
                onClick={generateAllPlans}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-medium hover:opacity-80"
                style={{ background: "var(--color-brand-dim)", color: "var(--color-brand)" }}
              >
                <Play size={10} /> Plan all ({unplanned.length})
              </button>
            )}
            {planningAll && <Loader2 size={13} className="animate-spin" style={{ color: "var(--color-brand)" }} />}
            <button onClick={load} className="p-1.5 rounded hover:opacity-70">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} style={{ color: "var(--color-muted)" }} />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 divide-x px-0 py-2" style={{ borderBottom: "1px solid var(--color-border)", borderColor: "var(--color-border)" }}>
          {[
            { label: "Total", value: queue.length, color: "var(--color-text)" },
            { label: "Planned", value: planned.length, color: "var(--color-green)" },
            { label: "Pending", value: unplanned.length, color: "var(--color-yellow)" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center py-1">
              <span className="text-base font-bold" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={18} className="animate-spin" style={{ color: "var(--color-muted)" }} />
            </div>
          ) : queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 px-4 text-center">
              <CheckCircle2 size={28} style={{ color: "var(--color-border)" }} />
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>No pending tasks</p>
              <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>Create tasks in Agent Lab or via chat</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
              {queue.map((item) => (
                <button
                  key={item.id}
                  onClick={() => item.hasPlan ? viewPlan(item) : setSelected(item)}
                  className="w-full text-left px-4 py-2.5 flex items-start gap-3 hover:opacity-80 transition-opacity"
                  style={{ background: selected?.id === item.id ? "var(--color-brand-dim)" : undefined }}
                >
                  <div className="mt-0.5 shrink-0" style={{ color: item.hasPlan ? "var(--color-green)" : "var(--color-muted)" }}>
                    {planning === item.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : item.hasPlan
                        ? <FileText size={13} />
                        : STATUS_ICON[item.status as keyof typeof STATUS_ICON] ?? <Clock size={13} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-text)" }}>{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px]" style={{ color: PRIORITY_COLOR[item.priority] ?? "var(--color-muted)" }}>
                        {item.priority}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>·</span>
                      <span className="text-[10px] truncate" style={{ color: "var(--color-muted)" }}>{item.teamName}</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[9px]" style={{ color: "var(--color-border)" }}>{timeAgo(item.createdAt)}</span>
                    {item.hasPlan && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(74,222,128,0.1)", color: "var(--color-green)" }}>
                        planned
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Detail / Plan */}
      <div className="flex flex-col flex-1 min-w-0">
        {!selected ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4">
            <Brain size={36} style={{ color: "var(--color-border)" }} />
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: "var(--color-muted)" }}>Select a task to view or generate its plan</p>
              <p className="text-[11px] mt-1" style={{ color: "var(--color-border)" }}>
                Plans are saved to the Brain and read by agents at execution time
              </p>
            </div>
            {unplanned.length > 0 && (
              <button
                onClick={generateAllPlans}
                disabled={planningAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50"
                style={{ background: "var(--color-accent)", color: "#000" }}
              >
                {planningAll ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                Auto-plan {unplanned.length} pending task{unplanned.length > 1 ? "s" : ""}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Detail header */}
            <div className="flex items-center justify-between px-5 py-3.5 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>{selected.title}</h2>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[11px]" style={{ color: PRIORITY_COLOR[selected.priority] }}>
                    {selected.priority}
                  </span>
                  <ArrowRight size={10} style={{ color: "var(--color-border)" }} />
                  <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>{selected.teamName}</span>
                  {selected.hasPlan && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-1" style={{ background: "rgba(74,222,128,0.1)", color: "var(--color-green)" }}>
                      plan ready
                    </span>
                  )}
                </div>
              </div>
              {!selected.hasPlan ? (
                <button
                  onClick={() => generatePlan(selected)}
                  disabled={planning === selected.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-80 disabled:opacity-50 shrink-0 ml-3"
                  style={{ background: "var(--color-accent)", color: "#000" }}
                >
                  {planning === selected.id
                    ? <><Loader2 size={11} className="animate-spin" /> Planning…</>
                    : <><Play size={11} /> Generate Plan</>}
                </button>
              ) : (
                <button
                  onClick={() => generatePlan(selected)}
                  disabled={planning === selected.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] hover:opacity-80 disabled:opacity-50 shrink-0 ml-3"
                  style={{ color: "var(--color-muted)", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  {planning === selected.id ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                  Regenerate
                </button>
              )}
            </div>

            {/* Description */}
            {selected.description && (
              <div className="px-5 py-3 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--color-muted)" }}>{selected.description}</p>
              </div>
            )}

            {/* Plan viewer */}
            <div className="flex-1 min-h-0 overflow-auto p-5">
              {plan ? (
                <pre className="text-[12px] leading-relaxed whitespace-pre-wrap font-mono"
                  style={{ color: "var(--color-text)" }}>
                  {plan}
                </pre>
              ) : planning === selected.id ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <Loader2 size={16} className="animate-spin" style={{ color: "var(--color-brand)" }} />
                  <p className="text-sm" style={{ color: "var(--color-muted)" }}>Generating execution plan…</p>
                </div>
              ) : selected.hasPlan ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <Loader2 size={16} className="animate-spin" style={{ color: "var(--color-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--color-muted)" }}>Loading plan…</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <FileText size={24} style={{ color: "var(--color-border)" }} />
                  <p className="text-sm text-center" style={{ color: "var(--color-muted)" }}>
                    No plan yet. Click <strong style={{ color: "var(--color-text)" }}>Generate Plan</strong> to create one using Claude.
                  </p>
                  <p className="text-[11px] text-center" style={{ color: "var(--color-border)" }}>
                    The plan will be saved to the Brain at <code>{selected.planPath}</code>
                  </p>
                </div>
              )}
            </div>

            {/* Brain path footer */}
            {selected.hasPlan && (
              <div className="flex items-center gap-2 px-5 py-2.5 shrink-0" style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
                <Brain size={11} style={{ color: "var(--color-brand)" }} />
                <span className="text-[10px] font-mono" style={{ color: "var(--color-muted)" }}>{selected.planPath}</span>
                <ChevronRight size={9} style={{ color: "var(--color-border)" }} />
                <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>agents read this before starting work</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
