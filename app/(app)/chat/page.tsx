"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Send, Bot, Zap, Plus, ChevronDown, Globe, Network,
  Loader2, Sparkles, Search, Eye, Users, Paperclip,
  Mic, FileText, X, AlertCircle, Calendar,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { LogoMark } from "@/components/Logo";
import { MODEL_CATALOG } from "@/lib/model-catalog";
import { useSession } from "next-auth/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageUsage = { input: number; output: number; model: string };

type PendingAttachment = {
  id: string; filename: string;
  type: "image" | "audio" | "text" | "other";
  base64?: string; mimeType?: string; transcript?: string;
  content?: string; previewUrl?: string;
  status: "processing" | "ready" | "error";
};

type AttachmentPayload =
  | { type: "image"; base64: string; mimeType: string; filename?: string }
  | { type: "text"; content: string; filename: string };

type Message = {
  id: string; role: "user" | "assistant";
  content: string; usage?: MessageUsage;
};

type Team = { id: string; name: string; status: string; _count: { agents: number } };
type Provider = "anthropic" | "openai" | "nvidia" | "ollama";
type ProviderConfig = { label: string; color: string; models: Array<{ value: string; label: string }> };

// ─── Config ───────────────────────────────────────────────────────────────────

const PROVIDERS: Record<Provider, ProviderConfig> = MODEL_CATALOG;

const SESSION_KEY = "chat_conversation_id";

function calcCost(input: number, output: number, model: string): string {
  // NVIDIA catalog models ("vendor/model") and Ollama are free
  if (model.includes("/")) return "free";
  const rates: Record<string, { in: number; out: number }> = {
    "claude-sonnet-4-6":        { in: 0.003,   out: 0.015   },
    "claude-opus-4-6":          { in: 0.015,   out: 0.075   },
    "claude-haiku-4-5-20251001":{ in: 0.00025, out: 0.00125 },
  };
  const rate = rates[model] ?? rates["claude-sonnet-4-6"];
  const cost = (input / 1000) * rate.in + (output / 1000) * rate.out;
  return cost < 0.001 ? "<$0.001" : `$${cost.toFixed(3)}`;
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getInitialMessage(teamId: string, teamName?: string): Message {
  if (teamId === "coordinator") return { id: "0", role: "assistant", content: "I'm the **Coordinator Agent** — I have visibility into all your agent teams and can route tasks, delegate work, and orchestrate multi-team workflows.\n\nTell me what you need done and I'll assign it to the right team." };
  if (teamId !== "all" && teamName) return { id: "0", role: "assistant", content: `You're now connected to the **${teamName}** team.\n\nI have full context of this team's agents, skills, and capabilities. What would you like to accomplish?` };
  return { id: "0", role: "assistant", content: "Hey! I'm your agent copilot. I have visibility into all your agent teams.\n\nI can help you create teams, run tasks, do web research, build chatbots, and automate processes — just tell me what you need." };
}

function getSuggestions(teamId: string): Array<{ label: string; icon: React.ReactNode }> {
  if (teamId === "coordinator") return [
    { label: "Route task to best team", icon: <Network size={12} /> },
    { label: "Schedule a meeting", icon: <Calendar size={12} /> },
    { label: "Coordinate a product launch", icon: <Sparkles size={12} /> },
    { label: "Which team handles support?", icon: <Users size={12} /> },
  ];
  return [
    { label: "Search the web for AI agent frameworks", icon: <Search size={12} /> },
    { label: "Create a marketing team with 3 agents", icon: <Zap size={12} /> },
    { label: "Build a customer support chatbot", icon: <Bot size={12} /> },
    { label: "Schedule a daily data processing task", icon: <Sparkles size={12} /> },
  ];
}

// ─── Model selector dropdown ──────────────────────────────────────────────────

function ModelDropdown({ provider, model, models, onChangeProvider, onChangeModel, teams, teamId, onChangeTeam, teamsLoading }: {
  provider: Provider; model: string; models: Array<{ value: string; label: string }>;
  onChangeProvider: (p: Provider) => void; onChangeModel: (m: string) => void;
  teams: Team[]; teamId: string; onChangeTeam: (id: string) => void; teamsLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  const currentModel = models.find(m => m.value === model);
  const providerCfg = PROVIDERS[provider];
  const currentTeamLabel = teamId === "all" ? "All Teams" : teamId === "coordinator" ? "Coordinator" : teams.find(t => t.id === teamId)?.name || teamId;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 transition-colors rounded-lg px-2 py-1"
        style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "12px", color: "var(--color-text-secondary)" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--color-text)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: providerCfg.color, display: "inline-block", flexShrink: 0 }} />
        {currentModel?.label || model}
        <ChevronDown size={10} style={{ color: "var(--color-muted)", transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {/* Full-screen backdrop + centered panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)" }}
          />
          {/* Centered modal */}
          <div
            className="glass-panel animate-fade-in"
            style={{
              position: "fixed",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 201,
              width: "min(320px, calc(100vw - 32px))",
              overflow: "hidden",
            }}
          >
            {/* Provider tabs */}
            <div className="flex gap-px p-2 pb-1.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
              {(["anthropic", "openai", "nvidia", "ollama"] as Provider[]).map(p => (
                <button key={p} onClick={() => { onChangeProvider(p); onChangeModel(PROVIDERS[p].models[0].value); }}
                  style={{ flex: 1, fontSize: "11px", padding: "4px 0", borderRadius: 6, border: "none", cursor: "pointer", background: p === provider ? "var(--color-surface-3)" : "transparent", color: p === provider ? "var(--color-text)" : "var(--color-muted)", fontWeight: p === provider ? 500 : 400 }}>
                  {PROVIDERS[p].label}
                </button>
              ))}
            </div>

            {/* Models */}
            <div className="py-1">
              {models.map(m => (
                <button key={m.value} onClick={() => { onChangeModel(m.value); setOpen(false); }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 transition-colors"
                  style={{ background: m.value === model ? "var(--color-surface-3)" : "transparent", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--color-text)" }}
                  onMouseEnter={e => { if (m.value !== model) (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; }}
                  onMouseLeave={e => { if (m.value !== model) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.value === model ? providerCfg.color : "var(--color-muted)", display: "inline-block", flexShrink: 0 }} />
                  {m.label}
                  {m.value === model && <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--color-muted)" }}>active</span>}
                </button>
              ))}
            </div>

            {/* Custom model id — any model, any time */}
            <div className="px-3 pb-2 pt-1.5" style={{ borderTop: "1px solid var(--color-border)" }}>
              <input
                key={provider}
                type="text"
                placeholder={
                  provider === "nvidia" ? "Custom model id (e.g. mistralai/mixtral-8x7b-instruct-v0.1)"
                  : provider === "ollama" ? "Custom model (e.g. gemma2:9b)"
                  : "Custom model id"
                }
                defaultValue={models.some(m => m.value === model) ? "" : model}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    const v = (e.target as HTMLInputElement).value.trim();
                    if (v) { onChangeModel(v); setOpen(false); }
                  }
                }}
                className="glass-input w-full px-2 py-1.5"
                style={{ fontSize: "12px", color: "var(--color-text)" }}
              />
              <p style={{ fontSize: 10, color: "var(--color-muted)", marginTop: 4 }}>
                Any model this provider serves — type its id and press Enter.
              </p>
            </div>

            {/* Context — collapsible */}
            <div style={{ borderTop: "1px solid var(--color-border)" }}>
              <button
                onClick={() => setContextOpen(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 transition-colors"
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "10px", color: "var(--color-muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Context</span>
                  <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>{currentTeamLabel}</span>
                </div>
                <ChevronDown size={11} style={{ color: "var(--color-muted)", transition: "transform 0.15s", transform: contextOpen ? "rotate(180deg)" : "none" }} />
              </button>

              {contextOpen && (
                <div className="flex flex-col gap-px pb-1 px-1" style={{ maxHeight: 220, overflowY: "auto" }}>
                  {teamsLoading ? (
                    <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin" style={{ color: "var(--color-muted)" }} /></div>
                  ) : (
                    ["all", "coordinator", ...teams.map(t => t.id)].map(id => {
                      const t = teams.find(t => t.id === id);
                      const label = id === "all" ? "All Teams" : id === "coordinator" ? "Coordinator" : t?.name || id;
                      return (
                        <button key={id} onClick={() => { onChangeTeam(id); setContextOpen(false); setOpen(false); }}
                          className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors"
                          style={{ background: id === teamId ? "var(--color-surface-3)" : "transparent", border: "none", cursor: "pointer", fontSize: "12px", color: id === teamId ? "var(--color-text)" : "var(--color-text-secondary)" }}
                          onMouseEnter={e => { if (id !== teamId) (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; }}
                          onMouseLeave={e => { if (id !== teamId) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                          {id === "coordinator" ? <Network size={11} style={{ color: "var(--color-brand)" }} /> : <Globe size={11} style={{ opacity: 0.6 }} />}
                          {label}
                          {t && <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--color-muted)" }}>{t._count.agents}</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Message rendering ────────────────────────────────────────────────────────

function renderContent(content: string) {
  const lines = content.split("\n");
  return lines.map((line, i) => {
    const toolMatch = line.match(/⚡ \*Used tool: (\w+)\*/);
    if (toolMatch) {
      return (
        <span key={i} style={{ display: "block", margin: "3px 0" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 6, fontSize: 11, background: "var(--color-surface-3)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)", fontWeight: 500 }}>
            <Sparkles size={10} /> {toolMatch[1].replace(/_/g, " ")}
          </span>
        </span>
      );
    }
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <span key={i} style={{ display: "block", minHeight: line === "" ? "0.5em" : undefined }}>
        {line === "" ? null : parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") && part.length > 4
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : <span key={j}>{part}</span>
        )}
      </span>
    );
  });
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === "user") {
    return (
      <div className="animate-fade-in" style={{ padding: "4px 0" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0 12px", display: "flex", justifyContent: "flex-end" }}>
          <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "18px 18px 4px 18px", padding: "10px 16px", maxWidth: "80%" }}>
            <p style={{ color: "var(--color-text)", fontSize: 15, lineHeight: 1.65, whiteSpace: "pre-wrap", margin: 0 }}>{msg.content}</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="animate-fade-in group" style={{ padding: "12px 0" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 3 }}>
          <Bot size={13} style={{ color: "var(--color-text-secondary)" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "var(--color-text)", fontSize: 15, lineHeight: 1.75, paddingTop: 3 }}>{renderContent(msg.content)}</div>
          {msg.usage && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 10, color: "var(--color-muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <span>↑ {msg.usage.input.toLocaleString()}</span><span style={{ opacity: 0.4 }}>·</span>
              <span>↓ {msg.usage.output.toLocaleString()} tokens</span><span style={{ opacity: 0.4 }}>·</span>
              <span>{calcCost(msg.usage.input, msg.usage.output, msg.usage.model)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared input box ─────────────────────────────────────────────────────────

function InputBox({ input, setInput, streaming, onSend, onAttach, provider, model, models, onChangeProvider, onChangeModel, teams, teamId, onChangeTeam, teamsLoading, pendingAttachments, onRemoveAttachment }: {
  input: string; setInput: (v: string) => void; streaming: boolean;
  onSend: () => void; onAttach: () => void;
  provider: Provider; model: string; models: Array<{ value: string; label: string }>;
  onChangeProvider: (p: Provider) => void; onChangeModel: (m: string) => void;
  teams: Team[]; teamId: string; onChangeTeam: (id: string) => void; teamsLoading: boolean;
  pendingAttachments: PendingAttachment[]; onRemoveAttachment: (id: string) => void;
}) {
  const placeholder = teamId === "coordinator" ? "Tell the coordinator what needs to be done…"
    : teamId !== "all" ? `Message ${teams.find(t => t.id === teamId)?.name || "this team"}…`
    : "How can I help you today?";

  const canSend = (input.trim() || pendingAttachments.length > 0) && !streaming;

  return (
    <div style={{ width: "100%", maxWidth: 720 }}>
      {/* Attachment chips */}
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pendingAttachments.map(att => (
            <div key={att.id} className="flex items-center gap-1.5 rounded-lg" style={{ background: "var(--color-surface-2)", border: `1px solid ${att.status === "error" ? "rgba(224,107,107,0.4)" : "var(--color-border)"}`, padding: "4px 10px", fontSize: 12, color: "var(--color-text-secondary)" }}>
              {att.status === "processing" && <Loader2 size={11} className="animate-spin" style={{ color: "var(--color-muted)" }} />}
              {att.status === "ready" && att.type === "image" && att.previewUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={att.previewUrl} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover" }} />
                : att.type === "audio" ? <Mic size={11} /> : <FileText size={11} />}
              <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.filename}</span>
              {att.status === "error" && <span style={{ fontSize: 10, color: "var(--color-red)" }}>error</span>}
              <button onClick={() => onRemoveAttachment(att.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                <X size={11} style={{ color: "var(--color-muted)" }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input container */}
      <div
        className="glass-input flex flex-col"
        style={{ borderRadius: 16, padding: "14px 16px 10px" }}
      >
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder={placeholder}
          rows={1}
          style={{ background: "transparent", border: "none", outline: "none", color: "var(--color-text)", fontSize: 16, resize: "none", width: "100%", fontFamily: "inherit", lineHeight: 1.5, minHeight: 28 }}
        />
        {/* Bottom toolbar */}
        <div className="flex items-center justify-between mt-2">
          <button
            type="button" onClick={onAttach} disabled={streaming} title="Attach file"
            style={{ background: "none", border: "none", cursor: streaming ? "not-allowed" : "pointer", padding: "4px", display: "flex", alignItems: "center", color: "var(--color-muted)", borderRadius: 6, transition: "color 0.15s" }}
            onMouseEnter={e => !streaming && ((e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--color-muted)")}
          >
            <Plus size={16} />
          </button>

          <div className="flex items-center gap-2">
            <ModelDropdown
              provider={provider} model={model} models={models}
              onChangeProvider={onChangeProvider} onChangeModel={onChangeModel}
              teams={teams} teamId={teamId} onChangeTeam={onChangeTeam} teamsLoading={teamsLoading}
            />
            <button
              onClick={onSend} disabled={!canSend}
              style={{ background: canSend ? "var(--color-brand)" : "var(--color-surface-3)", borderRadius: 8, border: "none", cursor: canSend ? "pointer" : "not-allowed", padding: "6px 8px", display: "flex", alignItems: "center", transition: "background 0.15s" }}
            >
              {streaming
                ? <Loader2 size={14} className="animate-spin" style={{ color: canSend ? "#0a1628" : "var(--color-muted)" }} />
                : <Send size={14} style={{ color: canSend ? "#0a1628" : "var(--color-muted)" }} />}
            </button>
          </div>
        </div>
      </div>
      <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 6, textAlign: "center", opacity: 0.5 }}>
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ChatPageInner() {
  const { addToast } = useToast();
  const { data: session } = useSession();
  const search = useSearchParams();
  const firstName = (session?.user?.name ?? "").split(" ")[0] || "there";

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [provider, setProvider] = useState<Provider>("anthropic");
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [teamId, setTeamId] = useState("coordinator");

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [sessionUsage, setSessionUsage] = useState({ input: 0, output: 0 });
  const [lastUsageModel, setLastUsageModel] = useState("claude-sonnet-4-6");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [ollamaModels, setOllamaModels] = useState(PROVIDERS.ollama.models);

  type PlaygroundChip = { id: string; name: string; icon: string | null };
  const [playgroundChips, setPlaygroundChips] = useState<PlaygroundChip[]>([]);

  type MeetingReminder = { id: string; title: string; scheduledFor: string; reminderMins: number };
  const [meetingReminders, setMeetingReminders] = useState<MeetingReminder[]>([]);
  const [dismissedMeetings, setDismissedMeetings] = useState<Set<string>>(new Set());

  type ActiveAgent = { taskId: string; teamName: string; taskTitle: string; status: "running" | "done" | "error" | "blocked" };
  const [activeAgents, setActiveAgents] = useState<ActiveAgent[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingContent]);

  // Pre-fill input from ?q= query param (used by Overview quick chat)
  useEffect(() => {
    const q = search.get("q");
    if (q) setInput(q);
  }, [search]);

  // Chat-with picker: ?team=coordinator | ?team=<teamId> (sidebar links)
  useEffect(() => {
    const t = search.get("team");
    if (t) setTeamId(t);
  }, [search]);

  useEffect(() => {
    fetch("/api/teams").then(r => r.json()).then((data: Team[]) => setTeams(data.filter(t => !(t as unknown as { isSystemTeam?: boolean }).isSystemTeam))).catch(() => {}).finally(() => setTeamsLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/playgrounds")
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => { if (Array.isArray(data)) setPlaygroundChips((data as PlaygroundChip[]).slice(0, 3)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function check() {
      fetch("/api/meetings?upcoming=true").then(r => r.json()).then((m: MeetingReminder[]) => {
        const now = Date.now();
        setMeetingReminders(m.filter(x => { const t = new Date(x.scheduledFor).getTime(); return t > now && t - now <= x.reminderMins * 60000; }));
      }).catch(() => {});
    }
    check(); const iv = setInterval(check, 60000); return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    fetch("/api/ollama/models").then(r => r.json()).then(d => { if (d.running && d.models?.length > 0) setOllamaModels(d.models.map((m: { name: string }) => ({ value: m.name, label: m.name }))); }).catch(() => {});
  }, []);

  // Start on the user's default provider/model (set by the wizard from the keys they gave)
  useEffect(() => {
    fetch("/api/settings/provider-model")
      .then(r => r.ok ? r.json() : null)
      .then((d: { provider?: string; model?: string } | null) => {
        if (d?.provider && (["anthropic", "openai", "nvidia", "ollama"] as string[]).includes(d.provider)) {
          setProvider(d.provider as Provider);
          if (d.model) setModel(d.model);
        }
      })
      .catch(() => {});
  }, []);

  // Live agent activity via SSE
  useEffect(() => {
    const es = new EventSource("/api/notify/stream");
    es.onmessage = (e: MessageEvent) => {
      try {
        const ev = JSON.parse(e.data as string) as { type: string; taskId?: string; message: string; data?: Record<string, unknown> };
        if (ev.type === "TASK_STARTED") {
          setActiveAgents(prev => [...prev, {
            taskId: ev.taskId ?? Math.random().toString(36).slice(2),
            teamName: (ev.data?.teamName as string) ?? "Agent",
            taskTitle: (ev.data?.taskTitle as string) ?? ev.message,
            status: "running",
          }]);
        } else if (ev.type === "TASK_DONE") {
          setActiveAgents(prev => prev.map(a => a.taskId === ev.taskId ? { ...a, status: "done" } : a));
          setTimeout(() => setActiveAgents(prev => prev.filter(a => a.taskId !== ev.taskId)), 3000);
        } else if (ev.type === "ERROR") {
          setActiveAgents(prev => prev.map(a => a.taskId === ev.taskId ? { ...a, status: "error" } : a));
          setTimeout(() => setActiveAgents(prev => prev.filter(a => a.taskId !== ev.taskId)), 5000);
        } else if (ev.type === "MISSING_INFO") {
          setActiveAgents(prev => [...prev, {
            taskId: ev.taskId ?? Math.random().toString(36).slice(2),
            teamName: (ev.data?.teamName as string) ?? "Agent",
            taskTitle: (ev.data?.question as string) ?? ev.message,
            status: "blocked",
          }]);
        } else if (ev.type === "PLAN_DONE" || ev.type === "PLAN_BLOCKED") {
          setTimeout(() => setActiveAgents([]), 4000);
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    const team = teams.find(t => t.id === teamId);
    setMessages([getInitialMessage(teamId, team?.name)]);
  }, [teamId, teams]);

  function changeProvider(p: Provider) { setProvider(p); setModel((p === "ollama" ? ollamaModels : PROVIDERS[p].models)[0].value); }

  // ?c= opens a specific conversation (sidebar Recents), ?new=1 forces a fresh one,
  // otherwise resume the session conversation
  const cParam = search.get("c");
  const newParam = search.get("new");
  useEffect(() => {
    async function init() {
      try {
        if (newParam) {
          sessionStorage.removeItem(SESSION_KEY);
          setMessages(prev => (prev.length > 1 ? [prev[0]] : prev));
        }
        const storedId = cParam ?? (newParam ? null : sessionStorage.getItem(SESSION_KEY));
        if (storedId) {
          const res = await fetch(`/api/conversations/${storedId}`);
          if (res.ok) {
            const conv = await res.json();
            if (conv.messages?.length > 0) setMessages(prev => [prev[0], ...conv.messages.map((m: { id: string; role: "user" | "assistant"; content: string }) => ({ id: m.id, role: m.role, content: m.content }))]);
            sessionStorage.setItem(SESSION_KEY, storedId);
            setConversationId(storedId); return;
          }
        }
        const res = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        if (res.ok) { const conv = await res.json(); sessionStorage.setItem(SESSION_KEY, conv.id); setConversationId(conv.id); }
      } catch {} finally { setLoadingHistory(false); }
    }
    init();
  }, [cParam, newParam]);

  const saveMessage = useCallback(async (convId: string, role: "user" | "assistant", content: string) => {
    try { await fetch(`/api/conversations/${convId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, content }) }); } catch {}
  }, []);

  async function newConversation() {
    try {
      const res = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (res.ok) {
        const conv = await res.json(); sessionStorage.setItem(SESSION_KEY, conv.id); setConversationId(conv.id);
        setMessages([getInitialMessage(teamId, teams.find(t => t.id === teamId)?.name)]);
        setStreamingContent(""); setSessionUsage({ input: 0, output: 0 }); setPendingAttachments([]);
        addToast("New conversation started", "info");
      }
    } catch { addToast("Failed to start new conversation", "error"); }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { addToast(`${file.name} is too large (max 10MB)`, "error"); continue; }
      const id = `${Date.now()}-${Math.random()}`;
      const isImage = file.type.startsWith("image/");
      const isAudio = file.type.startsWith("audio/") || /\.(ogg|m4a|webm|wav|mp3)$/i.test(file.name);
      const attType: PendingAttachment["type"] = isImage ? "image" : isAudio ? "audio" : "text";
      setPendingAttachments(p => [...p, { id, filename: file.name, type: attType, status: "processing" }]);
      if (isImage) {
        const reader = new FileReader(); reader.onload = ev => { const d = ev.target?.result as string; setPendingAttachments(p => p.map(a => a.id === id ? { ...a, base64: d.split(",")[1], mimeType: file.type, previewUrl: d, status: "ready" } : a)); }; reader.readAsDataURL(file);
      } else if (isAudio) {
        const fd = new FormData(); fd.append("file", file);
        try { const res = await fetch("/api/transcribe", { method: "POST", body: fd }); const d = await res.json() as { transcript?: string; error?: string }; if (d.transcript) setPendingAttachments(p => p.map(a => a.id === id ? { ...a, transcript: d.transcript, status: "ready" } : a)); else { addToast(d.error ?? "Transcription failed", "error"); setPendingAttachments(p => p.map(a => a.id === id ? { ...a, status: "error" } : a)); } } catch { setPendingAttachments(p => p.map(a => a.id === id ? { ...a, status: "error" } : a)); }
      } else {
        const fd = new FormData(); fd.append("file", file);
        try { const res = await fetch("/api/files/extract", { method: "POST", body: fd }); const d = await res.json() as { text?: string; error?: string }; if (d.text) setPendingAttachments(p => p.map(a => a.id === id ? { ...a, content: d.text, status: "ready" } : a)); else { addToast(d.error ?? "Could not extract text", "error"); setPendingAttachments(p => p.map(a => a.id === id ? { ...a, status: "error" } : a)); } } catch { setPendingAttachments(p => p.map(a => a.id === id ? { ...a, status: "error" } : a)); }
      }
    }
    e.target.value = "";
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    if (pendingAttachments.some(a => a.status === "processing")) { addToast("Attachments still processing", "info"); return; }
    setInput("");
    const ready = pendingAttachments.filter(a => a.status === "ready");
    const audioLines = ready.filter(a => a.type === "audio" && a.transcript).map(a => `*Voice: "${a.transcript}"*`);
    const displayContent = audioLines.length > 0 ? `${audioLines.join("\n")}\n\n${content}` : content;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: displayContent };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages); setStreaming(true); setStreamingContent(""); setPendingAttachments([]);
    if (conversationId) saveMessage(conversationId, "user", displayContent);
    const history = nextMessages.filter(m => m.id !== "0").map(m => ({ role: m.role, content: m.content }));
    const attachmentsPayload: AttachmentPayload[] = ready.map(a => a.type === "image" ? { type: "image", base64: a.base64!, mimeType: a.mimeType!, filename: a.filename } : { type: "text", content: a.type === "audio" ? a.transcript ?? "" : a.content ?? "", filename: a.filename });
    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history, provider, model, teamId: teamId !== "all" ? teamId : undefined, attachments: attachmentsPayload.length > 0 ? attachmentsPayload : undefined }), signal: abortRef.current.signal });
      if (!res.ok) { const errText = await res.text(); setMessages(p => [...p, { id: Date.now().toString(), role: "assistant", content: `Error: ${errText}` }]); return; }
      const reader = res.body!.getReader(); const decoder = new TextDecoder(); let acc = "";
      while (true) { const { done, value } = await reader.read(); if (done) break; acc += decoder.decode(value, { stream: true }); setStreamingContent(acc.replace(/\n?\[USAGE:\{[^}]*\}\]/, "")); }
      let usageData: MessageUsage | undefined;
      const um = acc.match(/\[USAGE:(\{[^}]*\})\]/);
      if (um) { try { usageData = JSON.parse(um[1]) as MessageUsage; setLastUsageModel(usageData.model); setSessionUsage(p => ({ input: p.input + usageData!.input, output: p.output + usageData!.output })); acc = acc.replace(/\n?\[USAGE:\{[^}]*\}\]/, ""); } catch {} }
      const aMsg: Message = { id: Date.now().toString(), role: "assistant", content: acc, usage: usageData };
      setMessages(p => [...p, aMsg]); if (conversationId) saveMessage(conversationId, "assistant", acc);
    } catch (err: unknown) { if (err instanceof Error && err.name !== "AbortError") setMessages(p => [...p, { id: Date.now().toString(), role: "assistant", content: "Request failed. Check your API key and try again." }]); }
    finally { setStreaming(false); setStreamingContent(""); }
  }

  const currentModels = provider === "ollama" ? ollamaModels : PROVIDERS[provider].models;
  const suggestions = getSuggestions(teamId);
  const isEmptyState = messages.length <= 1 && !streaming;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-background)" }}>

      {/* Meeting reminders */}
      {meetingReminders.filter(m => !dismissedMeetings.has(m.id)).map(m => {
        const min = Math.round((new Date(m.scheduledFor).getTime() - Date.now()) / 60000);
        return (
          <div key={m.id} className="shrink-0 flex items-center gap-3 px-4 py-2" style={{ background: "rgba(232,184,74,0.08)", borderBottom: "1px solid rgba(232,184,74,0.18)" }}>
            <Calendar size={14} style={{ color: "#e8b84a", flexShrink: 0 }} />
            <p className="flex-1 text-xs font-medium" style={{ color: "#e8b84a" }}><span style={{ fontWeight: 700 }}>Meeting in {min} min:</span> {m.title}</p>
            <button onClick={() => setDismissedMeetings(p => new Set([...p, m.id]))} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#e8b84a", padding: 2 }}><X size={14} /></button>
          </div>
        );
      })}

      {/* Thin top bar — only shows when there are messages */}
      {!isEmptyState && (
        <div className="shrink-0 flex items-center justify-between px-4 py-2" style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            {teamId === "coordinator" ? "Coordinator Agent" : teamId !== "all" ? teams.find(t => t.id === teamId)?.name : "Agent Copilot"}
          </p>
          <button onClick={newConversation} className="btn-ghost flex items-center gap-1.5 px-2.5 py-1.5" style={{ fontSize: 12 }}>
            <Plus size={12} /> New chat
          </button>
        </div>
      )}

      {/* ── Empty state — Claude Desktop style centered ── */}
      {isEmptyState ? (
        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in" style={{ gap: 24, padding: "16px 16px 32px" }}>
          {/* Greeting row */}
          <div style={{ textAlign: "center" }}>
            <div className="flex items-center justify-center gap-3" style={{ marginBottom: 8 }}>
              <LogoMark size={36} />
              <h1 style={{ fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 400, color: "var(--color-text)", letterSpacing: "-0.025em", lineHeight: 1, margin: 0 }}>
                {getTimeGreeting()}, {firstName}
              </h1>
            </div>
            <p style={{ fontSize: 15, color: "var(--color-text-secondary)", margin: 0 }}>
              What would you like to work on today?
            </p>
          </div>

          {/* Centered input box */}
          <div style={{ width: "100%", maxWidth: 680, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <input ref={fileInputRef as React.RefObject<HTMLInputElement>} type="file" multiple className="hidden" accept="image/*,audio/*,.pdf,.txt,.md,.csv,.json,.py,.ts,.tsx,.js,.jsx,.sh,.yaml,.yml" onChange={handleFileSelect} />
            <InputBox
              input={input} setInput={setInput} streaming={streaming} onSend={() => send()} onAttach={() => fileInputRef.current?.click()}
              provider={provider} model={model} models={currentModels}
              onChangeProvider={changeProvider} onChangeModel={setModel}
              teams={teams} teamId={teamId} onChangeTeam={setTeamId} teamsLoading={teamsLoading}
              pendingAttachments={pendingAttachments} onRemoveAttachment={id => setPendingAttachments(p => p.filter(a => a.id !== id))}
            />
          </div>

          {/* Playground quick-access chips (if any), else default suggestions */}
          <div className="flex flex-wrap gap-2 justify-center" style={{ maxWidth: 640, padding: "0 8px" }}>
            {playgroundChips.length > 0 ? (
              playgroundChips.map(pg => (
                <a
                  key={pg.id}
                  href={`/playground/${pg.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", textDecoration: "none" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-light)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
                >
                  {pg.name}
                </a>
              ))
            ) : (
              suggestions.map(s => (
                <button
                  key={s.label} onClick={() => send(s.label)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-light)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
                >
                  {s.icon}{s.label}
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        /* ── Active chat layout ── */
        <>
          <div className="flex-1 overflow-y-auto" style={{ background: "var(--color-background)" }}>
            <div className="py-6 flex flex-col gap-1">
              {loadingHistory && <div className="flex justify-center py-4"><span style={{ fontSize: 12, color: "var(--color-muted)" }}>Loading history…</span></div>}
              {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
              {streaming && (
                <div className="animate-fade-in" style={{ padding: "12px 0" }}>
                  <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 12px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 3 }}>
                      <Bot size={13} style={{ color: "var(--color-text-secondary)" }} />
                    </div>
                    {streamingContent
                      ? <div style={{ color: "var(--color-text)", fontSize: 15, lineHeight: 1.75, paddingTop: 3 }}>{renderContent(streamingContent)}<span style={{ opacity: 0.4, marginLeft: 2 }}>▊</span></div>
                      : <div className="flex items-center gap-1.5 py-2">{[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "var(--color-muted)", display: "inline-block", animation: `blink 1.2s ease-in-out ${i*0.2}s infinite` }} />)}</div>
                    }
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Live agent activity strip */}
          {activeAgents.length > 0 && (
            <div className="shrink-0" style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-surface)", padding: "6px 0" }}>
              <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 12px", display: "flex", flexDirection: "column", gap: 3 }}>
                {activeAgents.map(agent => (
                  <div key={agent.taskId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    {agent.status === "running" && <Loader2 size={11} className="animate-spin" style={{ color: "var(--color-brand)", flexShrink: 0 }} />}
                    {agent.status === "done" && <span style={{ color: "var(--color-green)", flexShrink: 0, lineHeight: 1 }}>✓</span>}
                    {agent.status === "error" && <AlertCircle size={11} style={{ color: "var(--color-red)", flexShrink: 0 }} />}
                    {agent.status === "blocked" && <AlertCircle size={11} style={{ color: "#e8b84a", flexShrink: 0 }} />}
                    <span style={{ fontWeight: 600, color: "var(--color-text)", flexShrink: 0 }}>{agent.teamName}</span>
                    <span style={{ color: "var(--color-muted)", flexShrink: 0 }}>—</span>
                    <span style={{ color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{agent.taskTitle}</span>
                    {agent.status === "blocked" && <span style={{ fontSize: 10, color: "#e8b84a", flexShrink: 0, fontWeight: 500 }}>needs input</span>}
                    {agent.status === "done" && <span style={{ fontSize: 10, color: "var(--color-muted)", flexShrink: 0 }}>done</span>}
                    {agent.status === "error" && <span style={{ fontSize: 10, color: "var(--color-red)", flexShrink: 0 }}>failed</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Token bar */}
          {sessionUsage.input > 0 && (
            <div className="shrink-0 flex items-center gap-3" style={{ borderTop: "1px solid var(--color-border)", padding: "5px 24px", fontSize: 11, color: "var(--color-muted)" }}>
              <span>↑ {sessionUsage.input.toLocaleString()}</span><span style={{ opacity: 0.4 }}>·</span>
              <span>↓ {sessionUsage.output.toLocaleString()}</span><span style={{ opacity: 0.4 }}>·</span>
              <span style={{ color: "var(--color-text-secondary)" }}>{calcCost(sessionUsage.input, sessionUsage.output, lastUsageModel)}</span>
              <span style={{ marginLeft: "auto", opacity: 0.5 }}>{lastUsageModel}</span>
            </div>
          )}

          {/* Input at bottom when chatting */}
          <div className="shrink-0 py-4" style={{ background: "var(--color-background)" }}>
            <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 12px" }}>
              <input ref={fileInputRef as React.RefObject<HTMLInputElement>} type="file" multiple className="hidden" accept="image/*,audio/*,.pdf,.txt,.md,.csv,.json,.py,.ts,.tsx,.js,.jsx,.sh,.yaml,.yml" onChange={handleFileSelect} />
              <InputBox
                input={input} setInput={setInput} streaming={streaming} onSend={() => send()} onAttach={() => fileInputRef.current?.click()}
                provider={provider} model={model} models={currentModels}
                onChangeProvider={changeProvider} onChangeModel={setModel}
                teams={teams} teamId={teamId} onChangeTeam={setTeamId} teamsLoading={teamsLoading}
                pendingAttachments={pendingAttachments} onRemoveAttachment={id => setPendingAttachments(p => p.filter(a => a.id !== id))}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// useSearchParams requires a Suspense boundary in Next 15
export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}
