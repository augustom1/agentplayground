"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, XCircle, MessageSquare, AlertTriangle, ChevronLeft,
  Loader2, PlayCircle, Ban, Clock, ChevronDown, ChevronUp,
  RefreshCw, Bot, ArrowRight
} from "lucide-react";

type PlanStatus =
  | "DRAFT" | "COUNCIL_REVIEW" | "PENDING_APPROVAL"
  | "APPROVED" | "RUNNING" | "BLOCKED" | "DONE" | "REJECTED";

type TaskStatus = "PENDING" | "RUNNING" | "BLOCKED" | "DONE" | "FAILED";

interface PlanTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  teamId: string;
  team: { id: string; name: string };
  dependencies: string[];
  result?: string;
  blockedBy?: string;
  estimatedDuration?: string;
}

interface Plan {
  id: string;
  title: string;
  description: string;
  status: PlanStatus;
  councilNotes?: string;
  riskFlags: string[];
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  tasks: PlanTask[];
}

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: "Pending",  color: "var(--color-muted)", icon: <Clock size={12} /> },
  RUNNING: { label: "Running",  color: "#3b82f6",            icon: <Loader2 size={12} className="animate-spin" /> },
  BLOCKED: { label: "Blocked",  color: "#ef4444",            icon: <Ban size={12} /> },
  DONE:    { label: "Done",     color: "#10b981",            icon: <CheckCircle2 size={12} /> },
  FAILED:  { label: "Failed",   color: "#ef4444",            icon: <XCircle size={12} /> },
};

const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  DRAFT: "Draft",
  COUNCIL_REVIEW: "Council Review",
  PENDING_APPROVAL: "Awaiting Approval",
  APPROVED: "Approved",
  RUNNING: "Running",
  BLOCKED: "Blocked",
  DONE: "Done",
  REJECTED: "Rejected",
};

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState("");
  const [showCouncil, setShowCouncil] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans/${planId}`);
      if (res.ok) setPlan(await res.json() as Plan);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => { load(); }, [load]);

  // Poll while running
  useEffect(() => {
    if (plan?.status !== "RUNNING" && plan?.status !== "COUNCIL_REVIEW") return;
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [plan?.status, load]);

  async function doAction(action: "approve" | "reject" | "request_changes") {
    setActing(true);
    try {
      const res = await fetch(`/api/plans/${planId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: actionFeedback }),
      });
      if (res.ok) {
        await load();
        if (action === "approve") setActionFeedback("");
      }
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2" style={{ color: "var(--color-muted)" }}>
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading plan…</span>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6 text-center" style={{ color: "var(--color-muted)" }}>
        <p>Plan not found.</p>
        <Link href="/plans" className="text-sm mt-2 inline-block" style={{ color: "var(--color-brand)" }}>← Back to plans</Link>
      </div>
    );
  }

  const isAwaitingApproval = plan.status === "PENDING_APPROVAL";
  const isRunning = plan.status === "RUNNING";
  const isDone = plan.status === "DONE";
  const doneCount = plan.tasks.filter((t) => t.status === "DONE").length;
  const progress = plan.tasks.length > 0 ? Math.round((doneCount / plan.tasks.length) * 100) : 0;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <Link href="/plans" className="nav-hover flex items-center gap-1 text-sm" style={{ color: "var(--color-muted)", textDecoration: "none" }}>
          <ChevronLeft size={14} />
          <span>Plans</span>
        </Link>
        <span style={{ color: "var(--color-border)" }}>/</span>
        <span className="text-sm truncate" style={{ color: "var(--color-text)" }}>{plan.title}</span>
        <button onClick={load} className="ml-auto nav-hover p-1 rounded" title="Refresh" style={{ color: "var(--color-muted)", background: "none", border: "none", cursor: "pointer" }}>
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Plan header card */}
      <div className="p-5 rounded-xl border mb-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
        <div className="flex items-start gap-3 flex-wrap mb-3">
          <h1 className="text-lg font-semibold flex-1" style={{ color: "var(--color-text)" }}>{plan.title}</h1>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium shrink-0"
            style={{
              background: isAwaitingApproval ? "#f59e0b18" : isDone ? "#10b98118" : isRunning ? "#3b82f618" : "var(--color-brand-dim)",
              color: isAwaitingApproval ? "#f59e0b" : isDone ? "#10b981" : isRunning ? "#3b82f6" : "var(--color-brand)",
            }}
          >
            {PLAN_STATUS_LABELS[plan.status]}
          </span>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--color-muted)" }}>{plan.description}</p>

        {/* Progress bar when running */}
        {(isRunning || isDone) && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1" style={{ color: "var(--color-muted)" }}>
              <span>Progress</span>
              <span>{doneCount}/{plan.tasks.length} tasks done</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: isDone ? "#10b981" : "var(--color-brand)" }}
              />
            </div>
          </div>
        )}

        {/* Risk flags */}
        {plan.riskFlags.length > 0 && (
          <div className="flex flex-col gap-1 mt-3">
            {plan.riskFlags.map((flag, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: "#f59e0b" }}>
                <AlertTriangle size={11} />
                <span>{flag}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approval gate — only when pending */}
      {isAwaitingApproval && (
        <div className="p-4 rounded-xl border mb-4" style={{ borderColor: "#f59e0b40", background: "#f59e0b08" }}>
          <p className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>
            Review the plan above, then approve or request changes.
          </p>
          <textarea
            value={actionFeedback}
            onChange={(e) => setActionFeedback(e.target.value)}
            placeholder="Optional: feedback for changes or rejection reason…"
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm border mb-3 resize-none"
            style={{
              background: "var(--color-bg)",
              borderColor: "var(--color-border)",
              color: "var(--color-text)",
            }}
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => doAction("approve")}
              disabled={acting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity"
              style={{ background: "#10b981", color: "#fff" }}
            >
              {acting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Approve & dispatch
            </button>
            <button
              onClick={() => doAction("request_changes")}
              disabled={acting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity"
              style={{ background: "var(--color-brand-dim)", color: "var(--color-brand)" }}
            >
              <MessageSquare size={13} />
              Request changes
            </button>
            <button
              onClick={() => doAction("reject")}
              disabled={acting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity"
              style={{ background: "#ef444418", color: "#ef4444" }}
            >
              <XCircle size={13} />
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Tasks */}
      <div className="mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted)", letterSpacing: "0.08em" }}>
          Tasks ({plan.tasks.length})
        </h2>
        <div className="flex flex-col gap-2">
          {plan.tasks.map((task, i) => (
            <TaskCard
              key={task.id}
              task={task}
              index={i}
              allTasks={plan.tasks}
              expanded={expandedTask === task.id}
              onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
            />
          ))}
          {plan.tasks.length === 0 && (
            <p className="text-sm py-4 text-center" style={{ color: "var(--color-muted)" }}>
              No tasks yet. This plan may still be generating.
            </p>
          )}
        </div>
      </div>

      {/* Council notes */}
      {plan.councilNotes && (
        <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: "var(--color-border)" }}>
          <button
            onClick={() => setShowCouncil(!showCouncil)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
            style={{ background: "var(--color-surface)", color: "var(--color-text)", border: "none", cursor: "pointer" }}
          >
            <div className="flex items-center gap-2">
              <Bot size={13} style={{ color: "var(--color-brand)" }} />
              <span>Council notes</span>
            </div>
            {showCouncil ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showCouncil && (
            <div className="px-4 py-3" style={{ background: "var(--color-bg)" }}>
              <pre className="text-xs whitespace-pre-wrap font-mono" style={{ color: "var(--color-muted)" }}>
                {plan.councilNotes.slice(0, 5000)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Rejection info */}
      {plan.status === "REJECTED" && plan.rejectionReason && (
        <div className="p-4 rounded-xl border" style={{ borderColor: "#ef444440", background: "#ef444408" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "#ef4444" }}>Rejection reason</p>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>{plan.rejectionReason}</p>
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task, index, allTasks, expanded, onToggle
}: {
  task: PlanTask;
  index: number;
  allTasks: PlanTask[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = TASK_STATUS_CONFIG[task.status] ?? TASK_STATUS_CONFIG.PENDING;
  const depTasks = allTasks.filter((t) => task.dependencies.includes(t.id));

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left"
        style={{ background: "var(--color-surface)", border: "none", cursor: "pointer" }}
      >
        <span className="text-xs font-mono w-5 shrink-0 text-right" style={{ color: "var(--color-muted)" }}>
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{task.title}</span>
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0"
              style={{ color: cfg.color, background: `${cfg.color}18` }}
            >
              {cfg.icon}
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: "var(--color-muted)" }}>
            <span>{task.team.name}</span>
            {depTasks.length > 0 && (
              <span className="flex items-center gap-1">
                <ArrowRight size={9} />
                after {depTasks.map((d) => d.title).join(", ")}
              </span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={13} style={{ color: "var(--color-muted)", flexShrink: 0 }} /> : <ChevronDown size={13} style={{ color: "var(--color-muted)", flexShrink: 0 }} />}
      </button>

      {expanded && (
        <div className="px-4 py-3 border-t" style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}>
          <p className="text-sm mb-3" style={{ color: "var(--color-muted)" }}>{task.description}</p>
          {task.estimatedDuration && (
            <p className="text-xs mb-2" style={{ color: "var(--color-muted)" }}>
              <strong>Est. duration:</strong> {task.estimatedDuration}
            </p>
          )}
          {task.result && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "#10b981" }}>Result</p>
              <div className="p-3 rounded-lg text-xs overflow-auto max-h-60" style={{ background: "var(--color-surface)", color: "var(--color-text)", whiteSpace: "pre-wrap" }}>
                {task.result}
              </div>
            </div>
          )}
          {task.blockedBy && task.status !== "DONE" && (
            <div className="mt-2">
              <p className="text-xs font-semibold mb-1" style={{ color: "#ef4444" }}>Blocked reason</p>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>{task.blockedBy}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
