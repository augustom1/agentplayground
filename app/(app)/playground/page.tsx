"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderOpen, Calendar, Workflow, ArrowRight, Clock,
  CheckCircle2, PauseCircle, AlertCircle, Users,
} from "lucide-react";

type Meeting = {
  id: string;
  title: string;
  scheduledFor: string;
  participants: string[];
  status: string;
};

type Project = {
  id: string;
  name: string;
  status: "active" | "paused" | "completed" | "archived";
  description: string | null;
};

function minutesUntil(dateStr: string) {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 60000);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  active:    <CheckCircle2 size={12} style={{ color: "var(--color-green)" }} />,
  paused:    <PauseCircle  size={12} style={{ color: "var(--color-yellow)" }} />,
  completed: <CheckCircle2 size={12} style={{ color: "var(--color-muted)" }} />,
  archived:  <AlertCircle  size={12} style={{ color: "var(--color-muted)" }} />,
};

export default function PlaygroundPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [mRes, pRes] = await Promise.all([
          fetch("/api/meetings?upcoming=true"),
          fetch("/api/projects"),
        ]);
        if (mRes.ok) setMeetings(await mRes.json());
        if (pRes.ok) {
          const all: Project[] = await pRes.json();
          setProjects(all.filter(p => p.status === "active" || p.status === "paused").slice(0, 5));
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const hubs = [
    {
      href: "/projects",
      label: "Projects",
      desc: "Track goals and long-running work across your teams.",
      icon: FolderOpen,
      color: "var(--color-brand)",
    },
    {
      href: "/schedule",
      label: "Schedule & Events",
      desc: "Manage meetings, reminders, and recurring agent tasks.",
      icon: Calendar,
      color: "var(--color-green)",
    },
    {
      href: "/pipeline",
      label: "Work Queue",
      desc: "Submit documents and content for your agents to process.",
      icon: Workflow,
      color: "var(--color-yellow)",
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Your Playground</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
          Where you and your agents get work done.
        </p>
      </div>

      {/* Hub cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {hubs.map(({ href, label, desc, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="glass-card p-4 rounded-xl flex flex-col gap-3 group transition-all hover:shadow-md"
            style={{ border: "1px solid var(--color-border)", textDecoration: "none" }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: `${color}20` }}
            >
              <Icon size={20} style={{ color }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{label}</p>
              <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: "var(--color-muted)" }}>{desc}</p>
            </div>
            <div className="flex items-center gap-1 text-[12px] font-medium" style={{ color }}>
              Open <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>

      {/* Upcoming meetings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Upcoming Meetings</h2>
          <Link href="/schedule" className="text-[12px]" style={{ color: "var(--color-brand)", textDecoration: "none" }}>
            See all →
          </Link>
        </div>
        {loading ? (
          <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>Loading...</p>
        ) : meetings.length === 0 ? (
          <div
            className="glass-card rounded-xl p-4 text-center"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>
              No upcoming meetings. Schedule one from the Schedule page or by chatting with your Coordinator.
            </p>
            <Link
              href="/schedule"
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-[12px] font-medium"
              style={{ background: "var(--color-brand-dim)", color: "var(--color-brand)", textDecoration: "none" }}
            >
              <Calendar size={13} /> Schedule a meeting
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {meetings.slice(0, 4).map((m) => {
              const mins = minutesUntil(m.scheduledFor);
              const soon = mins >= 0 && mins <= 30;
              return (
                <div
                  key={m.id}
                  className="glass-card rounded-xl px-4 py-3 flex items-center gap-3"
                  style={{ border: `1px solid ${soon ? "var(--color-yellow)" : "var(--color-border)"}` }}
                >
                  <Clock size={14} style={{ color: soon ? "var(--color-yellow)" : "var(--color-muted)", flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-text)" }}>{m.title}</p>
                    <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>{formatDate(m.scheduledFor)}</p>
                  </div>
                  {m.participants.length > 0 && (
                    <div className="flex items-center gap-1" style={{ color: "var(--color-muted)" }}>
                      <Users size={11} />
                      <span className="text-[11px]">{m.participants.length}</span>
                    </div>
                  )}
                  {soon && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "var(--color-yellow-dim, rgba(234,179,8,0.15))", color: "var(--color-yellow)" }}
                    >
                      Soon
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Active Projects</h2>
          <Link href="/projects" className="text-[12px]" style={{ color: "var(--color-brand)", textDecoration: "none" }}>
            Manage →
          </Link>
        </div>
        {loading ? (
          <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>Loading...</p>
        ) : projects.length === 0 ? (
          <div
            className="glass-card rounded-xl p-4 text-center"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>
              No active projects yet. Create one to start tracking goals with your agent teams.
            </p>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-[12px] font-medium"
              style={{ background: "var(--color-brand-dim)", color: "var(--color-brand)", textDecoration: "none" }}
            >
              <FolderOpen size={13} /> Create a project
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {projects.map((p) => (
              <Link
                key={p.id}
                href="/projects"
                className="glass-card rounded-xl px-4 py-3 flex items-center gap-3 group"
                style={{ border: "1px solid var(--color-border)", textDecoration: "none" }}
              >
                <div>{STATUS_ICON[p.status]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-text)" }}>{p.name}</p>
                  {p.description && (
                    <p className="text-[11px] truncate" style={{ color: "var(--color-muted)" }}>{p.description}</p>
                  )}
                </div>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize"
                  style={{
                    background: p.status === "active" ? "rgba(34,197,94,0.12)" : "var(--color-surface-2)",
                    color: p.status === "active" ? "var(--color-green)" : "var(--color-muted)",
                  }}
                >
                  {p.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
