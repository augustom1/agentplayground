"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, LayoutGrid, CheckCircle2, ListTodo, Users, ArrowRight, Loader2,
  LayoutDashboard, Brain, CalendarDays, Sparkles, Globe, Wrench,
} from "lucide-react";

// Hub windows — the full pages embedded as sections (VISION §2 update: Overview = system hub)
import BrainWindow from "@/app/(app)/files/page";
import ScheduleWindow from "@/app/(app)/schedule/page";
import OptimizeWindow from "@/app/(app)/optimize/page";
import WebsitesWindow from "@/app/(app)/websites/page";
import ToolsWindow from "@/app/(app)/tools/page";

type Task = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  team: { name: string } | null;
};

type Playground = { id: string; name: string; icon: string | null };

type Team = {
  id: string;
  name: string;
  isSystemTeam?: boolean;
  _count?: { agents: number; tasks: number; skills: number };
};

type Plan = { id: string; title: string; status: string; createdAt: string };

type SectionId = "dashboard" | "brain" | "schedule" | "optimize" | "websites" | "tools";

const SECTIONS: Array<{ id: SectionId; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "brain", label: "Brain", icon: Brain },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "optimize", label: "Optimize", icon: Sparkles },
  { id: "websites", label: "Websites", icon: Globe },
  { id: "tools", label: "Tools", icon: Wrench },
];

function isSectionId(v: string): v is SectionId {
  return SECTIONS.some(s => s.id === v);
}

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
  RUNNING: { bg: "var(--color-brand-dim)", color: "var(--color-brand)", label: "Running" },
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

function Empty({ text, actionLabel, actionHref }: { text: string; actionLabel?: string; actionHref?: string }) {
  return (
    <div style={{ padding: "16px", textAlign: "center" }}>
      <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0 }}>{text}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          style={{ display: "inline-block", marginTop: 8, fontSize: 12, fontWeight: 500, color: "var(--color-brand)", textDecoration: "none" }}
        >
          {actionLabel} →
        </Link>
      )}
    </div>
  );
}

const ROW_BORDER = "1px solid rgba(255,255,255,0.04)";

function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [playgrounds, setPlaygrounds] = useState<Playground[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/tasks").then(r => r.ok ? r.json() : []),
      fetch("/api/playgrounds").then(r => r.ok ? r.json() : []),
      fetch("/api/teams").then(r => r.ok ? r.json() : []),
      fetch("/api/plans").then(r => r.ok ? r.json() : []),
    ]).then(([tasksR, pgR, teamsR, plansR]) => {
      if (tasksR.status === "fulfilled") setTasks(tasksR.value as Task[]);
      if (pgR.status === "fulfilled") setPlaygrounds(pgR.value as Playground[]);
      if (teamsR.status === "fulfilled") setTeams((teamsR.value as Team[]).filter(t => !t.isSystemTeam));
      if (plansR.status === "fulfilled") setPlans((plansR.value as Plan[]).slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  const activeTasks = tasks.filter(t => t.status === "running" || t.status === "pending");
  const completedTasks = tasks.filter(t => t.status === "completed").slice(0, 5);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240 }}>
        <Loader2 size={18} style={{ color: "var(--color-muted)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>

      {/* 1 — Tasks: totals + active list */}
      <Widget title="Tasks" icon={Activity}>
        <div style={{ display: "flex", gap: 28, padding: "14px 16px 10px" }}>
          <div>
            <span style={{ fontSize: 28, fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.03em", lineHeight: 1 }}>{tasks.length}</span>
            <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 3 }}>total</p>
          </div>
          <div>
            <span style={{ fontSize: 28, fontWeight: 700, color: activeTasks.length > 0 ? "var(--color-green)" : "var(--color-text)", letterSpacing: "-0.03em", lineHeight: 1 }}>{activeTasks.length}</span>
            <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 3 }}>active</p>
          </div>
        </div>
        {tasks.length === 0 && (
          <Empty
            text="Work you send to your teams shows up here."
            actionLabel="Dispatch your first task"
            actionHref="/playgrounds"
          />
        )}
        {activeTasks.slice(0, 5).map((t, i) => (
          <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 16px", borderTop: i === 0 ? "1px solid var(--color-border)" : ROW_BORDER }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 5, background: STATUS_COLOR[t.status] ?? "var(--color-muted)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
              <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 1 }}>{t.team?.name ?? "—"} · {timeAgo(t.createdAt)}</p>
            </div>
          </div>
        ))}
      </Widget>

      {/* 2 — Playgrounds */}
      <Widget title="Playgrounds" icon={LayoutGrid} href="/playgrounds">
        {playgrounds.length === 0 ? (
          <Empty
            text="Playgrounds are workspaces that group your agent teams."
            actionLabel="Create one"
            actionHref="/playgrounds"
          />
        ) : (
          <div style={{ padding: "6px 8px" }}>
            {playgrounds.map(pg => (
              <Link
                key={pg.id}
                href={`/playground/${pg.id}`}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, textDecoration: "none", color: "var(--color-text)", fontSize: 13 }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                <LayoutGrid size={13} style={{ color: "var(--color-brand)", opacity: 0.85, flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pg.name}</span>
                <ArrowRight size={11} style={{ color: "var(--color-muted)" }} />
              </Link>
            ))}
          </div>
        )}
      </Widget>

      {/* 3 — Teams */}
      <Widget title="Teams" icon={Users}>
        {teams.length === 0 ? (
          <Empty
            text="Teams are groups of AI agents that carry out your tasks."
            actionLabel="Ask the Keeper to set one up"
            actionHref="/chat?team=coordinator"
          />
        ) : (
          <div style={{ padding: "6px 8px" }}>
            {teams.slice(0, 8).map(t => (
              <Link
                key={t.id}
                href={`/chat?team=${t.id}`}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, textDecoration: "none", color: "var(--color-text)", fontSize: 13 }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                <Users size={13} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                <span style={{ fontSize: 11, color: "var(--color-muted)", flexShrink: 0 }}>
                  {t._count?.agents ?? 0} agent{(t._count?.agents ?? 0) !== 1 ? "s" : ""}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Widget>

      {/* 4 — Plans */}
      <Widget title="Plans" icon={ListTodo} href="/plans">
        {plans.length === 0 ? (
          <Empty
            text="Plans break a big goal into tasks across your teams."
            actionLabel="Create a plan"
            actionHref="/plans"
          />
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

      {/* 5 — Recent Completions */}
      <Widget title="Recent Completions" icon={CheckCircle2}>
        {completedTasks.length === 0 ? (
          <Empty
            text="Finished task results land here."
            actionLabel="Dispatch a task"
            actionHref="/playgrounds"
          />
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

    </div>
  );
}

export default function OverviewPage() {
  const [section, setSection] = useState<SectionId>("dashboard");

  // Section synced to the URL hash — /overview#brain lands on Brain (sidebar Brain item points there)
  useEffect(() => {
    function apply() {
      const h = window.location.hash.replace("#", "");
      setSection(isSectionId(h) ? h : "dashboard");
    }
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  function selectSection(id: SectionId) {
    setSection(id);
    history.replaceState(null, "", id === "dashboard" ? "/overview" : `/overview#${id}`);
  }

  return (
    <div style={{ padding: "24px 24px 0", maxWidth: 1120, margin: "0 auto", width: "100%" }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
          Overview
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 3 }}>Everything you have working, in one window</p>
      </div>

      {/* Section tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, borderBottom: "1px solid var(--color-border)", overflowX: "auto", marginBottom: 18 }}>
        {SECTIONS.map(({ id, label, icon: Icon }) => {
          const active = section === id;
          return (
            <button
              key={id}
              onClick={() => selectSection(id)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 14px", fontSize: 13, whiteSpace: "nowrap",
                background: "transparent", border: "none", cursor: "pointer",
                color: active ? "var(--color-text)" : "var(--color-muted)",
                fontWeight: active ? 500 : 400,
                borderBottom: active ? "2px solid var(--color-brand)" : "2px solid transparent",
                marginBottom: -1,
                transition: "color 0.12s",
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "var(--color-muted)"; }}
            >
              <Icon size={13} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Active window */}
      {section === "dashboard" && <Dashboard />}
      {section === "brain" && <BrainWindow />}
      {section === "schedule" && <ScheduleWindow />}
      {section === "optimize" && <OptimizeWindow />}
      {section === "websites" && <WebsitesWindow />}
      {section === "tools" && <ToolsWindow />}
    </div>
  );
}
