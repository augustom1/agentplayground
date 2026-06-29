"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity, LayoutGrid, CheckCircle2, ListTodo, BookOpen, MessageSquare,
  Plus, ArrowRight, Loader2,
} from "lucide-react";

type Task = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  team: { name: string } | null;
};

type Playground = { id: string; name: string; icon: string | null };

type Plan = { id: string; title: string; status: string; createdAt: string };

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_COLOR: Record<string, string> = {
  running: "var(--color-green)",
  pending: "var(--color-yellow)",
  failed: "var(--color-red)",
};

const PLAN_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING_APPROVAL: { bg: "var(--color-yellow-dim)", color: "var(--color-yellow)", label: "Draft" },
  APPROVED: { bg: "var(--color-green-dim)", color: "var(--color-green)", label: "Approved" },
  RUNNING: { bg: "rgba(212,113,90,0.12)", color: "var(--color-brand)", label: "Running" },
  COMPLETED: { bg: "var(--color-surface-3)", color: "var(--color-muted)", label: "Done" },
  FAILED: { bg: "var(--color-red-dim)", color: "var(--color-red)", label: "Failed" },
};

function Widget({
  title,
  icon: Icon,
  children,
  href,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  children: React.ReactNode;
  href?: string;
}) {
  return (
    <div
      className="glass-card"
      style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 160 }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "13px 16px 11px",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Icon size={13} style={{ color: "var(--color-muted)" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {title}
          </span>
        </div>
        {href && (
          <Link href={href} style={{ fontSize: 11, color: "var(--color-muted)", textDecoration: "none" }}>
            All →
          </Link>
        )}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p style={{ fontSize: 12, color: "var(--color-muted)", padding: "16px", textAlign: "center" }}>
      {text}
    </p>
  );
}

const ROW_BORDER = "1px solid rgba(255,255,255,0.04)";

export default function OverviewPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [playgrounds, setPlaygrounds] = useState<Playground[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [brainCount, setBrainCount] = useState<number | null>(null);
  const [brainLastDate, setBrainLastDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/tasks").then(r => r.ok ? r.json() : []),
      fetch("/api/playgrounds").then(r => r.ok ? r.json() : []),
      fetch("/api/plans").then(r => r.ok ? r.json() : []),
      fetch("/api/brain/notes?limit=1").then(r => r.ok ? r.json() : null),
    ]).then(([tasksR, pgR, plansR, brainR]) => {
      if (tasksR.status === "fulfilled") setTasks(tasksR.value as Task[]);
      if (pgR.status === "fulfilled") setPlaygrounds(pgR.value as Playground[]);
      if (plansR.status === "fulfilled") setPlans((plansR.value as Plan[]).slice(0, 5));
      if (brainR.status === "fulfilled" && brainR.value) {
        const b = brainR.value as { total: number; notes: Array<{ updatedAt: string }> };
        setBrainCount(b.total ?? 0);
        if (b.notes?.length > 0) setBrainLastDate(b.notes[0].updatedAt);
      }
    }).finally(() => setLoading(false));
  }, []);

  const activeTasks = tasks.filter(t => t.status === "running" || t.status === "pending").slice(0, 10);
  const completedTasks = tasks.filter(t => t.status === "completed").slice(0, 5);

  function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = chatInput.trim();
    if (!q) return;
    router.push(`/chat?q=${encodeURIComponent(q)}`);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240 }}>
        <Loader2 size={18} style={{ color: "var(--color-muted)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: 1040, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
          Overview
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 3 }}>Your agents at a glance</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>

        {/* 1 — Active Tasks */}
        <Widget title="Active Tasks" icon={Activity}>
          {activeTasks.length === 0 ? (
            <Empty text="No active tasks" />
          ) : activeTasks.map((t, i) => (
            <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 16px", borderBottom: i < activeTasks.length - 1 ? ROW_BORDER : "none" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 5, background: STATUS_COLOR[t.status] ?? "var(--color-muted)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 1 }}>{t.team?.name ?? "—"} · {timeAgo(t.createdAt)}</p>
              </div>
            </div>
          ))}
        </Widget>

        {/* 2 — Playgrounds Quick-Launch */}
        <Widget title="Playgrounds" icon={LayoutGrid}>
          {playgrounds.length > 0 && (
            <div style={{ padding: "6px 8px" }}>
              {playgrounds.map(pg => (
                <Link
                  key={pg.id}
                  href={`/playground/${pg.id}`}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, textDecoration: "none", color: "var(--color-text)", fontSize: 13 }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>{pg.icon ?? "🎯"}</span>
                  <span style={{ flex: 1 }}>{pg.name}</span>
                  <ArrowRight size={11} style={{ color: "var(--color-muted)" }} />
                </Link>
              ))}
            </div>
          )}
          {playgrounds.length === 0 && <Empty text="No playgrounds yet" />}
          <div style={{ padding: "8px 12px 10px", borderTop: playgrounds.length > 0 ? "1px solid var(--color-border)" : "none", marginTop: playgrounds.length > 0 ? 4 : 0 }}>
            <button
              onClick={() => router.push("/chat")}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, width: "100%", background: "transparent", border: "1px dashed var(--color-border)", color: "var(--color-muted)", fontSize: 12, cursor: "pointer" }}
            >
              <Plus size={11} /> New Playground
            </button>
          </div>
        </Widget>

        {/* 3 — Recent Completions */}
        <Widget title="Recent Completions" icon={CheckCircle2}>
          {completedTasks.length === 0 ? (
            <Empty text="No completed tasks yet" />
          ) : completedTasks.map((t, i) => (
            <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 16px", borderBottom: i < completedTasks.length - 1 ? ROW_BORDER : "none" }}>
              <CheckCircle2 size={12} style={{ color: "var(--color-green)", flexShrink: 0, marginTop: 3 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 1 }}>{t.team?.name ?? "—"} · {timeAgo(t.createdAt)}</p>
              </div>
            </div>
          ))}
        </Widget>

        {/* 4 — Plans Status */}
        <Widget title="Plans" icon={ListTodo} href="/plans">
          {plans.length === 0 ? (
            <Empty text="No plans yet" />
          ) : plans.map((p, i) => {
            const badge = PLAN_BADGE[p.status] ?? { bg: "var(--color-surface-3)", color: "var(--color-muted)", label: p.status };
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: i < plans.length - 1 ? ROW_BORDER : "none" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</p>
                  <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 1 }}>{timeAgo(p.createdAt)}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, flexShrink: 0, padding: "2px 8px", borderRadius: 999, background: badge.bg, color: badge.color }}>
                  {badge.label}
                </span>
              </div>
            );
          })}
        </Widget>

        {/* 5 — Brain Summary */}
        <Widget title="Brain" icon={BookOpen} href="/files">
          <div style={{ padding: "16px" }}>
            {brainCount === null ? (
              <p style={{ fontSize: 12, color: "var(--color-muted)" }}>Loading…</p>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.03em", lineHeight: 1 }}>{brainCount}</span>
                  <span style={{ fontSize: 13, color: "var(--color-muted)" }}>documents</span>
                </div>
                {brainLastDate && (
                  <p style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 14 }}>Last indexed {timeAgo(brainLastDate)}</p>
                )}
                <Link href="/files" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--color-brand)", textDecoration: "none" }}>
                  Open Brain <ArrowRight size={11} />
                </Link>
              </>
            )}
          </div>
        </Widget>

        {/* 6 — Quick Chat */}
        <Widget title="Quick Chat" icon={MessageSquare}>
          <div style={{ padding: "14px 16px" }}>
            <p style={{ fontSize: 12, color: "var(--color-muted)", marginBottom: 12, lineHeight: 1.6 }}>
              Ask your coordinator anything — opens Chat.
            </p>
            <form onSubmit={handleChatSubmit} style={{ display: "flex", gap: 8 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask anything…"
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)", outline: "none" }}
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", background: chatInput.trim() ? "var(--color-brand)" : "var(--color-surface-3)", color: chatInput.trim() ? "#fff" : "var(--color-muted)", cursor: chatInput.trim() ? "pointer" : "not-allowed" }}
              >
                Go →
              </button>
            </form>
          </div>
        </Widget>

      </div>
    </div>
  );
}
