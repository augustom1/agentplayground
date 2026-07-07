"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Plus, Loader2, Clock, Repeat, CheckCircle2, XCircle } from "lucide-react";

type PlaygroundData = {
  id: string;
  name: string;
  teamIds: string[];
};

type TeamItem = { id: string; name: string };

type ScheduledJob = {
  id: string;
  title: string;
  description: string | null;
  scheduledFor: string;
  recurring: string;
  status: string;
  teamId: string;
  teamName: string;
};

const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
  textTransform: "uppercase", color: "var(--color-muted)",
  marginBottom: 6, display: "block",
};

const INPUT: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13,
  background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
  color: "var(--color-text)", outline: "none", boxSizing: "border-box",
};

function fmtWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function PlaygroundSchedulePage() {
  const { id } = useParams<{ id: string }>();

  const [playground, setPlayground] = useState<PlaygroundData | null>(null);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState("");
  const [recurring, setRecurring] = useState("none");
  const [teamId, setTeamId] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [pgRes, teamsRes, jobsRes] = await Promise.all([
        fetch(`/api/playgrounds/${id}`),
        fetch("/api/teams"),
        fetch("/api/schedule"),
      ]);
      if (!pgRes.ok) return;
      const pg = await pgRes.json() as PlaygroundData;
      setPlayground(pg);

      const teamIdSet = new Set(pg.teamIds);
      const allTeams = teamsRes.ok ? await teamsRes.json() as TeamItem[] : [];
      const scopedTeams = allTeams.filter(t => teamIdSet.has(t.id));
      setTeams(scopedTeams);
      if (scopedTeams.length > 0) setTeamId(prev => prev || scopedTeams[0].id);

      const allJobs = jobsRes.ok ? await jobsRes.json() as ScheduledJob[] : [];
      setJobs(allJobs.filter(j => teamIdSet.has(j.teamId)));
    } catch { /* non-fatal */ } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const createJob = async () => {
    if (!title.trim() || !when || !teamId) {
      setFormError("Title, date and team are required.");
      return;
    }
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    setCreating(true);
    setFormError(null);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          scheduledFor: new Date(when).toISOString(),
          recurring,
          teamId: team.id,
          teamName: team.name,
        }),
      });
      if (!res.ok) throw new Error();
      setTitle(""); setDescription(""); setWhen(""); setRecurring("none");
      setShowForm(false);
      await load();
    } catch {
      setFormError("Failed to create the job.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: 8, color: "var(--color-muted)" }}>
        <Loader2 size={16} className="animate-spin" />
        <span style={{ fontSize: 13 }}>Loading…</span>
      </div>
    );
  }

  if (!playground) {
    return <div style={{ padding: 32, color: "var(--color-muted)", fontSize: 14 }}>Playground not found.</div>;
  }

  const upcoming = jobs
    .filter(j => j.status === "pending" || j.status === "running")
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
  const past = jobs
    .filter(j => j.status === "completed" || j.status === "failed")
    .sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime())
    .slice(0, 8);

  return (
    <div style={{ padding: "20px 24px", maxWidth: 760, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <CalendarDays size={16} style={{ color: "var(--color-brand)" }} />
          Schedule
        </h1>
        {teams.length > 0 && (
          <button
            onClick={() => setShowForm(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8,
              border: "none", background: "var(--color-brand)", color: "#0a1628",
              cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}
          >
            <Plus size={12} /> New job
          </button>
        )}
      </div>
      <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "0 0 18px" }}>
        Jobs for the teams in {playground.name} only. The global schedule lives in Overview.
      </p>

      {teams.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", border: "1px dashed var(--color-border)", borderRadius: 12 }}>
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
            No teams assigned to this playground yet, so there is nothing to schedule.
          </p>
          <Link
            href={`/playground/${id}/settings`}
            style={{ display: "inline-block", marginTop: 10, fontSize: 12, fontWeight: 500, color: "var(--color-brand)", textDecoration: "none" }}
          >
            Add teams in Settings
          </Link>
        </div>
      )}

      {showForm && (
        <div style={{ padding: 16, borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-surface-2)", marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={LABEL}>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What should happen" style={INPUT} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={LABEL}>Description (optional)</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Details for the team" style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>When</label>
              <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Repeats</label>
              <select value={recurring} onChange={e => setRecurring(e.target.value)} style={INPUT}>
                <option value="none">Never</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={LABEL}>Team</label>
              <select value={teamId} onChange={e => setTeamId(e.target.value)} style={INPUT}>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          {formError && <p style={{ fontSize: 12, color: "var(--color-red, #ef4444)", margin: "0 0 10px" }}>{formError}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              onClick={() => setShowForm(false)}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)" }}
            >
              Cancel
            </button>
            <button
              onClick={createJob}
              disabled={creating}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8,
                border: "none", background: "var(--color-brand)", color: "#0a1628",
                cursor: creating ? "wait" : "pointer", fontSize: 12, fontWeight: 600,
              }}
            >
              {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Create job
            </button>
          </div>
        </div>
      )}

      {teams.length > 0 && (
        <>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted)", margin: "0 0 8px" }}>
            Upcoming ({upcoming.length})
          </p>
          {upcoming.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "0 0 20px" }}>Nothing scheduled for this playground.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              {upcoming.map(job => (
                <div key={job.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                  <Clock size={13} style={{ color: "var(--color-brand)", flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text)", margin: 0 }}>{job.title}</p>
                    <p style={{ fontSize: 11, color: "var(--color-muted)", margin: "2px 0 0" }}>
                      {fmtWhen(job.scheduledFor)} · {job.teamName}
                    </p>
                    {job.description && (
                      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>{job.description}</p>
                    )}
                  </div>
                  {job.recurring !== "none" && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--color-muted)", flexShrink: 0, padding: "2px 8px", borderRadius: 999, background: "var(--color-surface-3)" }}>
                      <Repeat size={9} /> {job.recurring}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {past.length > 0 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted)", margin: "0 0 8px" }}>
                Recent
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {past.map(job => (
                  <div key={job.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "var(--color-surface-2)" }}>
                    {job.status === "completed"
                      ? <CheckCircle2 size={12} style={{ color: "var(--color-green, #22c55e)", flexShrink: 0 }} />
                      : <XCircle size={12} style={{ color: "var(--color-red, #ef4444)", flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: "var(--color-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.title}</p>
                      <p style={{ fontSize: 11, color: "var(--color-muted)", margin: 0 }}>{fmtWhen(job.scheduledFor)} · {job.teamName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
