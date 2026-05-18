"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Layers,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  Circle,
  Archive,
  RefreshCw,
  Clock,
  ChevronDown,
  Users,
  Bell,
  Bot,
  UserPlus,
} from "lucide-react";

type ProjectStatus = "active" | "paused" | "completed" | "archived";
type ProjectType = "one-time" | "recurring" | "permanent";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  type: ProjectType;
  deliveryChannel: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; icon: React.ComponentType<{ size: number }> }> = {
  active:    { label: "Active",    color: "var(--color-green)",  icon: Circle },
  paused:    { label: "Paused",    color: "var(--color-yellow)", icon: PauseCircle },
  completed: { label: "Completed", color: "#60a5fa",             icon: CheckCircle2 },
  archived:  { label: "Archived",  color: "var(--color-muted)",  icon: Archive },
};

const TYPE_LABELS: Record<ProjectType, string> = {
  "one-time":  "One-time",
  "recurring": "Recurring",
  "permanent": "Permanent",
};

function daysAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: `${cfg.color}18`, color: cfg.color }}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: ProjectType }) {
  return (
    <span
      className="inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: "var(--color-surface-3)", color: "var(--color-muted)", border: "1px solid var(--color-border)" }}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | ProjectStatus>("all");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Upcoming meetings
  type MeetingParticipant = { type: "user" | "agent"; name: string; teamName?: string };
  type MeetingSummary = { id: string; title: string; scheduledFor: string; reminderMins: number; participants: MeetingParticipant[] };
  const [upcomingMeetings, setUpcomingMeetings] = useState<MeetingSummary[]>([]);

  useEffect(() => {
    fetch("/api/meetings?upcoming=true")
      .then((r) => r.json())
      .then((data: MeetingSummary[]) => setUpcomingMeetings(data.slice(0, 5)))
      .catch(() => {});
  }, []);

  // New project form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProjectType>("one-time");
  const [deliveryChannel, setDeliveryChannel] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Project[] = await res.json();
      setProjects(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, type, deliveryChannel: deliveryChannel.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      const project: Project = await res.json();
      setProjects((prev) => [project, ...prev]);
      setName(""); setDescription(""); setType("one-time"); setDeliveryChannel("");
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(id: string, status: ProjectStatus) {
    setUpdating(id);
    // Optimistic update
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
    try {
      await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      // Revert on failure
      fetchProjects();
    } finally {
      setUpdating(null);
    }
  }

  const filtered = projects.filter((p) => {
    if (activeTab === "all") return p.status !== "archived";
    return p.status === activeTab;
  });

  const tabs: Array<"all" | ProjectStatus> = ["all", "active", "paused", "completed", "archived"];
  const tabCounts = {
    all: projects.filter((p) => p.status !== "archived").length,
    active: projects.filter((p) => p.status === "active").length,
    paused: projects.filter((p) => p.status === "paused").length,
    completed: projects.filter((p) => p.status === "completed").length,
    archived: projects.filter((p) => p.status === "archived").length,
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ background: "var(--color-green-dim)" }}
          >
            <Layers size={17} style={{ color: "var(--color-green)" }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>Projects</h1>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              Goals organized by the Playground Keeper
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProjects}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
            style={{ color: "var(--color-muted)", border: "1px solid var(--color-border)" }}
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{
              background: showForm ? "var(--color-surface-3)" : "var(--color-green)",
              color: showForm ? "var(--color-text)" : "#000",
              border: showForm ? "1px solid var(--color-border)" : "none",
              fontWeight: 500,
            }}
          >
            {showForm ? <><X size={11} /> Cancel</> : <><Plus size={11} /> New Project</>}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: "var(--color-red-dim)", border: "1px solid rgba(248,113,113,0.2)" }}>
          <AlertCircle size={14} style={{ color: "var(--color-red)" }} />
          <p className="text-sm" style={{ color: "var(--color-red)" }}>{error}</p>
        </div>
      )}

      {/* New project form */}
      {showForm && (
        <form onSubmit={createProject} className="glass-card p-5 flex flex-col gap-4 animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
            New Project
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs" style={{ color: "var(--color-muted)" }}>Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. YouTube Content Pipeline"
                required
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--color-surface-3)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs" style={{ color: "var(--color-muted)" }}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this project accomplish?"
                rows={2}
                className="px-3 py-2 rounded-lg text-sm outline-none resize-none"
                style={{ background: "var(--color-surface-3)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs" style={{ color: "var(--color-muted)" }}>Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ProjectType)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--color-surface-3)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              >
                <option value="one-time">One-time</option>
                <option value="recurring">Recurring</option>
                <option value="permanent">Permanent</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs" style={{ color: "var(--color-muted)" }}>Delivery channel (optional)</label>
              <input
                value={deliveryChannel}
                onChange={(e) => setDeliveryChannel(e.target.value)}
                placeholder="chat / telegram / email"
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--color-surface-3)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ color: "var(--color-muted)", border: "1px solid var(--color-border)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-medium"
              style={{ background: "var(--color-green)", color: "#000", opacity: creating ? 0.6 : 1 }}
            >
              {creating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
              Create Project
            </button>
          </div>
        </form>
      )}

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && (
        <div className="glass-card p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Users size={13} style={{ color: "#818cf8" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Upcoming Meetings</span>
          </div>
          <div className="flex flex-col gap-2">
            {upcomingMeetings.map((m) => {
              const scheduledDate = new Date(m.scheduledFor);
              const minutesUntil = Math.round((scheduledDate.getTime() - Date.now()) / 60000);
              const isReminding = minutesUntil > 0 && minutesUntil <= m.reminderMins;
              return (
                <div key={m.id} className="flex items-start gap-3">
                  <div
                    className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg"
                    style={{ background: isReminding ? "rgba(251,191,36,0.12)" : "rgba(129,140,248,0.1)" }}
                  >
                    {isReminding ? <Bell size={12} style={{ color: "#fbbf24" }} /> : <Clock size={12} style={{ color: "#818cf8" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--color-text)" }}>{m.title}</p>
                    <p className="text-[11px]" style={{ color: isReminding ? "#fbbf24" : "var(--color-muted)" }}>
                      {isReminding ? `In ${minutesUntil} min` : scheduledDate.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {m.participants && m.participants.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {m.participants.slice(0, 3).map((p, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-px rounded-full"
                            style={{
                              background: p.type === "agent" ? "rgba(99,102,241,0.1)" : "rgba(52,211,153,0.1)",
                              color: p.type === "agent" ? "#818cf8" : "var(--color-green)",
                            }}
                          >
                            {p.type === "agent" ? <Bot size={8} /> : <UserPlus size={8} />}
                            {p.name}
                          </span>
                        ))}
                        {m.participants.length > 3 && (
                          <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>+{m.participants.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <a href="/schedule" className="text-[11px] self-start" style={{ color: "#818cf8", textDecoration: "none" }}>
            View all in Schedule →
          </a>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const count = tabCounts[tab];
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-all"
              style={{
                background: active ? "var(--color-surface-3)" : "transparent",
                color: active ? "var(--color-text)" : "var(--color-muted)",
                border: active ? "1px solid var(--color-border)" : "1px solid transparent",
                fontWeight: active ? 500 : 400,
              }}
            >
              {tab === "all" ? "All" : STATUS_CONFIG[tab as ProjectStatus].label}
              {count > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: active ? "var(--color-green-dim)" : "var(--color-surface-3)", color: active ? "var(--color-green)" : "var(--color-muted)" }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={22} className="animate-spin" style={{ color: "var(--color-muted)" }} />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Layers size={32} style={{ color: "var(--color-muted)", opacity: 0.3 }} />
          <p className="text-sm font-medium" style={{ color: "var(--color-muted)" }}>
            No {activeTab === "all" ? "" : activeTab + " "}projects yet
          </p>
          <p className="text-xs text-center max-w-xs" style={{ color: "var(--color-muted)", opacity: 0.7 }}>
            Ask the Keeper to create a project, or click{" "}
            <button onClick={() => setShowForm(true)} style={{ color: "var(--color-green)", background: "none", border: "none", cursor: "pointer" }}>
              New Project
            </button>
            {" "}above.
          </p>
        </div>
      )}

      {/* Project cards */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((project) => {
            const isExpanded = expandedId === project.id;
            return (
              <div key={project.id} className="glass-card flex flex-col gap-0 overflow-hidden">
                {/* Card header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : project.id)}
                  className="flex items-start justify-between p-4 text-left w-full hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={project.status} />
                      <TypeBadge type={project.type} />
                    </div>
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>
                      {project.name}
                    </p>
                    {project.description && (
                      <p
                        className="text-xs leading-relaxed"
                        style={{
                          color: "var(--color-muted)",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} style={{ color: "var(--color-muted)" }} />
                      <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                        {daysAgo(project.createdAt)}
                      </span>
                      {project.deliveryChannel && (
                        <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                          · via {project.deliveryChannel}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    size={14}
                    style={{
                      color: "var(--color-muted)",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.15s",
                      flexShrink: 0,
                      marginLeft: "8px",
                      marginTop: "2px",
                    }}
                  />
                </button>

                {/* Expanded actions */}
                {isExpanded && (
                  <div
                    className="flex flex-wrap gap-2 px-4 pb-4 animate-fade-in"
                    style={{ borderTop: "1px solid var(--color-border)", paddingTop: "12px" }}
                  >
                    {project.status !== "active" && (
                      <ActionButton
                        label="Set Active"
                        color="var(--color-green)"
                        loading={updating === project.id}
                        onClick={() => updateStatus(project.id, "active")}
                      />
                    )}
                    {project.status === "active" && (
                      <ActionButton
                        label="Pause"
                        color="var(--color-yellow)"
                        loading={updating === project.id}
                        onClick={() => updateStatus(project.id, "paused")}
                      />
                    )}
                    {project.status !== "completed" && project.status !== "archived" && (
                      <ActionButton
                        label="Complete"
                        color="#60a5fa"
                        loading={updating === project.id}
                        onClick={() => updateStatus(project.id, "completed")}
                      />
                    )}
                    {project.status !== "archived" && (
                      <ActionButton
                        label="Archive"
                        color="var(--color-muted)"
                        loading={updating === project.id}
                        onClick={() => updateStatus(project.id, "archived")}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  color,
  loading,
  onClick,
}: {
  label: string;
  color: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-opacity"
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}30`,
        opacity: loading ? 0.5 : 1,
        cursor: loading ? "default" : "pointer",
      }}
    >
      {loading ? <Loader2 size={10} className="animate-spin" /> : null}
      {label}
    </button>
  );
}
