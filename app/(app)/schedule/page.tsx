"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Clock,
  ChevronLeft,
  ChevronRight,
  Zap,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Repeat,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
  Bell,
  UserPlus,
  Bot,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";

type ScheduledJob = {
  id: string;
  title: string;
  description: string | null;
  scheduledFor: string;
  recurring: string;
  status: string;
  isOffHours: boolean;
  teamId: string;
  teamName: string;
};

type RecurringTask = {
  id: string;
  title: string;
  description: string | null;
  prompt: string | null;
  cron: string;
  timezone: string;
  enabled: boolean;
  teamId: string;
  team: { name: string };
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
};

type Team = {
  id: string;
  name: string;
};

type MeetingParticipant = {
  type: "user" | "agent";
  name: string;
  teamName?: string;
};

type Meeting = {
  id: string;
  title: string;
  description: string | null;
  scheduledFor: string;
  reminderMins: number;
  participants: MeetingParticipant[];
  status: string;
  createdAt: string;
};

type AgentOption = {
  id: string;
  name: string;
  teamName: string;
};

const TEAM_PALETTE = [
  "#6366f1",
  "var(--color-green)",
  "var(--color-yellow)",
  "var(--color-red)",
  "#818cf8",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#a78bfa",
  "#6ee7b7",
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getTimeStr(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function formatRunTime(isoString: string | null): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SchedulePage() {
  const { addToast } = useToast();
  const now = new Date();

  // Tab state
  const [activeTab, setActiveTab] = useState<"calendar" | "recurring" | "meetings">("calendar");

  // Calendar state
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    scheduledFor: "",
    recurring: "none",
    teamId: "",
  });

  // Meetings state
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null);
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    description: "",
    scheduledFor: "",
    reminderMins: 15,
  });
  const [meetingParticipants, setMeetingParticipants] = useState<MeetingParticipant[]>([]);
  const [humanInput, setHumanInput] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");

  // Recurring tasks state
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [recurringError, setRecurringError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringSubmitting, setRecurringSubmitting] = useState(false);
  const [recurringForm, setRecurringForm] = useState({
    title: "",
    description: "",
    cron: "",
    timezone: "UTC",
    teamId: "",
  });

  // Build a stable teamId → color map from jobs
  const teamIds = [...new Set(jobs.map((j) => j.teamId))];
  function getTeamColor(teamId: string): string {
    const idx = teamIds.indexOf(teamId);
    return TEAM_PALETTE[idx % TEAM_PALETTE.length] || "var(--color-accent)";
  }

  async function fetchJobs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/schedule?year=${viewYear}&month=${viewMonth}`);
      if (!res.ok) throw new Error("Failed to load schedule");
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchTeams() {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
        if (data.length > 0 && !form.teamId) {
          setForm((f) => ({ ...f, teamId: data[0].id }));
          setRecurringForm((f) => ({ ...f, teamId: data[0].id }));
        }
      }
    } catch {
      // non-critical
    }
  }

  async function fetchRecurringTasks() {
    setRecurringLoading(true);
    setRecurringError(null);
    try {
      const res = await fetch("/api/recurring-tasks");
      if (!res.ok) throw new Error("Failed to load recurring tasks");
      const data = await res.json();
      setRecurringTasks(data);
    } catch (err) {
      setRecurringError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRecurringLoading(false);
    }
  }

  async function fetchMeetings() {
    setMeetingsLoading(true);
    setMeetingsError(null);
    try {
      const res = await fetch("/api/meetings");
      if (!res.ok) throw new Error("Failed to load meetings");
      const data = await res.json();
      setMeetings(data);
    } catch (err) {
      setMeetingsError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setMeetingsLoading(false);
    }
  }

  async function fetchAgentOptions() {
    try {
      const res = await fetch("/api/teams?include=agents");
      if (!res.ok) return;
      const teamsData = await res.json();
      const opts: AgentOption[] = [];
      for (const team of teamsData) {
        for (const agent of team.agents ?? []) {
          opts.push({ id: agent.id, name: agent.name, teamName: team.name });
        }
      }
      setAgentOptions(opts);
      if (opts.length > 0) setSelectedAgent(opts[0].id);
    } catch { /* non-critical */ }
  }

  async function deleteMeeting(id: string) {
    setDeletingMeetingId(id);
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      addToast("Meeting deleted", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to delete meeting", "error");
    } finally {
      setDeletingMeetingId(null);
    }
  }

  async function markMeetingDone(id: string) {
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setMeetings((prev) => prev.map((m) => m.id === id ? { ...m, status: "done" } : m));
      addToast("Meeting marked as done", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to update meeting", "error");
    }
  }

  async function submitMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!meetingForm.title || !meetingForm.scheduledFor) return;
    setMeetingSubmitting(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: meetingForm.title,
          description: meetingForm.description || null,
          scheduledFor: new Date(meetingForm.scheduledFor).toISOString(),
          reminderMins: meetingForm.reminderMins,
          participants: meetingParticipants,
        }),
      });
      if (!res.ok) throw new Error("Failed to schedule meeting");
      const created: Meeting = await res.json();
      setMeetings((prev) => [created, ...prev].sort((a, b) =>
        new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
      ));
      setShowMeetingModal(false);
      setMeetingForm({ title: "", description: "", scheduledFor: "", reminderMins: 15 });
      setMeetingParticipants([]);
      setHumanInput("");
      addToast("Meeting scheduled", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to schedule meeting", "error");
    } finally {
      setMeetingSubmitting(false);
    }
  }

  function addHumanParticipant() {
    const name = humanInput.trim();
    if (!name) return;
    if (meetingParticipants.some((p) => p.name === name)) return;
    setMeetingParticipants((prev) => [...prev, { type: "user", name }]);
    setHumanInput("");
  }

  function addAgentParticipant() {
    const agent = agentOptions.find((a) => a.id === selectedAgent);
    if (!agent) return;
    if (meetingParticipants.some((p) => p.type === "agent" && p.name === agent.name)) return;
    setMeetingParticipants((prev) => [...prev, { type: "agent", name: agent.name, teamName: agent.teamName }]);
  }

  function removeParticipant(name: string) {
    setMeetingParticipants((prev) => prev.filter((p) => p.name !== name));
  }

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth]);

  useEffect(() => {
    fetchTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "recurring") {
      fetchRecurringTasks();
    } else if (activeTab === "meetings") {
      fetchMeetings();
      fetchAgentOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Group jobs by day
  const jobsByDay: Record<string, ScheduledJob[]> = {};
  for (const job of jobs) {
    const key = new Date(job.scheduledFor).toISOString().split("T")[0];
    if (!jobsByDay[key]) jobsByDay[key] = [];
    jobsByDay[key].push(job);
  }

  const monthDays = getMonthDays(viewYear, viewMonth);
  const todayKey = formatDateKey(now);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
    setExpandedDay(null);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
    setExpandedDay(null);
  }

  function goToday() {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setExpandedDay(null);
  }

  async function submitJob(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.scheduledFor || !form.teamId) return;
    setSubmitting(true);
    try {
      const team = teams.find((t) => t.id === form.teamId);
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          scheduledFor: new Date(form.scheduledFor).toISOString(),
          recurring: form.recurring,
          teamId: form.teamId,
          teamName: team?.name ?? "",
        }),
      });
      if (!res.ok) throw new Error("Failed to create job");
      setShowAddModal(false);
      setForm({ title: "", scheduledFor: "", recurring: "none", teamId: teams[0]?.id ?? "" });
      addToast("Job scheduled successfully", "success");
      fetchJobs();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to create job", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleRecurringTask(task: RecurringTask) {
    setTogglingId(task.id);
    try {
      const res = await fetch(`/api/recurring-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !task.enabled }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      const updated: RecurringTask = await res.json();
      setRecurringTasks((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
      addToast(
        updated.enabled ? "Task enabled" : "Task disabled",
        "success"
      );
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to update task", "error");
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteRecurringTask(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/recurring-tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      setRecurringTasks((prev) => prev.filter((t) => t.id !== id));
      addToast("Recurring task deleted", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to delete task", "error");
    } finally {
      setDeletingId(null);
    }
  }

  async function submitRecurringTask(e: React.FormEvent) {
    e.preventDefault();
    if (!recurringForm.title || !recurringForm.cron || !recurringForm.teamId) return;
    setRecurringSubmitting(true);
    try {
      const res = await fetch("/api/recurring-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recurringForm.title,
          description: recurringForm.description || null,
          cron: recurringForm.cron,
          timezone: recurringForm.timezone,
          teamId: recurringForm.teamId,
        }),
      });
      if (!res.ok) throw new Error("Failed to create recurring task");
      setShowRecurringModal(false);
      setRecurringForm({
        title: "",
        description: "",
        cron: "",
        timezone: "UTC",
        teamId: teams[0]?.id ?? "",
      });
      addToast("Recurring task created", "success");
      fetchRecurringTasks();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to create task", "error");
    } finally {
      setRecurringSubmitting(false);
    }
  }

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            Schedule
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            {activeTab === "calendar"
              ? "Monthly task calendar across all agent teams"
              : activeTab === "recurring"
              ? "Recurring cron-based tasks across all agent teams"
              : "Scheduled meetings with humans and agents"}
          </p>
        </div>
        {activeTab === "calendar" ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2.5"
          >
            <Plus size={15} />
            Add Job
          </button>
        ) : activeTab === "recurring" ? (
          <button
            onClick={() => setShowRecurringModal(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2.5"
          >
            <Plus size={15} />
            New Recurring Task
          </button>
        ) : (
          <button
            onClick={() => setShowMeetingModal(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2.5"
          >
            <Plus size={15} />
            Schedule Meeting
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1" style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "0" }}>
        <button
          onClick={() => setActiveTab("calendar")}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
          style={{
            color: activeTab === "calendar" ? "var(--color-text)" : "var(--color-muted)",
            borderBottom: activeTab === "calendar" ? "2px solid #818cf8" : "2px solid transparent",
            marginBottom: "-1px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Calendar size={13} />
          Calendar
        </button>
        <button
          onClick={() => setActiveTab("recurring")}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
          style={{
            color: activeTab === "recurring" ? "var(--color-text)" : "var(--color-muted)",
            borderBottom: activeTab === "recurring" ? "2px solid #818cf8" : "2px solid transparent",
            marginBottom: "-1px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Repeat size={13} />
          Recurring
          {recurringTasks.length > 0 && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8" }}
            >
              {recurringTasks.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("meetings")}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
          style={{
            color: activeTab === "meetings" ? "var(--color-text)" : "var(--color-muted)",
            borderBottom: activeTab === "meetings" ? "2px solid #818cf8" : "2px solid transparent",
            marginBottom: "-1px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Users size={13} />
          Meetings
          {meetings.filter((m) => m.status === "upcoming").length > 0 && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8" }}
            >
              {meetings.filter((m) => m.status === "upcoming").length}
            </span>
          )}
        </button>
      </div>

      {/* ── CALENDAR TAB ── */}
      {activeTab === "calendar" && (
        <>
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="btn-ghost p-2">
                <ChevronLeft size={14} />
              </button>
              <span
                className="text-sm font-semibold min-w-[160px] text-center"
                style={{ color: "var(--color-text)" }}
              >
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button onClick={nextMonth} className="btn-ghost p-2">
                <ChevronRight size={14} />
              </button>
              {!isCurrentMonth && (
                <button onClick={goToday} className="btn-ghost px-2.5 py-1 text-[11px]">
                  Today
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {loading && <Loader2 size={14} className="animate-spin" style={{ color: "var(--color-muted)" }} />}
              {/* Team color legend */}
              <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--color-muted)" }}>
                {teamIds.map((tid) => {
                  const job = jobs.find((j) => j.teamId === tid);
                  return (
                    <div key={tid} className="flex items-center gap-1">
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "3px",
                          background: getTeamColor(tid),
                          display: "inline-block",
                        }}
                      />
                      {job?.teamName ?? tid}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "var(--color-red-dim)", border: "1px solid rgba(248,113,113,0.2)" }}
            >
              <AlertCircle size={15} style={{ color: "var(--color-red)" }} />
              <p className="text-sm flex-1" style={{ color: "var(--color-red)" }}>{error}</p>
              <button
                onClick={fetchJobs}
                className="flex items-center gap-1 text-[11px]"
                style={{ color: "var(--color-red)" }}
              >
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          )}

          {/* Calendar grid */}
          <div className="glass-card overflow-hidden" style={{ position: "relative" }}>
            {loading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(6,6,14,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 5,
                }}
              >
                <Loader2 size={24} className="animate-spin" style={{ color: "#818cf8" }} />
              </div>
            )}

            {/* Day headers */}
            <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--color-border)" }}>
              {DAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="text-center py-2.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-muted)" }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {monthDays.map((date, i) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${i}`}
                      className="min-h-[80px]"
                      style={{
                        background: "rgba(6,6,14,0.3)",
                        borderRight: (i + 1) % 7 !== 0 ? "1px solid var(--color-border)" : undefined,
                        borderBottom: i < monthDays.length - 7 ? "1px solid var(--color-border)" : undefined,
                      }}
                    />
                  );
                }

                const key = formatDateKey(date);
                const dayJobs = jobsByDay[key] || [];
                const isToday = key === todayKey;
                const isExpanded = expandedDay === key;
                const hasJobs = dayJobs.length > 0;

                return (
                  <div
                    key={key}
                    className="min-h-[80px] flex flex-col transition-colors"
                    style={{
                      background: isToday ? "rgba(99,102,241,0.05)" : "transparent",
                      borderRight: (i + 1) % 7 !== 0 ? "1px solid var(--color-border)" : undefined,
                      borderBottom: i < monthDays.length - 7 ? "1px solid var(--color-border)" : undefined,
                      cursor: hasJobs ? "pointer" : "default",
                    }}
                    onClick={() => hasJobs && setExpandedDay(isExpanded ? null : key)}
                  >
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <span
                        className="text-xs font-medium flex items-center justify-center"
                        style={{
                          color: isToday ? "#a5b4fc" : "var(--color-text)",
                          background: isToday ? "rgba(99,102,241,0.15)" : "transparent",
                          borderRadius: "6px",
                          width: "24px",
                          height: "24px",
                        }}
                      >
                        {date.getDate()}
                      </span>
                      {hasJobs && (
                        <div className="flex items-center gap-1">
                          <div className="flex gap-0.5">
                            {[...new Set(dayJobs.map((j) => j.teamId))].map((tid) => (
                              <span
                                key={tid}
                                style={{
                                  width: "5px",
                                  height: "5px",
                                  borderRadius: "50%",
                                  background: getTeamColor(tid),
                                  display: "inline-block",
                                }}
                              />
                            ))}
                          </div>
                          <span className="text-[9px] font-medium" style={{ color: "var(--color-muted)" }}>
                            {dayJobs.length}
                          </span>
                          <ChevronDown
                            size={10}
                            style={{
                              color: "var(--color-muted)",
                              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                              transition: "transform 0.2s",
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="px-1.5 pb-1.5 flex flex-col gap-1 animate-fade-in">
                        {dayJobs.map((job) => (
                          <div
                            key={job.id}
                            className="px-2 py-1.5 rounded-md"
                            style={{
                              background: "rgba(18,18,31,0.6)",
                              borderLeft: `2px solid ${getTeamColor(job.teamId)}`,
                            }}
                          >
                            <div className="flex items-center gap-1 mb-0.5">
                              <Clock size={8} style={{ color: "var(--color-muted)" }} />
                              <span className="text-[9px] font-mono" style={{ color: "var(--color-muted)" }}>
                                {getTimeStr(job.scheduledFor)}
                              </span>
                            </div>
                            <p className="text-[10px] font-medium leading-tight" style={{ color: "var(--color-text)" }}>
                              {job.title}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Zap size={7} style={{ color: getTeamColor(job.teamId) }} />
                              <span className="text-[8px]" style={{ color: "var(--color-muted)" }}>
                                {job.teamName}
                              </span>
                              {job.recurring !== "none" && (
                                <span
                                  className="text-[7px] px-1 py-0 rounded font-medium ml-1"
                                  style={{ background: "rgba(99,102,241,0.08)", color: "#818cf8" }}
                                >
                                  {job.recurring}
                                </span>
                              )}
                              <span
                                className="text-[7px] px-1 py-0 rounded font-medium ml-auto"
                                style={{
                                  background:
                                    job.status === "completed" ? "var(--color-green-dim)" :
                                    job.status === "failed" ? "var(--color-red-dim)" :
                                    job.status === "running" ? "rgba(99,102,241,0.1)" :
                                    "rgba(100,116,139,0.1)",
                                  color:
                                    job.status === "completed" ? "var(--color-green)" :
                                    job.status === "failed" ? "var(--color-red)" :
                                    job.status === "running" ? "#818cf8" :
                                    "var(--color-muted)",
                                }}
                              >
                                {job.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── RECURRING TASKS TAB ── */}
      {activeTab === "recurring" && (
        <div className="flex flex-col gap-4">
          {/* Error state */}
          {recurringError && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "var(--color-red-dim)", border: "1px solid rgba(248,113,113,0.2)" }}
            >
              <AlertCircle size={15} style={{ color: "var(--color-red, #f87171)" }} />
              <p className="text-sm flex-1" style={{ color: "var(--color-red, #f87171)" }}>{recurringError}</p>
              <button
                onClick={fetchRecurringTasks}
                className="flex items-center gap-1 text-[11px]"
                style={{ color: "var(--color-red, #f87171)" }}
              >
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          )}

          {/* Loading state */}
          {recurringLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={22} className="animate-spin" style={{ color: "#818cf8" }} />
            </div>
          )}

          {/* Empty state */}
          {!recurringLoading && !recurringError && recurringTasks.length === 0 && (
            <div
              className="glass-card px-4 py-12 flex flex-col items-center gap-3"
              style={{ textAlign: "center" }}
            >
              <Repeat size={28} style={{ color: "var(--color-muted)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                No recurring tasks yet
              </p>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                Create cron-based tasks that run automatically on a schedule.
              </p>
              <button
                onClick={() => setShowRecurringModal(true)}
                className="btn-primary flex items-center gap-2 px-4 py-2 mt-1"
              >
                <Plus size={13} />
                New Recurring Task
              </button>
            </div>
          )}

          {/* Task list */}
          {!recurringLoading && recurringTasks.length > 0 && (
            <div className="flex flex-col gap-3">
              {recurringTasks.map((task) => (
                <div
                  key={task.id}
                  className="glass-card px-4 py-3 flex items-start gap-4"
                  style={{
                    borderLeft: `3px solid ${task.enabled ? "var(--color-green)" : "var(--color-muted)"}`,
                    opacity: task.enabled ? 1 : 0.7,
                  }}
                >
                  {/* Toggle */}
                  <button
                    onClick={() => toggleRecurringTask(task)}
                    disabled={togglingId === task.id}
                    title={task.enabled ? "Disable task" : "Enable task"}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: togglingId === task.id ? "wait" : "pointer",
                      color: task.enabled ? "var(--color-green)" : "var(--color-muted)",
                      flexShrink: 0,
                      paddingTop: "2px",
                    }}
                  >
                    {togglingId === task.id ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : task.enabled ? (
                      <ToggleRight size={20} />
                    ) : (
                      <ToggleLeft size={20} />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                        {task.title}
                      </span>
                      {/* Enabled/disabled badge */}
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: task.enabled ? "var(--color-green-dim, rgba(52,211,153,0.1))" : "rgba(100,116,139,0.1)",
                          color: task.enabled ? "var(--color-green)" : "var(--color-muted)",
                        }}
                      >
                        {task.enabled ? "enabled" : "disabled"}
                      </span>
                      {/* Team badge */}
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(99,102,241,0.08)", color: "#818cf8" }}
                      >
                        {task.team.name}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-muted)" }}>
                        {task.description}
                      </p>
                    )}

                    {/* Cron + timezone */}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Clock size={11} style={{ color: "var(--color-muted)" }} />
                        <code
                          className="text-[11px] font-mono"
                          style={{ color: "var(--color-yellow)" }}
                        >
                          {task.cron}
                        </code>
                      </div>
                      <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                        {task.timezone}
                      </span>
                    </div>

                    {/* Last run / Next run */}
                    <div className="flex items-center gap-4 mt-1.5 text-[11px]" style={{ color: "var(--color-muted)" }}>
                      <span>
                        Last run:{" "}
                        <span style={{ color: "var(--color-text)" }}>
                          {formatRunTime(task.lastRunAt)}
                        </span>
                      </span>
                      <span>
                        Next run:{" "}
                        <span style={{ color: task.nextRunAt ? "var(--color-green)" : "var(--color-text)" }}>
                          {formatRunTime(task.nextRunAt)}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteRecurringTask(task.id)}
                    disabled={deletingId === task.id}
                    title="Delete task"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: deletingId === task.id ? "wait" : "pointer",
                      color: "var(--color-muted)",
                      flexShrink: 0,
                      paddingTop: "2px",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-red, #f87171)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-muted)"; }}
                  >
                    {deletingId === task.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MEETINGS TAB ── */}
      {activeTab === "meetings" && (
        <div className="flex flex-col gap-4">
          {meetingsError && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "var(--color-red-dim)", border: "1px solid rgba(248,113,113,0.2)" }}
            >
              <AlertCircle size={15} style={{ color: "var(--color-red, #f87171)" }} />
              <p className="text-sm flex-1" style={{ color: "var(--color-red, #f87171)" }}>{meetingsError}</p>
              <button onClick={fetchMeetings} className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-red, #f87171)" }}>
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          )}

          {meetingsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={22} className="animate-spin" style={{ color: "#818cf8" }} />
            </div>
          )}

          {!meetingsLoading && !meetingsError && meetings.length === 0 && (
            <div className="glass-card px-4 py-12 flex flex-col items-center gap-3" style={{ textAlign: "center" }}>
              <Users size={28} style={{ color: "var(--color-muted)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>No meetings scheduled</p>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                Schedule meetings manually or ask the Coordinator agent to set one up for you.
              </p>
              <button
                onClick={() => setShowMeetingModal(true)}
                className="btn-primary flex items-center gap-2 px-4 py-2 mt-1"
              >
                <Plus size={13} />
                Schedule Meeting
              </button>
            </div>
          )}

          {!meetingsLoading && meetings.length > 0 && (
            <div className="flex flex-col gap-3">
              {meetings.map((meeting) => {
                const scheduledDate = new Date(meeting.scheduledFor);
                const isPast = scheduledDate < new Date();
                const minutesUntil = Math.round((scheduledDate.getTime() - Date.now()) / 60000);
                const isReminding = minutesUntil > 0 && minutesUntil <= meeting.reminderMins;

                return (
                  <div
                    key={meeting.id}
                    className="glass-card px-4 py-3 flex items-start gap-4"
                    style={{
                      borderLeft: `3px solid ${
                        meeting.status === "done" ? "var(--color-muted)"
                        : isReminding ? "var(--color-yellow)"
                        : "#818cf8"
                      }`,
                      opacity: meeting.status === "done" ? 0.65 : 1,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                          {meeting.title}
                        </span>
                        {meeting.status === "done" && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(100,116,139,0.1)", color: "var(--color-muted)" }}>done</span>
                        )}
                        {isReminding && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(251,191,36,0.15)", color: "var(--color-yellow)" }}>
                            <Bell size={9} /> {minutesUntil} min
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Clock size={11} style={{ color: "var(--color-muted)" }} />
                          <span className="text-[11px]" style={{ color: isPast && meeting.status !== "done" ? "var(--color-red, #f87171)" : "var(--color-muted)" }}>
                            {scheduledDate.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Bell size={10} style={{ color: "var(--color-muted)" }} />
                          <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>{meeting.reminderMins}m before</span>
                        </div>
                      </div>

                      {meeting.description && (
                        <p className="text-xs mt-1 truncate" style={{ color: "var(--color-muted)" }}>{meeting.description}</p>
                      )}

                      {meeting.participants && meeting.participants.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {meeting.participants.map((p, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                              style={{
                                background: p.type === "agent" ? "rgba(99,102,241,0.1)" : "rgba(52,211,153,0.1)",
                                color: p.type === "agent" ? "#818cf8" : "var(--color-green)",
                                border: `1px solid ${p.type === "agent" ? "rgba(129,140,248,0.2)" : "rgba(52,211,153,0.2)"}`,
                              }}
                            >
                              {p.type === "agent" ? <Bot size={9} /> : <UserPlus size={9} />}
                              {p.name}
                              {p.teamName && <span style={{ opacity: 0.7 }}> · {p.teamName}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
                      {meeting.status === "upcoming" && (
                        <button
                          onClick={() => markMeetingDone(meeting.id)}
                          title="Mark as done"
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "4px" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-green)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-muted)"; }}
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMeeting(meeting.id)}
                        disabled={deletingMeetingId === meeting.id}
                        title="Delete meeting"
                        style={{ background: "transparent", border: "none", cursor: deletingMeetingId === meeting.id ? "wait" : "pointer", color: "var(--color-muted)", padding: "4px" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-red, #f87171)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-muted)"; }}
                      >
                        {deletingMeetingId === meeting.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Schedule Meeting Modal ── */}
      {showMeetingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowMeetingModal(false)}
        >
          <form
            onSubmit={submitMeeting}
            className="glass-card p-6 animate-fade-in flex flex-col gap-4 overflow-y-auto"
            style={{ width: "min(480px, calc(100vw - 32px))", maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base" style={{ color: "var(--color-text)" }}>Schedule a Meeting</h2>
              <button type="button" onClick={() => setShowMeetingModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "4px" }}>
                <X size={18} />
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--color-muted)" }}>Title *</label>
              <input
                type="text"
                value={meetingForm.title}
                onChange={(e) => setMeetingForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Weekly team sync"
                required
                className="glass-input w-full px-3 py-2 text-sm"
                style={{ color: "var(--color-text)" }}
              />
            </div>

            {/* Date & Time */}
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--color-muted)" }}>Date &amp; Time *</label>
              <input
                type="datetime-local"
                value={meetingForm.scheduledFor}
                onChange={(e) => setMeetingForm((f) => ({ ...f, scheduledFor: e.target.value }))}
                required
                className="glass-input w-full px-3 py-2 text-sm"
                style={{ color: "var(--color-text)", colorScheme: "dark" }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--color-muted)" }}>Agenda <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <input
                type="text"
                value={meetingForm.description}
                onChange={(e) => setMeetingForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What's this meeting about?"
                className="glass-input w-full px-3 py-2 text-sm"
                style={{ color: "var(--color-text)" }}
              />
            </div>

            {/* Reminder */}
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--color-muted)" }}>Remind me</label>
              <select
                value={meetingForm.reminderMins}
                onChange={(e) => setMeetingForm((f) => ({ ...f, reminderMins: Number(e.target.value) }))}
                className="glass-input w-full px-3 py-2 text-sm"
                style={{ color: "var(--color-text)", colorScheme: "dark", background: "var(--color-surface-2)" }}
              >
                <option value={5}>5 minutes before</option>
                <option value={10}>10 minutes before</option>
                <option value={15}>15 minutes before</option>
                <option value={30}>30 minutes before</option>
                <option value={60}>1 hour before</option>
                <option value={120}>2 hours before</option>
                <option value={1440}>1 day before</option>
              </select>
            </div>

            {/* Participants */}
            <div>
              <label className="text-[11px] font-medium block mb-2" style={{ color: "var(--color-muted)" }}>Participants</label>

              {/* Human participant input */}
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={humanInput}
                  onChange={(e) => setHumanInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHumanParticipant(); } }}
                  placeholder="Add a person by name…"
                  className="glass-input flex-1 px-3 py-1.5 text-sm"
                  style={{ color: "var(--color-text)" }}
                />
                <button
                  type="button"
                  onClick={addHumanParticipant}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg"
                  style={{ background: "rgba(52,211,153,0.1)", color: "var(--color-green)", border: "1px solid rgba(52,211,153,0.2)" }}
                >
                  <UserPlus size={12} /> Add
                </button>
              </div>

              {/* Agent participant picker */}
              {agentOptions.length > 0 && (
                <div className="flex gap-2 mb-3">
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="glass-input flex-1 px-3 py-1.5 text-sm"
                    style={{ color: "var(--color-text)", colorScheme: "dark", background: "var(--color-surface-2)" }}
                  >
                    {agentOptions.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} · {a.teamName}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addAgentParticipant}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg"
                    style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.2)" }}
                  >
                    <Bot size={12} /> Add Agent
                  </button>
                </div>
              )}

              {/* Participant chips */}
              {meetingParticipants.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {meetingParticipants.map((p, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                      style={{
                        background: p.type === "agent" ? "rgba(99,102,241,0.12)" : "rgba(52,211,153,0.12)",
                        color: p.type === "agent" ? "#818cf8" : "var(--color-green)",
                        border: `1px solid ${p.type === "agent" ? "rgba(129,140,248,0.25)" : "rgba(52,211,153,0.25)"}`,
                      }}
                    >
                      {p.type === "agent" ? <Bot size={10} /> : <UserPlus size={10} />}
                      {p.name}
                      <button
                        type="button"
                        onClick={() => removeParticipant(p.name)}
                        style={{ background: "transparent", border: "none", cursor: "pointer", lineHeight: 1, padding: 0, marginLeft: "2px", opacity: 0.7 }}
                      >
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={meetingSubmitting || !meetingForm.title || !meetingForm.scheduledFor}
              className="btn-primary flex items-center justify-center gap-2 py-2.5 mt-1"
            >
              {meetingSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
              {meetingSubmitting ? "Scheduling…" : "Schedule Meeting"}
            </button>
          </form>
        </div>
      )}

      {/* ── Add Scheduled Job Modal ── */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowAddModal(false)}
        >
          <form
            onSubmit={submitJob}
            className="glass-card p-6 animate-fade-in"
            style={{ width: "420px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-base" style={{ color: "var(--color-text)" }}>
                Schedule a Job
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--color-muted)" }}>
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Weekly content review"
                  required
                  className="glass-input w-full px-3 py-2 text-sm"
                  style={{ color: "var(--color-text)" }}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--color-muted)" }}>
                  Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduledFor}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledFor: e.target.value }))}
                  required
                  className="glass-input w-full px-3 py-2 text-sm"
                  style={{ color: "var(--color-text)", colorScheme: "dark" }}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--color-muted)" }}>
                  Team
                </label>
                <select
                  value={form.teamId}
                  onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value }))}
                  required
                  className="glass-input w-full px-3 py-2 text-sm"
                  style={{ color: "var(--color-text)", colorScheme: "dark", background: "var(--color-surface-2)" }}
                >
                  {teams.length === 0 && (
                    <option value="" disabled>No teams available</option>
                  )}
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--color-muted)" }}>
                  Recurrence
                </label>
                <select
                  value={form.recurring}
                  onChange={(e) => setForm((f) => ({ ...f, recurring: e.target.value }))}
                  className="glass-input w-full px-3 py-2 text-sm"
                  style={{ color: "var(--color-text)", colorScheme: "dark", background: "var(--color-surface-2)" }}
                >
                  <option value="none">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting || !form.title || !form.scheduledFor || !form.teamId}
                className="btn-primary flex items-center justify-center gap-2 py-2.5 mt-1"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                {submitting ? "Scheduling..." : "Schedule Job"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── New Recurring Task Modal ── */}
      {showRecurringModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowRecurringModal(false)}
        >
          <form
            onSubmit={submitRecurringTask}
            className="glass-card p-6 animate-fade-in"
            style={{ width: "440px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-base" style={{ color: "var(--color-text)" }}>
                New Recurring Task
              </h2>
              <button
                type="button"
                onClick={() => setShowRecurringModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--color-muted)" }}>
                  Title
                </label>
                <input
                  type="text"
                  value={recurringForm.title}
                  onChange={(e) => setRecurringForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Daily standup summary"
                  required
                  className="glass-input w-full px-3 py-2 text-sm"
                  style={{ color: "var(--color-text)" }}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--color-muted)" }}>
                  Description <span style={{ fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={recurringForm.description}
                  onChange={(e) => setRecurringForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What does this task do?"
                  className="glass-input w-full px-3 py-2 text-sm"
                  style={{ color: "var(--color-text)" }}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--color-muted)" }}>
                  Cron expression
                </label>
                <input
                  type="text"
                  value={recurringForm.cron}
                  onChange={(e) => setRecurringForm((f) => ({ ...f, cron: e.target.value }))}
                  placeholder="e.g. 0 9 * * 1  (Mon 9am)"
                  required
                  className="glass-input w-full px-3 py-2 text-sm font-mono"
                  style={{ color: "var(--color-yellow)" }}
                />
                <p className="text-[10px] mt-1" style={{ color: "var(--color-muted)" }}>
                  Format: min hour day month weekday
                </p>
              </div>

              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--color-muted)" }}>
                  Timezone
                </label>
                <input
                  type="text"
                  value={recurringForm.timezone}
                  onChange={(e) => setRecurringForm((f) => ({ ...f, timezone: e.target.value }))}
                  placeholder="UTC"
                  className="glass-input w-full px-3 py-2 text-sm"
                  style={{ color: "var(--color-text)" }}
                />
              </div>

              <div>
                <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--color-muted)" }}>
                  Team
                </label>
                <select
                  value={recurringForm.teamId}
                  onChange={(e) => setRecurringForm((f) => ({ ...f, teamId: e.target.value }))}
                  required
                  className="glass-input w-full px-3 py-2 text-sm"
                  style={{ color: "var(--color-text)", colorScheme: "dark", background: "var(--color-surface-2)" }}
                >
                  {teams.length === 0 && (
                    <option value="" disabled>No teams available</option>
                  )}
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={recurringSubmitting || !recurringForm.title || !recurringForm.cron || !recurringForm.teamId}
                className="btn-primary flex items-center justify-center gap-2 py-2.5 mt-1"
              >
                {recurringSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Repeat size={14} />}
                {recurringSubmitting ? "Creating..." : "Create Recurring Task"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
