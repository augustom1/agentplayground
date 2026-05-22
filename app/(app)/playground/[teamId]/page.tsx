"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, MessageSquare, Settings2,
  Trash2, Send, Loader2, ChevronLeft,
  Pencil, Check, X, UserPlus, LayoutDashboard,
  Users, MessageCircle, Wallet, RefreshCw, ArrowUpDown,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Agent = { id: string; name: string; model: string; description?: string };
type Member = { agentId: string; agent: Agent; role: string | null; group: string | null };
type Thread = { id: string; title: string | null; updatedAt: string };
type Message = { role: "user" | "assistant"; content: string; agentName?: string };

type TeamConfig = {
  systemPrompt?: string;
  routingRules?: string;
  responseStyle?: "individual" | "synthesized";
  widgets?: PlaygroundWidget[];
};

type PlaygroundTeam = {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  config: TeamConfig;
  members: Member[];
  threads: Thread[];
};

// ── Widget types ────────────────────────────────────────────────────────────────

type WidgetType =
  | "agents_count"
  | "groups_count"
  | "conversations"
  | "revenue_mtd"
  | "invoices_pending"
  | "project_pipeline"
  | "crypto_balances"
  | "recent_transfers"
  | "settlement_queue"
  | "task_queue";

type WidgetSize = "sm" | "md" | "lg";

type PlaygroundWidget = {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position: number;
};

const WIDGET_LIBRARY: { type: WidgetType; title: string; size: WidgetSize; category: string; description: string }[] = [
  { type: "revenue_mtd",       title: "Revenue (MTD)",       size: "sm", category: "Business",  description: "Month-to-date revenue" },
  { type: "invoices_pending",  title: "Pending Invoices",    size: "sm", category: "Business",  description: "Open invoices count" },
  { type: "project_pipeline",  title: "Project Pipeline",    size: "md", category: "Business",  description: "Active projects list" },
  { type: "task_queue",        title: "Task Queue",          size: "md", category: "Business",  description: "Pending tasks" },
  { type: "crypto_balances",   title: "Crypto Balances",     size: "md", category: "Crypto",    description: "Per-coin wallet balances" },
  { type: "recent_transfers",  title: "Recent Transfers",    size: "md", category: "Crypto",    description: "Last 5 wallet transfers" },
  { type: "settlement_queue",  title: "Settlement Queue",    size: "sm", category: "Crypto",    description: "Pending coin settlements" },
];

const DEFAULT_WIDGETS: PlaygroundWidget[] = [
  { id: "core-agents",  type: "agents_count",  title: "Agents",        size: "sm", position: 0 },
  { id: "core-groups",  type: "groups_count",  title: "Groups",        size: "sm", position: 1 },
  { id: "core-threads", type: "conversations", title: "Conversations", size: "sm", position: 2 },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Live widget data types ──────────────────────────────────────────────────────

type LiveTask = { id: string; title: string; status: string; priority: string; teamName: string; createdAt: string };
type LiveProject = { id: string; name: string; status: string; type: string; deliveryChannel: string | null };

// ── Widget renderer ─────────────────────────────────────────────────────────────

function WidgetCard({
  widget,
  team,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  widget: PlaygroundWidget;
  team: PlaygroundTeam;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const accent = team.color ?? "var(--color-brand)";
  const groups = useMemo(() => {
    const g = new Map<string, Member[]>();
    for (const m of team.members) {
      const k = m.group ?? "";
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(m);
    }
    return g;
  }, [team.members]);

  const namedGroups = [...groups.entries()].filter(([k]) => k !== "");

  // Live data for data-driven widgets
  const [liveTasks, setLiveTasks] = useState<LiveTask[] | null>(null);
  const [liveProjects, setLiveProjects] = useState<LiveProject[] | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  useEffect(() => {
    if (widget.type !== "task_queue" && widget.type !== "project_pipeline") return;
    setLiveLoading(true);
    fetch(`/api/playground/teams/${team.id}/widget-data?type=${widget.type}`)
      .then((r) => r.json())
      .then((data) => {
        if (widget.type === "task_queue") setLiveTasks(data.tasks ?? []);
        if (widget.type === "project_pipeline") setLiveProjects(data.projects ?? []);
      })
      .catch(() => {})
      .finally(() => setLiveLoading(false));
  }, [widget.type, team.id]);

  const spanClass =
    widget.size === "lg" ? "col-span-3" : widget.size === "md" ? "col-span-2" : "col-span-1";

  const renderContent = () => {
    switch (widget.type) {
      case "agents_count":
        return (
          <div className="flex flex-col gap-1">
            <p className="text-3xl font-bold" style={{ color: accent }}>{team.members.length}</p>
            <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
              {namedGroups.length > 0 ? `across ${namedGroups.length} group${namedGroups.length !== 1 ? "s" : ""}` : "in this playground"}
            </p>
          </div>
        );
      case "groups_count":
        return (
          <div className="flex flex-col gap-1">
            <p className="text-3xl font-bold" style={{ color: accent }}>{namedGroups.length}</p>
            <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>agent groups defined</p>
          </div>
        );
      case "conversations":
        return (
          <div className="flex flex-col gap-1">
            <p className="text-3xl font-bold" style={{ color: accent }}>{team.threads.length}</p>
            <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>conversation threads</p>
          </div>
        );
      case "revenue_mtd":
        return (
          <div className="flex flex-col gap-1">
            <p className="text-3xl font-bold" style={{ color: accent }}>$0.00</p>
            <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>Connect billing to track revenue</p>
          </div>
        );
      case "invoices_pending":
        return (
          <div className="flex flex-col gap-1">
            <p className="text-3xl font-bold" style={{ color: accent }}>0</p>
            <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>pending invoices</p>
          </div>
        );
      case "project_pipeline":
        if (liveLoading) return <div className="flex items-center gap-2" style={{ color: "var(--color-muted)" }}><Loader2 size={11} className="animate-spin" /><span className="text-[11px]">Loading…</span></div>;
        if (!liveProjects || liveProjects.length === 0) return (
          <div className="flex flex-col gap-1">
            <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>No active projects linked to this playground.</p>
          </div>
        );
        return (
          <div className="flex flex-col gap-2">
            {liveProjects.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1 border-b" style={{ borderColor: "var(--color-border)" }}>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium truncate" style={{ color: "var(--color-text)" }}>{p.name}</p>
                  <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>{p.type}{p.deliveryChannel ? ` · ${p.deliveryChannel}` : ""}</p>
                </div>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full ml-2 font-medium shrink-0"
                  style={{
                    background: p.status === "active" ? "var(--color-green-dim)" : p.status === "paused" ? "rgba(251,191,36,0.12)" : "var(--color-surface-3)",
                    color: p.status === "active" ? "var(--color-green)" : p.status === "paused" ? "#fbbf24" : "var(--color-muted)",
                  }}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        );
      case "task_queue":
        if (liveLoading) return <div className="flex items-center gap-2" style={{ color: "var(--color-muted)" }}><Loader2 size={11} className="animate-spin" /><span className="text-[11px]">Loading…</span></div>;
        if (!liveTasks || liveTasks.length === 0) return (
          <div className="flex flex-col gap-1">
            <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>No running or pending tasks.</p>
          </div>
        );
        return (
          <div className="flex flex-col gap-1.5">
            {liveTasks.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-start gap-2">
                <span
                  className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: t.status === "running" ? accent : "var(--color-muted)" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] truncate" style={{ color: "var(--color-text)" }}>{t.title}</p>
                  <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>{t.teamName} · {t.status}</p>
                </div>
              </div>
            ))}
            {liveTasks.length > 5 && (
              <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>+{liveTasks.length - 5} more</p>
            )}
          </div>
        );
      case "crypto_balances":
        return (
          <div className="flex flex-col gap-2">
            {[
              { coin: "USDT", balance: "—", note: "TRC-20" },
              { coin: "USDC", balance: "—", note: "ERC-20" },
              { coin: "BTC",  balance: "—", note: "Bitcoin" },
              { coin: "ETH",  balance: "—", note: "Ethereum" },
            ].map((row) => (
              <div key={row.coin} className="flex items-center justify-between py-1 border-b" style={{ borderColor: "var(--color-border)" }}>
                <div>
                  <span className="text-[12px] font-semibold" style={{ color: "var(--color-text)" }}>{row.coin}</span>
                  <span className="text-[10px] ml-1.5" style={{ color: "var(--color-muted)" }}>{row.note}</span>
                </div>
                <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>{row.balance}</span>
              </div>
            ))}
            <p className="text-[10px] mt-1" style={{ color: "var(--color-muted)" }}>
              Connect Crypto Wallet group to activate live balances.
            </p>
          </div>
        );
      case "recent_transfers":
        return (
          <div className="flex flex-col gap-2">
            <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>No transfers yet. Wire the Crypto Wallet group to record transactions.</p>
          </div>
        );
      case "settlement_queue":
        return (
          <div className="flex flex-col gap-1">
            <p className="text-3xl font-bold" style={{ color: accent }}>0</p>
            <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>pending settlements</p>
          </div>
        );
      default:
        return <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>Widget data unavailable.</p>;
    }
  };

  return (
    <div
      className={`${spanClass} rounded-xl p-4 flex flex-col gap-3 group/widget relative`}
      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
          {widget.title}
        </p>
        <div className="flex items-center gap-0.5 opacity-0 group-hover/widget:opacity-100 transition-opacity">
          <button onClick={onMoveUp} className="p-1 rounded hover:opacity-70" style={{ color: "var(--color-muted)" }} title="Move left">
            <ArrowUpDown size={11} />
          </button>
          <button onClick={onRemove} className="p-1 rounded hover:opacity-70" style={{ color: "var(--color-muted)" }} title="Remove">
            <X size={11} />
          </button>
        </div>
      </div>
      {renderContent()}
    </div>
  );
}

// ── Widget Library Picker ───────────────────────────────────────────────────────

function WidgetLibraryModal({
  existingTypes,
  onAdd,
  onClose,
}: {
  existingTypes: WidgetType[];
  onAdd: (widget: PlaygroundWidget) => void;
  onClose: () => void;
}) {
  const available = WIDGET_LIBRARY.filter((w) => !existingTypes.includes(w.type));
  const categories = [...new Set(available.map((w) => w.category))];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 flex flex-col gap-4"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[14px]" style={{ color: "var(--color-text)" }}>Add Widget</h3>
          <button onClick={onClose} style={{ color: "var(--color-muted)" }}><X size={16} /></button>
        </div>
        {available.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>All available widgets are already on the dashboard.</p>
        ) : (
          categories.map((cat) => (
            <div key={cat}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted)" }}>{cat}</p>
              <div className="flex flex-col gap-1">
                {available.filter((w) => w.category === cat).map((w) => (
                  <button
                    key={w.type}
                    onClick={() => {
                      onAdd({ id: uid(), type: w.type, title: w.title, size: w.size, position: 999 });
                      onClose();
                    }}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                  >
                    <div>
                      <p className="text-[12px] font-medium" style={{ color: "var(--color-text)" }}>{w.title}</p>
                      <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>{w.description}</p>
                    </div>
                    <Plus size={14} style={{ color: "var(--color-muted)" }} />
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Message bubble ──────────────────────────────────────────────────────────────

function MessageBubble({ msg, accent }: { msg: Message; accent: string }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2`}>
      <div
        className="max-w-[80%] rounded-2xl px-4 py-3"
        style={{
          background: isUser ? "var(--color-brand)" : "var(--color-surface-2)",
          color: isUser ? "#fff" : "var(--color-text)",
        }}
      >
        {!isUser && msg.agentName && (
          <p className="text-[10px] font-semibold mb-1 opacity-60">{msg.agentName}</p>
        )}
        <div
          className="text-[13px] leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{
            __html: msg.content.replace(/\*\*\[(.+?)\]\*\*/g, '<span style="opacity:.6;font-size:11px;font-weight:600">$1</span><br/>'),
          }}
        />
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────

type ActiveTab = "dashboard" | "chat" | "configure" | `group:${string}`;

export default function PlaygroundWorkspacePage() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();

  const [team, setTeam] = useState<PlaygroundTeam | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");

  const [configInput, setConfigInput] = useState("");
  const [configuring, setConfiguring] = useState(false);
  const [configHistory, setConfigHistory] = useState<string[]>([]);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const [addingAgent, setAddingAgent] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [addAgentGroup, setAddAgentGroup] = useState("");

  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  const [widgets, setWidgets] = useState<PlaygroundWidget[]>(DEFAULT_WIDGETS);
  const [savingWidgets, setSavingWidgets] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const accent = team?.color ?? "var(--color-brand)";

  const groups = useMemo(() => {
    if (!team) return new Map<string, Member[]>();
    const g = new Map<string, Member[]>();
    for (const m of team.members) {
      const k = m.group ?? "";
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(m);
    }
    return g;
  }, [team]);

  const namedGroups = useMemo(() => [...groups.entries()].filter(([k]) => k !== ""), [groups]);
  const ungroupedMembers = groups.get("") ?? [];

  const loadTeam = useCallback(async () => {
    try {
      const res = await fetch(`/api/playground/teams/${teamId}`);
      if (!res.ok) { router.push("/playground"); return; }
      const data: PlaygroundTeam = await res.json();
      setTeam(data);
      setThreads(data.threads);
      setNameValue(data.name);
      const stored = (data.config as TeamConfig).widgets;
      if (stored && stored.length > 0) setWidgets(stored);
    } catch {
      router.push("/playground");
    }
    setLoadingTeam(false);
  }, [teamId, router]);

  useEffect(() => { loadTeam(); }, [loadTeam]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Chat actions ──────────────────────────────────────────────────────────────

  const newThread = async () => {
    if (!team) return;
    const res = await fetch(`/api/playground/teams/${team.id}/threads`, { method: "POST" });
    if (!res.ok) return;
    const t: Thread = await res.json();
    setThreads((prev) => [t, ...prev]);
    setActiveThread(t);
    setMessages([]);
  };

  const loadThread = async (t: Thread) => {
    setActiveThread(t);
    try {
      const res = await fetch(`/api/playground/teams/${teamId}/threads/${t.id}`);
      const data = await res.json();
      setMessages((data.messages as Message[]) ?? []);
    } catch {
      setMessages([]);
    }
  };

  const deleteThread = async (t: Thread, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/playground/teams/${teamId}/threads/${t.id}`, { method: "DELETE" });
    setThreads((prev) => prev.filter((x) => x.id !== t.id));
    if (activeThread?.id === t.id) { setActiveThread(null); setMessages([]); }
  };

  const send = async () => {
    if (!input.trim() || sending || !team) return;
    let thread = activeThread;
    if (!thread) {
      const res = await fetch(`/api/playground/teams/${team.id}/threads`, { method: "POST" });
      if (!res.ok) return;
      thread = await res.json();
      setThreads((prev) => [thread!, ...prev]);
      setActiveThread(thread);
    }
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch(`/api/playground/teams/${team.id}/threads/${thread!.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg.content }),
      });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let assistantContent = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += dec.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: assistantContent };
          return copy;
        });
      }
      const updated = await fetch(`/api/playground/teams/${teamId}/threads/${thread!.id}`);
      if (updated.ok) {
        const data = await updated.json();
        setThreads((prev) => prev.map((t) => t.id === thread!.id ? { ...t, title: data.title } : t));
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error: failed to get response." }]);
    }
    setSending(false);
  };

  // ── Team / agent actions ──────────────────────────────────────────────────────

  const saveName = async () => {
    if (!team || !nameValue.trim()) return;
    await fetch(`/api/playground/teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameValue.trim() }),
    });
    setTeam((prev) => prev ? { ...prev, name: nameValue.trim() } : prev);
    setEditingName(false);
  };

  const configure = async () => {
    if (!team || !configInput.trim() || configuring) return;
    setConfiguring(true);
    try {
      const res = await fetch(`/api/playground/teams/${team.id}/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: configInput.trim() }),
      });
      const data = await res.json();
      setConfigHistory((prev) => [data.summary, ...prev]);
      setTeam((prev) => prev ? { ...prev, config: data.config } : prev);
      setConfigInput("");
    } catch {}
    setConfiguring(false);
  };

  const removeAgent = async (agentId: string) => {
    if (!team) return;
    await fetch(`/api/playground/teams/${team.id}/members/${agentId}`, { method: "DELETE" });
    setTeam((prev) => prev ? { ...prev, members: prev.members.filter((m) => m.agentId !== agentId) } : prev);
  };

  const addAgent = async (agentId: string) => {
    if (!team) return;
    const res = await fetch(`/api/playground/teams/${team.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, group: addAgentGroup || null }),
    });
    if (!res.ok) return;
    const member: Member = await res.json();
    setTeam((prev) => prev ? { ...prev, members: [...prev.members, member] } : prev);
    setAddingAgent(false);
    setAddAgentGroup("");
  };

  const loadAvailableAgents = async () => {
    const res = await fetch("/api/agents");
    if (res.ok) setAvailableAgents(await res.json());
    setAddingAgent(true);
  };

  // ── Widget actions ────────────────────────────────────────────────────────────

  const persistWidgets = useCallback(async (updated: PlaygroundWidget[]) => {
    if (!team) return;
    setSavingWidgets(true);
    await fetch(`/api/playground/teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: { ...team.config, widgets: updated } }),
    }).catch(() => {});
    setSavingWidgets(false);
  }, [team]);

  const addWidget = (w: PlaygroundWidget) => {
    const updated = [...widgets, { ...w, position: widgets.length }];
    setWidgets(updated);
    persistWidgets(updated);
  };

  const removeWidget = (id: string) => {
    const updated = widgets.filter((w) => w.id !== id).map((w, i) => ({ ...w, position: i }));
    setWidgets(updated);
    persistWidgets(updated);
  };

  const moveWidget = (id: string, direction: "up" | "down") => {
    const idx = widgets.findIndex((w) => w.id === id);
    if (idx < 0) return;
    const arr = [...widgets];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
    const updated = arr.map((w, i) => ({ ...w, position: i }));
    setWidgets(updated);
    persistWidgets(updated);
  };

  // ── Loading state ─────────────────────────────────────────────────────────────

  if (loadingTeam) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--color-muted)" }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }
  if (!team) return null;

  const sortedWidgets = [...widgets].sort((a, b) => a.position - b.position);
  const existingWidgetTypes = widgets.map((w) => w.type);

  // ── Tab bar ───────────────────────────────────────────────────────────────────

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={13} /> },
    { id: "chat",      label: "Chat",      icon: <MessageCircle size={13} /> },
    ...namedGroups.map(([name]) => ({
      id: `group:${name}` as ActiveTab,
      label: name,
      icon: <Users size={13} />,
    })),
    { id: "configure", label: "Configure", icon: <Settings2 size={13} /> },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--color-background)" }}>
      {/* Top header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <button
          onClick={() => router.push("/playground")}
          className="flex items-center gap-1.5 text-[11px] hover:opacity-70 transition-opacity"
          style={{ color: "var(--color-muted)" }}
        >
          <ArrowLeft size={12} /> Playgrounds
        </button>
        <div className="w-px h-4" style={{ background: "var(--color-border)" }} />
        {editingName ? (
          <div className="flex items-center gap-1.5">
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              className="text-[14px] font-semibold rounded px-2 py-0.5 outline-none"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-light)", color: "var(--color-text)", minWidth: 160 }}
              autoFocus
            />
            <button onClick={saveName} style={{ color: "var(--color-green)" }}><Check size={13} /></button>
            <button onClick={() => setEditingName(false)} style={{ color: "var(--color-muted)" }}><X size={13} /></button>
          </div>
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex items-center gap-1.5 text-[14px] font-semibold hover:opacity-70 transition-opacity group"
            style={{ color: "var(--color-text)" }}
          >
            {team.name}
            <Pencil size={10} className="opacity-0 group-hover:opacity-50" />
          </button>
        )}
        <div className="flex items-center gap-2 ml-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: accent }}
          />
        </div>
        {savingWidgets && (
          <div className="ml-auto flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-muted)" }}>
            <RefreshCw size={11} className="animate-spin" /> Saving...
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div
        className="flex items-center gap-0.5 px-4 border-b flex-shrink-0 overflow-x-auto"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 transition-colors"
            style={{
              borderColor: activeTab === tab.id ? accent : "transparent",
              color: activeTab === tab.id ? "var(--color-text)" : "var(--color-muted)",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Dashboard ─────────────────────────────────────────────────────── */}
      {activeTab === "dashboard" && (
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-5xl mx-auto flex flex-col gap-6">
            {/* Dashboard header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-semibold" style={{ color: "var(--color-text)" }}>Dashboard</h2>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                  {team.description ?? "Playground overview and metrics"}
                </p>
              </div>
              <button
                onClick={() => setShowWidgetLibrary(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              >
                <Plus size={13} /> Add Widget
              </button>
            </div>

            {/* Widget grid */}
            <div className="grid grid-cols-3 gap-3">
              {sortedWidgets.map((w) => (
                <WidgetCard
                  key={w.id}
                  widget={w}
                  team={team}
                  onRemove={() => removeWidget(w.id)}
                  onMoveUp={() => moveWidget(w.id, "up")}
                  onMoveDown={() => moveWidget(w.id, "down")}
                />
              ))}
            </div>

            {/* Groups overview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>Agent Groups</h3>
                <button
                  onClick={loadAvailableAgents}
                  className="flex items-center gap-1.5 text-[11px]"
                  style={{ color: "var(--color-muted)" }}
                >
                  <UserPlus size={12} /> Add Agent
                </button>
              </div>
              {namedGroups.length === 0 && ungroupedMembers.length === 0 ? (
                <div
                  className="rounded-xl p-6 text-center"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                >
                  <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>
                    No agents in this playground yet. Add agents and assign them to groups.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {namedGroups.map(([groupName, members]) => (
                    <button
                      key={groupName}
                      onClick={() => setActiveTab(`group:${groupName}`)}
                      className="rounded-xl p-4 text-left hover:opacity-90 transition-opacity group/group"
                      style={{
                        background: "var(--color-surface-2)",
                        border: "1px solid var(--color-border)",
                        borderLeft: `3px solid ${accent}`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>{groupName}</p>
                        <ChevronLeft size={13} className="rotate-180 opacity-0 group-hover/group:opacity-60" style={{ color: accent }} />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                          {members.slice(0, 5).map((m) => (
                            <div
                              key={m.agentId}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2"
                              style={{ background: `${accent}25`, borderColor: "var(--color-surface-2)", color: accent }}
                              title={m.agent.name}
                            >
                              {m.agent.name[0]}
                            </div>
                          ))}
                        </div>
                        <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                          {members.length} agent{members.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </button>
                  ))}
                  {ungroupedMembers.length > 0 && (
                    <div
                      className="rounded-xl p-4"
                      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                    >
                      <p className="text-[12px] font-medium mb-2" style={{ color: "var(--color-muted)" }}>Ungrouped</p>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                          {ungroupedMembers.slice(0, 5).map((m) => (
                            <div
                              key={m.agentId}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2"
                              style={{ background: "var(--color-surface-3)", borderColor: "var(--color-surface-2)", color: "var(--color-muted)" }}
                              title={m.agent.name}
                            >
                              {m.agent.name[0]}
                            </div>
                          ))}
                        </div>
                        <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                          {ungroupedMembers.length} agent{ungroupedMembers.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Chat ──────────────────────────────────────────────────────────── */}
      {activeTab === "chat" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Thread sidebar */}
          <div
            className="w-52 flex-shrink-0 flex flex-col border-r"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex-1 overflow-y-auto p-2">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Threads</span>
                <button onClick={newThread} className="rounded p-0.5 hover:opacity-70" style={{ color: "var(--color-muted)" }} title="New thread">
                  <Plus size={13} />
                </button>
              </div>
              {threads.length === 0 ? (
                <p className="text-[11px] px-1 py-2" style={{ color: "var(--color-muted)" }}>No threads yet</p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {threads.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => loadThread(t)}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer group/thread"
                      style={{ background: activeThread?.id === t.id ? "var(--color-surface-3)" : "transparent" }}
                    >
                      <MessageSquare size={11} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
                      <span
                        className="text-[11px] flex-1 truncate"
                        style={{ color: activeThread?.id === t.id ? "var(--color-text)" : "var(--color-text-secondary)" }}
                      >
                        {t.title ?? "New chat"}
                      </span>
                      <button
                        onClick={(e) => deleteThread(t, e)}
                        className="opacity-0 group-hover/thread:opacity-60 hover:!opacity-100"
                        style={{ color: "var(--color-muted)" }}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Members in sidebar */}
            <div className="p-3 border-t" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Agents</span>
                <button onClick={loadAvailableAgents} style={{ color: "var(--color-muted)" }} title="Add agent">
                  <UserPlus size={12} />
                </button>
              </div>
              <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                {namedGroups.map(([groupName, members]) => (
                  <div key={groupName}>
                    <p className="text-[9px] font-semibold uppercase tracking-wider px-0.5 mb-0.5" style={{ color: "var(--color-muted)" }}>
                      {groupName}
                    </p>
                    {members.map((m) => (
                      <div key={m.agentId} className="flex items-center gap-1.5 pl-2 group/member">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0" style={{ background: `${accent}30`, color: accent }}>
                          {m.agent.name[0]}
                        </div>
                        <span className="text-[10px] truncate flex-1" style={{ color: "var(--color-text-secondary)" }}>{m.agent.name}</span>
                        <button onClick={() => removeAgent(m.agentId)} className="opacity-0 group-hover/member:opacity-60" style={{ color: "var(--color-muted)" }}>
                          <X size={9} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
                {ungroupedMembers.map((m) => (
                  <div key={m.agentId} className="flex items-center gap-1.5 group/member">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0" style={{ background: `${accent}30`, color: accent }}>
                      {m.agent.name[0]}
                    </div>
                    <span className="text-[10px] truncate flex-1" style={{ color: "var(--color-text-secondary)" }}>{m.agent.name}</span>
                    <button onClick={() => removeAgent(m.agentId)} className="opacity-0 group-hover/member:opacity-60" style={{ color: "var(--color-muted)" }}>
                      <X size={9} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat main area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.length === 0 && !sending && (
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                  <MessageCircle size={40} style={{ color: "var(--color-muted)" }} />
                  <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>
                    {team.members.length === 0 ? "Add agents to start chatting" : "Start a conversation with this playground"}
                  </p>
                </div>
              )}
              {messages.map((msg, i) => <MessageBubble key={i} msg={msg} accent={accent} />)}
              {sending && messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.content === "" && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3 flex items-center gap-2" style={{ background: "var(--color-surface-2)" }}>
                    <Loader2 size={13} className="animate-spin" style={{ color: "var(--color-muted)" }} />
                    <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>Responding...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t flex-shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <div
                className="flex items-end gap-2 rounded-xl px-3 py-2"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={team.members.length === 0 ? "Add agents first..." : "Message the playground..."}
                  disabled={team.members.length === 0}
                  rows={1}
                  className="flex-1 resize-none bg-transparent outline-none text-[13px] leading-relaxed max-h-32"
                  style={{ color: "var(--color-text)" }}
                />
                <button
                  onClick={send}
                  disabled={sending || !input.trim() || team.members.length === 0}
                  className="p-1.5 rounded-lg transition-all disabled:opacity-40"
                  style={{ background: accent, color: "#fff" }}
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Group drilldown ────────────────────────────────────────────────── */}
      {activeTab.startsWith("group:") && (() => {
        const groupName = activeTab.slice(6);
        const members = groups.get(groupName) ?? [];
        return (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-3xl mx-auto flex flex-col gap-6">
              <div>
                <h2 className="text-[18px] font-semibold" style={{ color: "var(--color-text)" }}>{groupName}</h2>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                  {members.length} agent{members.length !== 1 ? "s" : ""} in this group
                </p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Agents", value: members.length },
                  { label: "Tasks", value: "—" },
                  { label: "Success", value: "—" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl p-4"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-muted)" }}>{stat.label}</p>
                    <p className="text-2xl font-bold" style={{ color: accent }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Agents list */}
              <div>
                <h3 className="text-[13px] font-semibold mb-3" style={{ color: "var(--color-text)" }}>Agents</h3>
                <div className="flex flex-col gap-2">
                  {members.map((m) => (
                    <div
                      key={m.agentId}
                      className="flex items-center gap-3 rounded-xl p-3"
                      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                        style={{ background: `${accent}25`, color: accent }}
                      >
                        {m.agent.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>{m.agent.name}</p>
                        <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>{m.agent.model}</p>
                      </div>
                      {m.role && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-medium"
                          style={{ background: `${accent}15`, color: accent }}
                        >
                          {m.role}
                        </span>
                      )}
                      <button
                        onClick={() => removeAgent(m.agentId)}
                        className="p-1 rounded hover:opacity-70"
                        style={{ color: "var(--color-muted)" }}
                        title="Remove agent"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Crypto Wallet group specific info */}
              {(groupName.toLowerCase().includes("crypto") || groupName.toLowerCase().includes("wallet")) && (
                <div
                  className="rounded-xl p-4"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                >
                  <p className="text-[12px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--color-text)" }}>
                    <Wallet size={13} style={{ color: accent }} />
                    Crypto Wallet Group
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
                    This group handles client billing and payment routing. Agents monitor inbound wallets,
                    filter received coins, and route funds to the business account. Wire up wallet credentials
                    via environment variables to activate live functionality.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      { label: "Inbound Wallet", value: "Not configured" },
                      { label: "Business Account", value: "Not configured" },
                      { label: "Supported Coins", value: "USDT · USDC · BTC · ETH" },
                      { label: "Status", value: "Scaffold — not wired" },
                    ].map((row) => (
                      <div key={row.label} className="rounded-lg p-2.5" style={{ background: "var(--color-surface-3)" }}>
                        <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>{row.label}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text)" }}>{row.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Tab: Configure ─────────────────────────────────────────────────────── */}
      {activeTab === "configure" && (
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto flex flex-col gap-6">
            <h2 className="text-[18px] font-semibold" style={{ color: "var(--color-text)" }}>Configure Playground</h2>

            {/* Current config */}
            <div
              className="rounded-xl p-4 flex flex-col gap-2"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Current Config</p>
              {team.config.responseStyle && (
                <p className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                  Response style: <span style={{ color: "var(--color-text)" }}>{team.config.responseStyle}</span>
                </p>
              )}
              {team.config.systemPrompt ? (
                <p className="text-[12px] line-clamp-4" style={{ color: "var(--color-muted)" }}>{team.config.systemPrompt}</p>
              ) : (
                <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>No configuration yet. Describe what you want below.</p>
              )}
            </div>

            {/* History */}
            {configHistory.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Change History</p>
                {configHistory.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: accent }} />
                    <p className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>{s}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Config input */}
            <div className="flex flex-col gap-2">
              <textarea
                value={configInput}
                onChange={(e) => setConfigInput(e.target.value)}
                placeholder='e.g. "Make this playground respond in synthesized mode" or "Add routing: billing questions go to the Crypto Wallet group"'
                rows={4}
                className="w-full rounded-xl px-4 py-3 text-[13px] resize-none outline-none"
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
              />
              <button
                onClick={configure}
                disabled={configuring || !configInput.trim()}
                className="self-end px-4 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-2 disabled:opacity-50"
                style={{ background: accent, color: "#fff" }}
              >
                {configuring && <Loader2 size={12} className="animate-spin" />}
                Apply Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Agent modal ─────────────────────────────────────────────────────── */}
      {addingAgent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => e.target === e.currentTarget && setAddingAgent(false)}
        >
          <div
            className="w-80 rounded-2xl p-5 flex flex-col gap-4"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[14px]" style={{ color: "var(--color-text)" }}>Add Agent</h3>
              <button onClick={() => setAddingAgent(false)} style={{ color: "var(--color-muted)" }}><X size={16} /></button>
            </div>

            {/* Group assignment */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium" style={{ color: "var(--color-muted)" }}>ASSIGN TO GROUP</label>
              <select
                value={addAgentGroup}
                onChange={(e) => setAddAgentGroup(e.target.value)}
                className="w-full rounded-lg px-3 py-1.5 text-[12px] outline-none"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
              >
                <option value="">No group</option>
                {namedGroups.map(([g]) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
              {availableAgents
                .filter((a) => !team.members.find((m) => m.agentId === a.id))
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => addAgent(a.id)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:opacity-80 transition-opacity"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{ background: `${accent}30`, color: accent }}
                    >
                      {a.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium" style={{ color: "var(--color-text)" }}>{a.name}</p>
                      <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>{a.model}</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Widget library modal ──────────────────────────────────────────────── */}
      {showWidgetLibrary && (
        <WidgetLibraryModal
          existingTypes={existingWidgetTypes}
          onAdd={addWidget}
          onClose={() => setShowWidgetLibrary(false)}
        />
      )}
    </div>
  );
}
