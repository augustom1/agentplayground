"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Workflow, Upload, Send, RefreshCw, Loader2, CheckCircle2,
  Clock, AlertCircle, ChevronDown, ChevronUp, FileText, X,
  BookOpen, MessageSquare, Paperclip, Play, Trash2,
} from "lucide-react";

interface Team { id: string; name: string }
interface PipelineJob {
  id: string;
  title: string;
  status: string;
  priority: string;
  teamName: string;
  createdAt: string;
  result: string | null;
  instructions: string;
  delivery: string[];
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending:   { icon: <Clock size={12} />,                              color: "var(--color-muted)",   label: "Queued" },
  running:   { icon: <Loader2 size={12} className="animate-spin" />,  color: "var(--color-yellow)",  label: "Processing" },
  completed: { icon: <CheckCircle2 size={12} />,                      color: "var(--color-green)",   label: "Done" },
  failed:    { icon: <AlertCircle size={12} />,                       color: "var(--color-red)",     label: "Failed" },
};

const DELIVERY_OPTIONS = [
  { id: "knowledge", label: "Knowledge Base", icon: BookOpen, desc: "Saved as a vault note" },
  { id: "chat",      label: "Reply in Chat",  icon: MessageSquare, desc: "Sent as a chat message" },
];

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function PipelinePage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [jobs, setJobs] = useState<PipelineJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [instructions, setInstructions] = useState("");
  const [teamId, setTeamId] = useState("");
  const [delivery, setDelivery] = useState<string[]>(["knowledge"]);
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadTeams = useCallback(async () => {
    const r = await fetch("/api/teams");
    if (r.ok) {
      const data: Team[] = await r.json();
      setTeams(data);
      if (data.length > 0) setTeamId(data[0].id);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const r = await fetch("/api/pipeline/queue");
      if (r.ok) setJobs((await r.json()).jobs ?? []);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => { loadTeams(); loadJobs(); }, [loadTeams, loadJobs]);

  function toggleDelivery(id: string) {
    setDelivery((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    const text = await f.text();
    setFileText(text);
    setContent(text.slice(0, 500) + (text.length > 500 ? "…" : ""));
  }

  function clearFile() {
    setFileText(null);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit() {
    if (!title.trim() || (!content.trim() && !fileText) || !teamId) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/pipeline/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: fileText ?? content.trim(),
          instructions: instructions.trim(),
          teamId,
          delivery,
        }),
      });
      if (r.ok) {
        setTitle(""); setContent(""); setInstructions("");
        clearFile();
        await loadJobs();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function runJob(jobId: string) {
    setRunningId(jobId);
    try {
      await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: jobId }),
      });
      await loadJobs();
    } finally {
      setRunningId(null);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--color-surface-2)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    color: "var(--color-text)",
    padding: "8px 12px",
    fontSize: 13,
    outline: "none",
    resize: "none",
  };

  return (
    <div className="flex h-full">
      {/* ── Submit Panel ── */}
      <div
        className="flex flex-col shrink-0 overflow-auto"
        style={{ width: 380, borderRight: "1px solid var(--color-border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3.5 shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <Workflow size={15} style={{ color: "var(--color-brand)" }} />
          <h1 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            New Pipeline Job
          </h1>
        </div>

        <div className="flex flex-col gap-4 p-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
              Job Title
            </label>
            <input
              style={inputStyle}
              placeholder="e.g. Summarise Q1 Report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* File upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
              File (optional)
            </label>
            {fileName ? (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
              >
                <Paperclip size={13} style={{ color: "var(--color-brand)", flexShrink: 0 }} />
                <span className="text-[12px] flex-1 truncate" style={{ color: "var(--color-text)" }}>{fileName}</span>
                <button onClick={clearFile} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: 2 }}>
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors"
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px dashed var(--color-border)",
                  color: "var(--color-muted)",
                  cursor: "pointer",
                  fontSize: 12,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-brand)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
              >
                <Upload size={13} />
                Upload .txt, .md, .pdf, or paste below
              </button>
            )}
            <input ref={fileRef} type="file" accept=".txt,.md,.pdf,.json,.csv" className="hidden" onChange={handleFile} />
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
              Content / Notes
            </label>
            <textarea
              style={{ ...inputStyle, minHeight: 100 }}
              placeholder="Paste text, notes, or a brief here…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Instructions */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
              Instructions
            </label>
            <textarea
              style={{ ...inputStyle, minHeight: 80 }}
              placeholder="What should your agents do with this? e.g. 'Summarise, extract action items, and draft a follow-up email.'"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>

          {/* Team */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
              Agent Team
            </label>
            <select
              style={{ ...inputStyle, appearance: "none" }}
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            >
              {teams.length === 0 && <option value="">No teams yet</option>}
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Delivery */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
              Deliver Output To
            </label>
            {DELIVERY_OPTIONS.map((opt) => {
              const active = delivery.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleDelivery(opt.id)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                  style={{
                    background: active ? "var(--color-brand-dim)" : "var(--color-surface-2)",
                    border: `1px solid ${active ? "var(--color-brand)" : "var(--color-border)"}`,
                    cursor: "pointer",
                  }}
                >
                  <opt.icon size={14} style={{ color: active ? "var(--color-brand)" : "var(--color-muted)", flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium" style={{ color: active ? "var(--color-text)" : "var(--color-muted)" }}>
                      {opt.label}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>{opt.desc}</p>
                  </div>
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                    style={{
                      background: active ? "var(--color-brand)" : "var(--color-surface)",
                      border: `1px solid ${active ? "var(--color-brand)" : "var(--color-border)"}`,
                    }}
                  >
                    {active && <CheckCircle2 size={9} style={{ color: "#fff" }} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Submit */}
          <button
            onClick={submit}
            disabled={submitting || !title.trim() || (!content.trim() && !fileText) || !teamId}
            className="btn-primary flex items-center justify-center gap-2 py-2.5 text-sm font-medium disabled:opacity-50"
            style={{ borderRadius: 8 }}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {submitting ? "Submitting…" : "Submit Job"}
          </button>
        </div>
      </div>

      {/* ── Queue Panel ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3.5 shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <FileText size={14} style={{ color: "var(--color-muted)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Pipeline Queue
            </h2>
            {jobs.length > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--color-surface-2)", color: "var(--color-muted)", border: "1px solid var(--color-border)" }}
              >
                {jobs.length}
              </span>
            )}
          </div>
          <button onClick={loadJobs} className="p-1.5 rounded hover:opacity-70">
            <RefreshCw size={12} className={loadingJobs ? "animate-spin" : ""} style={{ color: "var(--color-muted)" }} />
          </button>
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-auto">
          {loadingJobs ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={18} className="animate-spin" style={{ color: "var(--color-muted)" }} />
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <Workflow size={36} style={{ color: "var(--color-border)" }} />
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>No jobs yet</p>
              <p className="text-[11px]" style={{ color: "var(--color-border)" }}>
                Submit a file or note on the left and your agent team will process it.
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
              {jobs.map((job) => {
                const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending;
                const isExpanded = expanded === job.id;
                return (
                  <div key={job.id} style={{ borderColor: "var(--color-border)" }}>
                    <div
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setExpanded(isExpanded ? null : job.id)}
                    >
                      {/* Status icon */}
                      <div className="mt-0.5 shrink-0" style={{ color: cfg.color }}>
                        {runningId === job.id ? <Loader2 size={12} className="animate-spin" /> : cfg.icon}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: "var(--color-text)" }}>
                          {job.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--color-surface-2)", color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                            {cfg.label}
                          </span>
                          <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>{job.teamName}</span>
                          <span className="text-[10px]" style={{ color: "var(--color-border)" }}>·</span>
                          <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>{timeAgo(job.createdAt)}</span>
                        </div>
                        {/* Delivery tags */}
                        {job.delivery?.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {job.delivery.map((d) => (
                              <span key={d} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--color-surface-3)", color: "var(--color-muted)" }}>
                                {d === "knowledge" ? "→ Knowledge" : "→ Chat"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {job.status === "pending" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); runJob(job.id); }}
                            disabled={runningId === job.id}
                            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                            style={{ background: "var(--color-brand-dim)", color: "var(--color-brand)", border: "1px solid var(--color-brand)40" }}
                          >
                            {runningId === job.id ? <Loader2 size={9} className="animate-spin" /> : <Play size={9} />}
                            Run
                          </button>
                        )}
                        {isExpanded ? <ChevronUp size={13} style={{ color: "var(--color-muted)" }} /> : <ChevronDown size={13} style={{ color: "var(--color-muted)" }} />}
                      </div>
                    </div>

                    {/* Expanded: instructions + result */}
                    {isExpanded && (
                      <div className="px-4 pb-4 flex flex-col gap-3" style={{ borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
                        {job.instructions && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--color-muted)" }}>Instructions</p>
                            <p className="text-[12px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{job.instructions}</p>
                          </div>
                        )}
                        {job.result ? (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--color-green)" }}>Output</p>
                            <div
                              className="text-[12px] leading-relaxed whitespace-pre-wrap rounded-lg p-3"
                              style={{ background: "var(--color-surface-2)", color: "var(--color-text)", border: "1px solid var(--color-border)", maxHeight: 300, overflowY: "auto" }}
                            >
                              {job.result}
                            </div>
                          </div>
                        ) : job.status === "pending" ? (
                          <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                            Click <strong style={{ color: "var(--color-text)" }}>Run</strong> above to process this job.
                          </p>
                        ) : job.status === "running" ? (
                          <div className="flex items-center gap-2">
                            <Loader2 size={12} className="animate-spin" style={{ color: "var(--color-yellow)" }} />
                            <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>Processing…</p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
