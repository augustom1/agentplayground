"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Clock, Loader2, Tag, ChevronDown, ChevronUp, Snooze } from "lucide-react";
import Link from "next/link";

type Priority = "high" | "normal" | "low";
type Status = "open" | "snoozed" | "done";

type Action = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: Status;
  createdAt: string;
};

const PRIORITY_COLORS: Record<Priority, string> = {
  high:   "#e05252",
  normal: "var(--color-accent)",
  low:    "var(--color-muted)",
};

const CATEGORY_LABELS: Record<string, string> = {
  business:  "Business",
  cv:        "CV / Career",
  education: "Education",
  technical: "Technical",
  general:   "General",
};

const TABS: { id: Status | "all"; label: string }[] = [
  { id: "open",    label: "Open" },
  { id: "snoozed", label: "Snoozed" },
  { id: "done",    label: "Done" },
];

export default function ActionsPage() {
  const [tab, setTab]         = useState<Status | "all">("open");
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => { loadActions(); }, [tab]);

  async function loadActions() {
    setLoading(true);
    try {
      const res = await fetch(`/api/actions?status=${tab}`);
      if (res.ok) setActions(await res.json() as Action[]);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  async function updateStatus(id: string, status: Status) {
    setUpdating(id);
    try {
      await fetch(`/api/actions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setActions((prev) => prev.filter((a) => a.id !== id));
    } catch { /* silent */ }
    finally { setUpdating(null); }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const openCount = actions.filter((a) => a.status === "open").length;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
          Actions
          {openCount > 0 && (
            <span style={{ background: "#e05252", color: "#fff", fontSize: "11px", fontWeight: 700, borderRadius: 99, padding: "1px 7px" }}>
              {openCount}
            </span>
          )}
        </h1>
      </div>
      <p className="text-[13px] mb-5" style={{ color: "var(--color-muted)" }}>
        Items the coordinator needs you to provide, approve, or decide.
        Go to <Link href="/chat" className="underline" style={{ color: "var(--color-accent)" }}>Chat</Link> to work through them.
      </p>

      {/* Tab bar */}
      <div className="flex gap-1 mb-5" style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: 0 }}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="px-3 py-2 text-[13px] transition-colors"
            style={{
              color: tab === id ? "var(--color-text)" : "var(--color-muted)",
              borderBottom: tab === id ? "2px solid var(--color-accent)" : "2px solid transparent",
              background: "transparent",
              fontWeight: tab === id ? 500 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-muted)" }}>
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : actions.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: "var(--color-green)" }} />
          <p className="text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>
            {tab === "open" ? "No pending actions" : `No ${tab} items`}
          </p>
          <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>
            {tab === "open"
              ? "The coordinator will create items here when it needs your input."
              : "Nothing here yet."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {actions.map((action) => {
            const isExpanded = expanded.has(action.id);
            return (
              <div key={action.id} className="glass-card p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={15} style={{ color: PRIORITY_COLORS[action.priority], marginTop: 2, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{action.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--color-surface)", color: "var(--color-muted)", border: "1px solid var(--color-border)" }}>
                            {CATEGORY_LABELS[action.category] ?? action.category}
                          </span>
                          <span className="text-[11px]" style={{ color: PRIORITY_COLORS[action.priority] }}>
                            {action.priority}
                          </span>
                          <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                            {new Date(action.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {action.status === "open" && (
                          <>
                            <button
                              onClick={() => updateStatus(action.id, "done")}
                              disabled={updating === action.id}
                              title="Mark done"
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: "var(--color-green)", background: "transparent" }}
                            >
                              {updating === action.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                            </button>
                            <button
                              onClick={() => updateStatus(action.id, "snoozed")}
                              disabled={updating === action.id}
                              title="Snooze"
                              className="p-1.5 rounded-lg"
                              style={{ color: "var(--color-muted)" }}
                            >
                              <Clock size={13} />
                            </button>
                          </>
                        )}
                        {action.status === "snoozed" && (
                          <button
                            onClick={() => updateStatus(action.id, "open")}
                            disabled={updating === action.id}
                            title="Reopen"
                            className="p-1.5 rounded-lg"
                            style={{ color: "var(--color-accent)" }}
                          >
                            <AlertCircle size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => toggleExpand(action.id)}
                          className="p-1.5 rounded-lg"
                          style={{ color: "var(--color-muted)" }}
                        >
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 pt-3 text-[13px] whitespace-pre-wrap" style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                        {action.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 p-4 rounded-lg" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>
          <strong style={{ color: "var(--color-text)" }}>How it works:</strong> When the coordinator needs info from you — a crypto account address, a CV detail, a business decision — it creates an action item here.
          The ! badge on the Chat tab means something is waiting. Open Chat and the coordinator will walk you through it.
        </p>
      </div>
    </div>
  );
}
