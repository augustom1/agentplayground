"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardList, Plus, ChevronRight, CheckCircle2, XCircle,
  Clock, Loader2, AlertTriangle, PlayCircle, Ban
} from "lucide-react";

type PlanStatus =
  | "DRAFT" | "COUNCIL_REVIEW" | "PENDING_APPROVAL"
  | "APPROVED" | "RUNNING" | "BLOCKED" | "DONE" | "REJECTED";

interface PlanSummary {
  id: string;
  title: string;
  description: string;
  status: PlanStatus;
  riskFlags: string[];
  createdAt: string;
  tasks: { id: string; status: string }[];
}

const STATUS_CONFIG: Record<PlanStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT:            { label: "Draft",           color: "var(--color-muted)",        icon: <Clock size={12} /> },
  COUNCIL_REVIEW:   { label: "Council Review",  color: "#6366f1",                   icon: <Loader2 size={12} className="animate-spin" /> },
  PENDING_APPROVAL: { label: "Awaiting Approval", color: "#f59e0b",                 icon: <AlertTriangle size={12} /> },
  APPROVED:         { label: "Approved",        color: "#10b981",                   icon: <CheckCircle2 size={12} /> },
  RUNNING:          { label: "Running",         color: "#3b82f6",                   icon: <PlayCircle size={12} /> },
  BLOCKED:          { label: "Blocked",         color: "#ef4444",                   icon: <Ban size={12} /> },
  DONE:             { label: "Done",            color: "#10b981",                   icon: <CheckCircle2 size={12} /> },
  REJECTED:         { label: "Rejected",        color: "var(--color-muted)",        icon: <XCircle size={12} /> },
};

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [goal, setGoal] = useState("");

  useEffect(() => { loadPlans(); }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      const res = await fetch("/api/plans");
      if (res.ok) setPlans(await res.json() as PlanSummary[]);
    } finally {
      setLoading(false);
    }
  }

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      const data = await res.json() as { planId: string };
      if (data.planId) {
        setGoal("");
        await loadPlans();
        window.location.href = `/plans/${data.planId}`;
      }
    } finally {
      setCreating(false);
    }
  }

  const pendingApproval = plans.filter((p) => p.status === "PENDING_APPROVAL");
  const active = plans.filter((p) => ["RUNNING", "APPROVED", "BLOCKED"].includes(p.status));
  const rest = plans.filter((p) => !["PENDING_APPROVAL", "RUNNING", "APPROVED", "BLOCKED"].includes(p.status));

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList size={20} style={{ color: "var(--color-brand)" }} />
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Plans</h1>
        <span className="text-sm ml-auto" style={{ color: "var(--color-muted)" }}>
          {plans.length} plan{plans.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Create new plan */}
      <form onSubmit={createPlan} className="mb-6 p-4 rounded-xl border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
        <p className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>New plan</p>
        <div className="flex gap-2">
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Describe a goal (e.g. 'Write and publish a blog post about AI agents')"
            className="flex-1 px-3 py-2 rounded-lg text-sm border"
            style={{
              background: "var(--color-bg)",
              borderColor: "var(--color-border)",
              color: "var(--color-text)",
            }}
            disabled={creating}
          />
          <button
            type="submit"
            disabled={creating || !goal.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: "var(--color-brand)", color: "#fff" }}
          >
            {creating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Planning…</span>
              </>
            ) : (
              <>
                <Plus size={14} />
                <span>Create</span>
              </>
            )}
          </button>
        </div>
        {creating && (
          <p className="mt-2 text-xs" style={{ color: "var(--color-muted)" }}>
            The Keeper is drafting a plan and running Council review. This takes ~30 seconds…
          </p>
        )}
      </form>

      {loading ? (
        <div className="flex items-center gap-2 py-8 justify-center" style={{ color: "var(--color-muted)" }}>
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading plans…</span>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12" style={{ color: "var(--color-muted)" }}>
          <ClipboardList size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No plans yet. Enter a goal above and the Keeper will create one.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {pendingApproval.length > 0 && (
            <PlanSection title="Awaiting your approval" plans={pendingApproval} highlight />
          )}
          {active.length > 0 && (
            <PlanSection title="In progress" plans={active} />
          )}
          {rest.length > 0 && (
            <PlanSection title="All plans" plans={rest} />
          )}
        </div>
      )}
    </div>
  );
}

function PlanSection({ title, plans, highlight }: { title: string; plans: PlanSummary[]; highlight?: boolean }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted)", letterSpacing: "0.08em" }}>
        {title}
      </h2>
      <div className="flex flex-col gap-2">
        {plans.map((p) => <PlanCard key={p.id} plan={p} highlight={highlight} />)}
      </div>
    </div>
  );
}

function PlanCard({ plan, highlight }: { plan: PlanSummary; highlight?: boolean }) {
  const cfg = STATUS_CONFIG[plan.status] ?? STATUS_CONFIG.DRAFT;
  const doneCount = plan.tasks.filter((t) => t.status === "DONE").length;

  return (
    <Link
      href={`/plans/${plan.id}`}
      className="flex items-start gap-3 p-4 rounded-xl border transition-all"
      style={{
        borderColor: highlight ? "#f59e0b40" : "var(--color-border)",
        background: highlight ? "#f59e0b08" : "var(--color-surface)",
        textDecoration: "none",
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{plan.title}</span>
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{ color: cfg.color, background: `${cfg.color}18` }}
          >
            {cfg.icon}
            {cfg.label}
          </span>
        </div>
        <p className="text-xs line-clamp-2 mb-2" style={{ color: "var(--color-muted)" }}>
          {plan.description}
        </p>
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--color-muted)" }}>
          <span>{plan.tasks.length} task{plan.tasks.length !== 1 ? "s" : ""}</span>
          {plan.tasks.length > 0 && <span>{doneCount}/{plan.tasks.length} done</span>}
          {plan.riskFlags.length > 0 && (
            <span className="flex items-center gap-1" style={{ color: "#f59e0b" }}>
              <AlertTriangle size={10} />
              {plan.riskFlags.length} risk{plan.riskFlags.length !== 1 ? "s" : ""}
            </span>
          )}
          <span className="ml-auto">{new Date(plan.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      <ChevronRight size={14} style={{ color: "var(--color-muted)", flexShrink: 0, marginTop: 2 }} />
    </Link>
  );
}
