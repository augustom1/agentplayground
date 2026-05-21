"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, MessageSquare, Users, Settings2,
  Trash2, Send, Loader2, ChevronRight, ChevronLeft,
  Pencil, Check, X, UserPlus,
} from "lucide-react";

type Agent = { id: string; name: string; model: string; description?: string };
type Member = { agentId: string; agent: Agent; role: string | null };
type Thread = { id: string; title: string | null; updatedAt: string };
type Message = {
  role: "user" | "assistant";
  content: string;
  agentName?: string;
};
type TeamConfig = {
  systemPrompt?: string;
  routingRules?: string;
  responseStyle?: "individual" | "synthesized";
};
type PlaygroundTeam = {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
  description: string | null;
  config: TeamConfig;
  members: Member[];
  threads: Thread[];
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function MessageBubble({ msg }: { msg: Message }) {
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
          dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*\[(.+?)\]\*\*/g, '<span style="opacity:.6;font-size:11px;font-weight:600">$1</span><br/>') }}
        />
      </div>
    </div>
  );
}

export default function TeamWorkspacePage() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();

  const [team, setTeam] = useState<PlaygroundTeam | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(true);

  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [configInput, setConfigInput] = useState("");
  const [configuring, setConfiguring] = useState(false);
  const [configHistory, setConfigHistory] = useState<string[]>([]);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const [addingAgent, setAddingAgent] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const accent = team?.color ?? "var(--color-brand)";

  const loadTeam = useCallback(async () => {
    try {
      const res = await fetch(`/api/playground/teams/${teamId}`);
      if (!res.ok) { router.push("/playground"); return; }
      const data: PlaygroundTeam = await res.json();
      setTeam(data);
      setThreads(data.threads);
      setNameValue(data.name);
    } catch {
      router.push("/playground");
    }
    setLoadingTeam(false);
  }, [teamId, router]);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

      // Refresh thread title
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
      body: JSON.stringify({ agentId }),
    });
    if (!res.ok) return;
    const member: Member = await res.json();
    setTeam((prev) => prev ? { ...prev, members: [...prev.members, member] } : prev);
    setAddingAgent(false);
  };

  const loadAvailableAgents = async () => {
    const res = await fetch("/api/agents");
    if (res.ok) setAvailableAgents(await res.json());
    setAddingAgent(true);
  };

  if (loadingTeam) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--color-muted)" }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!team) return null;

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--color-background)" }}>
      {/* ── Left sidebar ── */}
      <div
        className="w-56 flex-shrink-0 flex flex-col border-r"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {/* Back + team name */}
        <div className="p-3 border-b" style={{ borderColor: "var(--color-border)" }}>
          <button
            onClick={() => router.push("/playground")}
            className="flex items-center gap-1.5 text-[11px] mb-3 hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-muted)" }}
          >
            <ArrowLeft size={12} /> All Teams
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">{team.emoji ?? "🤖"}</span>
            {editingName ? (
              <div className="flex items-center gap-1 flex-1">
                <input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  className="flex-1 text-[13px] font-semibold rounded px-1.5 py-0.5 outline-none min-w-0"
                  style={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border-light)",
                    color: "var(--color-text)",
                  }}
                  autoFocus
                />
                <button onClick={saveName} style={{ color: "var(--color-green)" }}><Check size={13} /></button>
                <button onClick={() => setEditingName(false)} style={{ color: "var(--color-muted)" }}><X size={13} /></button>
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="text-[13px] font-semibold text-left flex-1 hover:opacity-70 transition-opacity group"
                style={{ color: "var(--color-text)" }}
              >
                {team.name}
                <Pencil size={10} className="inline ml-1 opacity-0 group-hover:opacity-50" />
              </button>
            )}
          </div>
        </div>

        {/* Threads */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Threads</span>
            <button
              onClick={newThread}
              className="rounded p-0.5 hover:opacity-70"
              style={{ color: "var(--color-muted)" }}
              title="New thread"
            >
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
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer group"
                  style={{
                    background: activeThread?.id === t.id ? "var(--color-surface-3)" : "transparent",
                  }}
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
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100"
                    style={{ color: "var(--color-muted)" }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members */}
        <div className="p-3 border-t" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Members</span>
            <button
              onClick={loadAvailableAgents}
              style={{ color: "var(--color-muted)" }}
              title="Add agent"
            >
              <UserPlus size={12} />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {team.members.map((m) => (
              <div key={m.agentId} className="flex items-center gap-2 group">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ background: `${accent}30`, color: accent }}
                >
                  {m.agent.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] truncate" style={{ color: "var(--color-text)" }}>{m.agent.name}</p>
                  {m.role && <p className="text-[9px]" style={{ color: "var(--color-muted)" }}>{m.role}</p>}
                </div>
                <button
                  onClick={() => removeAgent(m.agentId)}
                  className="opacity-0 group-hover:opacity-60"
                  style={{ color: "var(--color-muted)" }}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="p-2 border-t" style={{ borderColor: "var(--color-border)" }}>
          <button
            onClick={() => setRightPanelOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] hover:opacity-80 transition-opacity"
            style={{ color: "var(--color-muted)", background: rightPanelOpen ? "var(--color-surface-2)" : "transparent" }}
          >
            <Settings2 size={13} /> Configure Team
            <ChevronRight size={12} className="ml-auto" />
          </button>
        </div>
      </div>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: accent }}><Users size={15} /></span>
            <span className="text-[14px] font-semibold" style={{ color: "var(--color-text)" }}>
              {activeThread?.title ?? "New Chat"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {team.members.map((m) => (
              <div
                key={m.agentId}
                title={m.agent.name}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ background: `${accent}25`, color: accent }}
              >
                {m.agent.name[0]}
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.length === 0 && !sending && (
            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
              <span className="text-5xl">{team.emoji ?? "🤖"}</span>
              <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>
                Start a conversation with the team
              </p>
            </div>
          )}
          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
          {sending && messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.content === "" && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl px-4 py-3 flex items-center gap-2"
                style={{ background: "var(--color-surface-2)" }}
              >
                <Loader2 size={13} className="animate-spin" style={{ color: "var(--color-muted)" }} />
                <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>Team is responding…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className="p-3 border-t flex-shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div
            className="flex items-end gap-2 rounded-xl px-3 py-2"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Message the team…"
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none text-[13px] leading-relaxed max-h-32"
              style={{ color: "var(--color-text)" }}
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="p-1.5 rounded-lg transition-all disabled:opacity-40"
              style={{ background: accent, color: "#fff" }}
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          {team.members.length === 0 && (
            <p className="text-[11px] mt-1.5 text-center" style={{ color: "var(--color-muted)" }}>
              Add agents to this team to start chatting.
            </p>
          )}
        </div>
      </div>

      {/* ── Right panel: Configure Team ── */}
      {rightPanelOpen && (
        <div
          className="w-72 flex-shrink-0 flex flex-col border-l"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "var(--color-border)" }}>
            <span className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>Configure Team</span>
            <button onClick={() => setRightPanelOpen(false)} style={{ color: "var(--color-muted)" }}>
              <ChevronLeft size={16} />
            </button>
          </div>

          {/* Current config summary */}
          <div className="p-3 border-b" style={{ borderColor: "var(--color-border)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted)" }}>Current Config</p>
            {team.config.responseStyle && (
              <p className="text-[11px] mb-1" style={{ color: "var(--color-text-secondary)" }}>
                Style: <span style={{ color: "var(--color-text)" }}>{team.config.responseStyle}</span>
              </p>
            )}
            {team.config.systemPrompt && (
              <p className="text-[11px] line-clamp-3" style={{ color: "var(--color-muted)" }}>
                {team.config.systemPrompt}
              </p>
            )}
            {!team.config.systemPrompt && !team.config.responseStyle && (
              <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>No configuration yet. Describe what you want below.</p>
            )}
          </div>

          {/* Change history */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted)" }}>History</p>
            {configHistory.length === 0 ? (
              <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>No changes yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {configHistory.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: accent }} />
                    <p className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>{s}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Config input */}
          <div className="p-3 border-t" style={{ borderColor: "var(--color-border)" }}>
            <textarea
              value={configInput}
              onChange={(e) => setConfigInput(e.target.value)}
              placeholder='e.g. "Make this team respond in synthesized mode" or "Add routing: legal questions go to Lex"'
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-[12px] resize-none outline-none mb-2"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
            />
            <button
              onClick={configure}
              disabled={configuring || !configInput.trim()}
              className="w-full py-2 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: accent, color: "#fff" }}
            >
              {configuring && <Loader2 size={12} className="animate-spin" />}
              Apply Change
            </button>
          </div>
        </div>
      )}

      {/* Add Agent modal */}
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
    </div>
  );
}
