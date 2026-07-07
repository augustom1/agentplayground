"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Pencil, Trash2, Loader2, Check, X,
  Circle, Zap, CheckCircle2, Users,
} from "lucide-react";

type AgentTeam = {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  agents: Agent[];
  skills: Skill[];
};

type Agent = {
  id: string;
  name: string;
  description?: string;
  capabilities: string[];
};

type Skill = {
  id: string;
  name: string;
  category: string;
};

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  completedAt?: string;
  team: { name: string };
  teamId: string;
};

type PlaygroundData = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  teamIds: string[];
};

function StatusDot({ status }: { status: string }) {
  const color =
    status === "running" ? "#22c55e" :
    status === "idle"    ? "#94a3b8" :
    status === "error"   ? "#ef4444" :
    "#94a3b8";
  return (
    <span
      style={{
        width: 7, height: 7, borderRadius: "50%",
        background: color, display: "inline-block", flexShrink: 0,
      }}
    />
  );
}

function AgentCard({ agent, teamStatus }: { agent: Agent; teamStatus: string }) {
  const initial = agent.name[0]?.toUpperCase() ?? "?";
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "8px 10px", borderRadius: 8,
        background: "var(--color-surface-3)",
      }}
    >
      <div
        style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "var(--color-brand-dim, #3b3226)",
          color: "var(--color-brand)", fontSize: 12, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {initial}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text)", margin: 0 }}>
          {agent.name}
        </p>
        {agent.description && (
          <p
            style={{
              fontSize: 11, color: "var(--color-muted)", margin: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {agent.description}
          </p>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <StatusDot status={teamStatus} />
        <span style={{ fontSize: 10, color: "var(--color-muted)" }}>{teamStatus}</span>
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const statusIcon =
    task.status === "running"   ? <Zap size={12} style={{ color: "#22c55e" }} /> :
    task.status === "completed" ? <CheckCircle2 size={12} style={{ color: "#6bcb8b" }} /> :
    task.status === "failed"    ? <Circle size={12} style={{ color: "#ef4444" }} /> :
    <Circle size={12} style={{ color: "#94a3b8" }} />;

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
        borderRadius: 8, background: "var(--color-surface-3)",
      }}
    >
      {statusIcon}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 12, fontWeight: 500, color: "var(--color-text)", margin: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          {task.title}
        </p>
        <p style={{ fontSize: 10, color: "var(--color-muted)", margin: 0 }}>{task.team.name}</p>
      </div>
      <span
        style={{
          fontSize: 10, padding: "2px 6px", borderRadius: 4,
          background: "var(--color-surface-2)", color: "var(--color-muted)", flexShrink: 0,
        }}
      >
        {task.priority}
      </span>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p
      style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "var(--color-muted)",
        margin: "0 0 8px 0",
      }}
    >
      {title}
    </p>
  );
}

export default function PlaygroundPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [playground, setPlayground] = useState<PlaygroundData | null>(null);
  const [teams, setTeams] = useState<AgentTeam[]>([]);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pgRes, teamsRes, tasksRes] = await Promise.all([
        fetch(`/api/playgrounds/${id}`),
        fetch("/api/teams"),
        fetch("/api/tasks"),
      ]);
      if (!pgRes.ok) { setError("Playground not found"); return; }

      const pg = await pgRes.json() as PlaygroundData;
      setPlayground(pg);
      setEditName(pg.name);
      setEditIcon(pg.icon ?? "");

      const allTeams = await teamsRes.json() as (AgentTeam & {
        agents: Agent[];
        skills: Skill[];
      })[];

      const filtered = pg.teamIds.length > 0
        ? allTeams.filter(t => pg.teamIds.includes(t.id))
        : [];

      const agentsRes = await fetch("/api/agents");
      const skillsRes = await fetch("/api/skills");
      const allAgents = agentsRes.ok ? await agentsRes.json() as (Agent & { teamId: string })[] : [];
      const allSkills = skillsRes.ok ? await skillsRes.json() as (Skill & { teamId: string })[] : [];

      const enriched: AgentTeam[] = filtered.map(t => ({
        ...t,
        agents: allAgents.filter(a => a.teamId === t.id),
        skills: allSkills.filter(s => s.teamId === t.id),
      }));
      setTeams(enriched);

      const allTasks = tasksRes.ok ? await tasksRes.json() as Task[] : [];
      const teamIdSet = new Set(pg.teamIds);
      const myTasks = allTasks.filter(t => teamIdSet.has(t.teamId));
      setActiveTasks(myTasks.filter(t => t.status === "running" || t.status === "pending"));
      setRecentTasks(myTasks.filter(t => t.status === "completed").slice(0, 5));
    } catch {
      setError("Failed to load playground");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saveEdit = async () => {
    if (!editName.trim() || !playground) return;
    setSaving(true);
    try {
      await fetch(`/api/playgrounds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), icon: editIcon || null }),
      });
      setPlayground(p => p ? { ...p, name: editName.trim(), icon: editIcon || null } : p);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const deletePlayground = async () => {
    if (!confirm("Delete this playground? The teams inside won't be deleted.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/playgrounds/${id}`, { method: "DELETE" });
      router.push("/chat");
    } catch {
      setDeleting(false);
    }
  };

  const allAgents = teams.flatMap(t => t.agents);
  const allSkills = teams.flatMap(t => t.skills);
  const uniqueSkills = [...new Map(allSkills.map(s => [s.id, s])).values()];

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: 8, color: "var(--color-muted)" }}>
        <Loader2 size={18} className="animate-spin" />
        <span style={{ fontSize: 13 }}>Loading…</span>
      </div>
    );
  }

  if (error || !playground) {
    return (
      <div style={{ padding: "40px 24px", maxWidth: 600 }}>
        <button
          onClick={() => router.back()}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-muted)", background: "none", border: "none", cursor: "pointer", marginBottom: 16 }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <p style={{ color: "var(--color-muted)", fontSize: 14 }}>{error ?? "Not found"}</p>
      </div>
    );
  }

  const accent = playground.color ?? "var(--color-brand)";

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1100, margin: "0 auto" }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <button
            onClick={() => router.back()}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", color: "var(--color-muted)", flexShrink: 0 }}
          >
            <ArrowLeft size={14} />
          </button>

          {playground.icon && (
            <span style={{ fontSize: 24, lineHeight: 1 }}>{playground.icon}</span>
          )}
          {!playground.icon && (
            <div
              style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: accent, display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Users size={16} color="#fff" />
            </div>
          )}

          {editing ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                value={editIcon}
                onChange={e => setEditIcon(e.target.value)}
                placeholder="emoji"
                style={{
                  width: 48, padding: "4px 6px", borderRadius: 6, fontSize: 18, textAlign: "center",
                  background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)",
                }}
              />
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
                autoFocus
                style={{
                  fontSize: 20, fontWeight: 700, padding: "4px 8px", borderRadius: 6,
                  background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                  color: "var(--color-text)", outline: "none",
                }}
              />
              <button onClick={saveEdit} disabled={saving} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, border: "none", background: accent, cursor: "pointer", color: "#fff" }}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              </button>
              <button onClick={() => setEditing(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, border: "none", background: "var(--color-surface-2)", cursor: "pointer", color: "var(--color-muted)" }}>
                <X size={12} />
              </button>
            </div>
          ) : (
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
              {playground.name}
            </h1>
          )}
        </div>

        {!editing && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => setEditing(true)}
              title="Edit"
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 12 }}
            >
              <Pencil size={12} /> Edit
            </button>
            <button
              onClick={deletePlayground}
              disabled={deleting}
              title="Delete playground"
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", color: "#ef4444", fontSize: 12 }}
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Delete
            </button>
          </div>
        )}
      </div>

      {/* ── Team count strip ───────────────────────────────────── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Teams", value: teams.length },
          { label: "Agents", value: allAgents.length },
          { label: "Skills", value: uniqueSkills.length },
          { label: "Active tasks", value: activeTasks.length },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>{value}</span>
            <span style={{ fontSize: 11, color: "var(--color-muted)" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Main grid ─────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "auto auto",
          gap: 12,
        }}
      >
        <div
          style={{
            background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
            borderRadius: 12, padding: 16,
          }}
        >
          <SectionHeader title={`Agents (${allAgents.length})`} />
          {allAgents.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--color-muted)" }}>No agents in the teams assigned to this playground.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {allAgents.map(agent => {
                const team = teams.find(t => t.agents.some(a => a.id === agent.id));
                return (
                  <AgentCard key={agent.id} agent={agent} teamStatus={team?.status ?? "idle"} />
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
            borderRadius: 12, padding: 16,
          }}
        >
          <SectionHeader title="Active Tasks" />
          {activeTasks.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--color-muted)" }}>No running or pending tasks.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {activeTasks.map(task => <TaskRow key={task.id} task={task} />)}
            </div>
          )}
        </div>

        <div
          style={{
            background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
            borderRadius: 12, padding: 16,
          }}
        >
          <SectionHeader title={`Skills (${uniqueSkills.length})`} />
          {uniqueSkills.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--color-muted)" }}>No skills defined on the teams in this playground.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {uniqueSkills.map(skill => (
                <span
                  key={skill.id}
                  style={{
                    fontSize: 11, padding: "3px 8px", borderRadius: 20,
                    background: `${accent}18`, color: accent,
                    border: `1px solid ${accent}30`,
                  }}
                >
                  {skill.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
            borderRadius: 12, padding: 16,
          }}
        >
          <SectionHeader title="Recent Completions" />
          {recentTasks.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--color-muted)" }}>No completed tasks yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentTasks.map(task => <TaskRow key={task.id} task={task} />)}
            </div>
          )}
        </div>
      </div>

      {teams.length === 0 && (
        <div
          style={{
            marginTop: 16, padding: 24, borderRadius: 12, textAlign: "center",
            border: "1px dashed var(--color-border)", background: "var(--color-surface-2)",
          }}
        >
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
            Teams of AI agents do the work in this playground. None are assigned yet.
          </p>
          <Link
            href={`/playground/${id}/settings`}
            style={{
              display: "inline-block", marginTop: 12, padding: "7px 14px", borderRadius: 8,
              fontSize: 13, fontWeight: 500, textDecoration: "none",
              background: "var(--color-brand)", color: "#fff",
            }}
          >
            Add teams
          </Link>
        </div>
      )}
    </div>
  );
}
