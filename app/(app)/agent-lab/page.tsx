"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/ToastProvider";
import { useLanguage } from "@/components/LanguageProvider";
import {
  Play,
  ChevronDown,
  Terminal,
  Clock,
  Square,
  Plus,
  Zap,
  Server,
  Share2,
  Upload,
  Download,
  Loader2,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  X,
  Send,
  Bot,
  User2,
  Sparkles,
  FileJson,
  Trash2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Team = {
  id: string;
  name: string;
  description: string;
  port: number;
  status: string;
  language: string;
  tasksCompleted: number;
  lastActivity: string;
  _count: { agents: number; tasks: number; skills: number };
};

type TeamDetail = Team & {
  agents: Agent[];
  skills: Skill[];
  cliFunctions: CliFunction[];
};

type Agent = {
  id: string;
  name: string;
  description: string | null;
  model: string;
  capabilities: string[];
  systemPrompt: string | null;
};

type Skill = {
  id: string;
  name: string;
  description: string;
  category: string;
};

type CliFunction = {
  id: string;
  name: string;
  command: string;
  description: string | null;
  dangerous: boolean;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type HistoryItem = {
  id: string;
  target: string;
  prompt: string;
  result: string;
  createdAt: string;
};

// ─── Inline markdown renderer ─────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const toolMatch = line.match(/⚡ \*Used tool: (\w+)\*/);
        if (toolMatch) {
          return (
            <span key={i} style={{ display: "block", margin: "4px 0" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "2px 9px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  background: "rgba(99,102,241,0.15)",
                  color: "rgba(165,180,252,0.95)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  fontWeight: 500,
                }}
              >
                ⚡ {toolMatch[1].replace(/_/g, " ")}
              </span>
            </span>
          );
        }
        return (
          <span key={i} style={{ display: "block", minHeight: line === "" ? "0.6em" : undefined }}>
            {line === "" ? null : renderInline(line)}
          </span>
        );
      })}
    </>
  );
}

// ─── TeamBuilderModal ─────────────────────────────────────────────────────────

function TeamBuilderModal({
  editTeam,
  onClose,
  onRefresh,
}: {
  editTeam?: Team;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { addToast } = useToast();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [previewTeamId, setPreviewTeamId] = useState<string | null>(editTeam?.id ?? null);
  const [previewData, setPreviewData] = useState<TeamDetail | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const apiMessagesRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadPreview = useCallback(async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}`);
      if (res.ok) setPreviewData(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    if (previewTeamId) loadPreview(previewTeamId);
  }, [previewTeamId, loadPreview]);

  useEffect(() => {
    const greeting: ChatMessage = {
      id: "init",
      role: "assistant",
      content: editTeam
        ? `I'm ready to help you modify **${editTeam.name}**.\n\nI can:\n- Add or update agents with specific roles and prompts\n- Add new skills or CLI functions\n- Change the team name or description\n- Schedule tasks for this team\n\nWhat would you like to change?`
        : `Let's build a new agent team!\n\nTell me:\n1. What is the purpose of this team?\n2. What kind of tasks should it handle?\n3. What tools or automations does it need?\n\nOr just describe what you need and I'll set everything up.`,
    };
    setMessages([greeting]);
    apiMessagesRef.current = [];
  }, [editTeam]);

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    const userText = input.trim();
    setInput("");

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: userText };
    setMessages((prev) => [...prev, userMsg]);
    apiMessagesRef.current = [...apiMessagesRef.current, { role: "user", content: userText }];

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
    setStreaming(true);
    abortRef.current = new AbortController();

    try {
      const systemContext = editTeam
        ? `The user is modifying an existing team. Team ID: "${editTeam.id}", Team Name: "${editTeam.name}". Use this team ID when calling create_agent, add_skill, add_cli_function, update_team, or list_team_details.`
        : undefined;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessagesRef.current, systemContext }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(await res.text());

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let needsRefresh = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });

        if (accumulated.includes("⚡ *Used tool:")) needsRefresh = true;

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
        );
      }

      apiMessagesRef.current = [
        ...apiMessagesRef.current,
        { role: "assistant", content: accumulated },
      ];

      if (needsRefresh) {
        onRefresh();
        if (!previewTeamId && !editTeam) {
          setTimeout(async () => {
            const r = await fetch("/api/teams");
            if (r.ok) {
              const teams: Team[] = await r.json();
              const filtered = teams.filter((t) => !(t as unknown as { isSystemTeam?: boolean }).isSystemTeam);
              if (filtered.length > 0) setPreviewTeamId(filtered[filtered.length - 1].id);
            }
          }, 600);
        } else if (previewTeamId) {
          setTimeout(() => loadPreview(previewTeamId), 600);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: "❌ Error: " + err.message } : m
          )
        );
        addToast("Chat failed — check your API key.", "error");
      }
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl animate-fade-in"
        style={{
          height: "min(90vh, 780px)",
          display: "flex",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "20px",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Left: Live Preview ── */}
        <div
          className="w-64 shrink-0 flex flex-col min-h-0"
          style={{ borderRight: "1px solid var(--color-border)" }}
        >
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <Zap size={13} style={{ color: "var(--color-text-secondary)" }} />
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {editTeam ? "Team" : "Building..."}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {!previewData ? (
              <div
                className="flex flex-col items-center justify-center h-full gap-3"
                style={{ color: "var(--color-muted)" }}
              >
                <Sparkles size={28} style={{ opacity: 0.35 }} />
                <p className="text-[11px] text-center" style={{ opacity: 0.5, lineHeight: 1.6 }}>
                  Your team will appear here as it&apos;s built
                </p>
              </div>
            ) : (
              <>
                {/* Team card */}
                <div className="glass-card p-3">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div
                      className="w-8 h-8 flex items-center justify-center shrink-0"
                      style={{ background: "var(--color-surface-3)", borderRadius: "9px" }}
                    >
                      <Zap size={14} style={{ color: "var(--color-text-secondary)" }} />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="font-semibold text-[13px] truncate"
                        style={{ color: "var(--color-text)" }}
                      >
                        {previewData.name}
                      </p>
                      <p
                        className="text-[11px] truncate"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {previewData.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex gap-3 text-[11px]"
                    style={{ color: "var(--color-muted)" }}
                  >
                    <span>{previewData.agents?.length ?? 0} agents</span>
                    <span>·</span>
                    <span>{previewData.skills?.length ?? 0} skills</span>
                    <span>·</span>
                    <span>:{previewData.port}</span>
                  </div>
                </div>

                {/* Agents */}
                {previewData.agents && previewData.agents.length > 0 && (
                  <div>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-1"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Agents
                    </p>
                    {previewData.agents.map((a) => (
                      <div key={a.id} className="glass-card p-2.5 mb-1.5">
                        <p
                          className="text-[12px] font-medium"
                          style={{ color: "var(--color-text)" }}
                        >
                          {a.name}
                        </p>
                        {a.description && (
                          <p
                            className="text-[11px] mt-0.5 line-clamp-2"
                            style={{ color: "var(--color-muted)" }}
                          >
                            {a.description}
                          </p>
                        )}
                        {a.capabilities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {a.capabilities.slice(0, 3).map((cap) => (
                              <span
                                key={cap}
                                className="text-[10px] px-1.5 py-0.5 rounded-full"
                                style={{
                                  background: "var(--color-surface-3)",
                                  color: "var(--color-text-secondary)",
                                }}
                              >
                                {cap}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Skills */}
                {previewData.skills && previewData.skills.length > 0 && (
                  <div>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-1"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Skills
                    </p>
                    {previewData.skills.map((s) => (
                      <div key={s.id} className="glass-card p-2.5 mb-1.5">
                        <p
                          className="text-[12px] font-medium"
                          style={{ color: "var(--color-text)" }}
                        >
                          {s.name}
                        </p>
                        <p
                          className="text-[11px] mt-0.5 line-clamp-2"
                          style={{ color: "var(--color-muted)" }}
                        >
                          {s.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* CLI Functions */}
                {previewData.cliFunctions && previewData.cliFunctions.length > 0 && (
                  <div>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-1"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      CLI Functions
                    </p>
                    {previewData.cliFunctions.map((f) => (
                      <div key={f.id} className="glass-card p-2.5 mb-1.5">
                        <p
                          className="text-[12px] font-medium"
                          style={{ color: "var(--color-text)" }}
                        >
                          {f.name}
                        </p>
                        <p
                          className="text-[10px] mt-0.5"
                          style={{
                            color: "var(--color-muted)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {f.command}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Right: Chat ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Header */}
          <div
            className="px-5 py-3.5 flex items-center justify-between shrink-0"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 flex items-center justify-center rounded-xl"
                style={{ background: "rgba(99,102,241,0.18)" }}
              >
                <Sparkles size={14} style={{ color: "rgba(165,180,252,1)" }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
                  {editTeam ? `Editing: ${editTeam.name}` : t("buildWithAI")}
                </p>
                <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                  {t("chatChanges")}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "var(--color-muted)", cursor: "pointer" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "transparent")
              }
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg"
                  style={{
                    background:
                      msg.role === "user"
                        ? "var(--color-surface-3)"
                        : "rgba(99,102,241,0.18)",
                    marginTop: "2px",
                  }}
                >
                  {msg.role === "user" ? (
                    <User2 size={13} style={{ color: "var(--color-text-secondary)" }} />
                  ) : (
                    <Bot size={13} style={{ color: "rgba(165,180,252,0.9)" }} />
                  )}
                </div>
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius:
                      msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background:
                      msg.role === "user"
                        ? "var(--color-surface-3)"
                        : "var(--color-surface-2)",
                    color: "var(--color-text)",
                    fontSize: "13.5px",
                    lineHeight: 1.65,
                  }}
                >
                  {msg.content === "" && streaming ? (
                    <span style={{ opacity: 0.45 }}>▊</span>
                  ) : (
                    <MessageContent content={msg.content} />
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-4 shrink-0" style={{ borderTop: "1px solid var(--color-border)" }}>
            <div className="flex gap-3 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={t("describeNeed")}
                rows={2}
                className="glass-input flex-1 px-3 py-2.5 text-sm resize-none"
                style={{ fontFamily: "inherit", lineHeight: "1.55" }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                className="btn-primary px-4 py-2.5 flex items-center gap-2 shrink-0"
              >
                {streaming ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
            <p className="text-[11px] mt-2" style={{ color: "var(--color-muted)" }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ImportModal ──────────────────────────────────────────────────────────────

function ImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const { addToast } = useToast();
  const [json, setJson] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImport() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      addToast("Invalid JSON — check the format and try again", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/import-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
      }
      addToast("Team imported successfully!", "success");
      onImported();
      onClose();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Import failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setJson((ev.target?.result as string) || "");
    reader.readAsText(file);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-card p-6 w-full max-w-lg animate-fade-in"
        style={{ border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <FileJson size={17} style={{ color: "var(--color-text-secondary)" }} />
            <h2 className="font-semibold text-base" style={{ color: "var(--color-text)" }}>
              Import Agent Team
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              color: "var(--color-muted)",
              cursor: "pointer",
              background: "none",
              border: "none",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-ghost flex items-center gap-2 px-4 py-3 w-full justify-center"
            style={{
              border: "1px dashed var(--color-border)",
              borderRadius: "12px",
              fontSize: "13px",
            }}
          >
            <Upload size={14} />
            Upload .json file
          </button>

          <div className="flex items-center gap-3">
            <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
            <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
              or paste JSON
            </span>
            <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
          </div>

          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder={'{\n  "name": "My Team",\n  "description": "...",\n  "agents": []\n}'}
            rows={8}
            className="glass-input px-3 py-2.5 w-full resize-none"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--color-text)",
            }}
          />

          <button
            onClick={handleImport}
            disabled={!json.trim() || submitting}
            className="btn-primary flex items-center justify-center gap-2 py-2.5"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {submitting ? "Importing..." : "Import Team"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentLabPage() {
  const { addToast } = useToast();
  const { t } = useLanguage();

  // Teams
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  // Playground
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [target, setTarget] = useState("All Teams");
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Modals
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderEditTeam, setBuilderEditTeam] = useState<Team | undefined>(undefined);
  const [showImport, setShowImport] = useState(false);
  const [deleteTeam, setDeleteTeam] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState(false);

  const targets = ["All Teams", ...teams.map((t) => t.name)];

  async function fetchTeams() {
    setTeamsLoading(true);
    setTeamsError(null);
    try {
      const res = await fetch("/api/teams");
      if (!res.ok) throw new Error("Failed to load teams");
      const data: Team[] = await res.json();
      setTeams(data.filter((t) => !(t as unknown as { isSystemTeam?: boolean }).isSystemTeam));
    } catch (err) {
      setTeamsError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setTeamsLoading(false);
    }
  }

  async function fetchHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/playground-runs");
      if (res.ok) setHistory(await res.json());
    } catch {}
    finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    fetchTeams();
    fetchHistory();
  }, []);

  // ── Export ──
  async function exportTeam(teamId: string, teamName: string) {
    try {
      const res = await fetch(`/api/export-team/${teamId}`);
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${teamName.toLowerCase().replace(/\s+/g, "-")}-team.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast("Team exported!", "success");
    } catch {
      addToast("Export failed", "error");
    }
  }

  // ── Share (copy JSON to clipboard) ──
  async function shareTeam(teamId: string) {
    try {
      const res = await fetch(`/api/export-team/${teamId}`);
      if (!res.ok) throw new Error("Share failed");
      const data = await res.json();
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      addToast("Team JSON copied to clipboard!", "success");
    } catch {
      addToast("Share failed", "error");
    }
  }

  // ── Playground ──
  async function runTask() {
    if (!prompt.trim() || running) return;
    setRunning(true);
    setOutput("");
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, prompt }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        setOutput(`✗ Error: ${await res.text()}`);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setOutput(accumulated);
      }

      fetch("/api/playground-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, prompt, result: accumulated }),
      })
        .then(async (r) => {
          if (r.ok) {
            const run = await r.json();
            setHistory((prev) => [run, ...prev].slice(0, 20));
          }
        })
        .catch(() => {});
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setOutput("✗ Request failed. Check your API key in .env.local.");
        addToast("Task failed. Check your API key.", "error");
      }
    } finally {
      setRunning(false);
    }
  }

  function formatTimestamp(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    return d.toDateString() === now.toDateString()
      ? `Today ${time}`
      : `${d.toLocaleDateString()} ${time}`;
  }

  async function handleDeleteTeam() {
    if (!deleteTeam) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/teams/${deleteTeam.id}`, { method: "DELETE" });
      if (res.ok) {
        addToast(`${deleteTeam.name} deleted`, "success");
        setDeleteTeam(null);
        setSelectedTeam(null);
        fetchTeams();
      } else {
        addToast("Failed to delete team", "error");
      }
    } catch {
      addToast("Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
    <div className="flex flex-col gap-5 p-6 max-w-6xl mx-auto w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            {t("agentLab")}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            {t("agentLabDesc")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="btn-ghost flex items-center gap-2 px-3 py-2"
            style={{ fontSize: "13px" }}
          >
            <Upload size={14} />
            Import
          </button>
          <button
            onClick={() => {
              setBuilderEditTeam(undefined);
              setShowBuilder(true);
            }}
            className="btn-primary flex items-center gap-2 px-4 py-2.5"
          >
            <Plus size={15} />
            {t("newTeam")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* ── Left panel: Agent Teams ── */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2
              className="font-semibold text-xs uppercase tracking-wider"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {t("agentTeams")}
            </h2>
            {teamsLoading && (
              <Loader2 size={13} className="animate-spin" style={{ color: "var(--color-muted)" }} />
            )}
          </div>

          {teamsError && (
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{
                background: "var(--color-red-dim)",
                border: "1px solid rgba(248,113,113,0.2)",
              }}
            >
              <AlertCircle size={13} style={{ color: "var(--color-red)" }} />
              <p className="text-xs flex-1" style={{ color: "var(--color-red)" }}>
                {teamsError}
              </p>
              <button onClick={fetchTeams}>
                <RefreshCw size={11} style={{ color: "var(--color-red)" }} />
              </button>
            </div>
          )}

          {teamsLoading && teams.length === 0 &&
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass-card p-4 animate-pulse"
                style={{ height: "96px" }}
              />
            ))}

          {teams.map((t) => {
            const isSelected = selectedTeam === t.id;
            const statusColor =
              t.status === "healthy"
                ? "var(--color-green)"
                : t.status === "error"
                ? "var(--color-red)"
                : t.status === "idle"
                ? "var(--color-yellow)"
                : "var(--color-text-secondary)";

            return (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTeam(isSelected ? null : t.id);
                  if (!isSelected) setTarget(t.name);
                }}
                className="glass-card-interactive p-4 text-left"
                style={{
                  borderTopWidth: "2px",
                  borderTopColor: isSelected ? statusColor : "transparent",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center w-9 h-9 shrink-0"
                      style={{ background: "var(--color-surface-3)", borderRadius: "10px" }}
                    >
                      <Zap size={16} style={{ color: "var(--color-text-secondary)" }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
                        {t.name}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                        {t.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>

                <div className="flex gap-5 mt-3">
                  {[
                    { label: "Agents", value: String(t._count.agents) },
                    { label: "Tasks", value: String(t.tasksCompleted) },
                    { label: "Port", value: `:${t.port}`, mono: true },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                        {stat.label}
                      </p>
                      <p
                        className="text-[12px]"
                        style={{
                          color: "var(--color-text)",
                          fontFamily: stat.mono ? "var(--font-mono)" : "inherit",
                        }}
                      >
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {isSelected && (
                  <div
                    className="mt-3 pt-3 flex flex-col gap-2.5 animate-fade-in"
                    style={{ borderTop: "1px solid var(--color-border)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Server size={12} style={{ color: "var(--color-muted)" }} />
                      <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                        Runtime:
                      </span>
                      <span className="text-[11px]" style={{ color: "var(--color-text)" }}>
                        {t.language}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setBuilderEditTeam(t);
                          setShowBuilder(true);
                        }}
                        className="btn-ghost px-3 py-1.5 flex items-center gap-1.5"
                        style={{ fontSize: "12px" }}
                      >
                        <MessageSquare size={11} />
                        {t("chatToEdit")}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          shareTeam(t.id);
                        }}
                        className="btn-ghost px-3 py-1.5 flex items-center gap-1.5"
                        style={{ fontSize: "12px" }}
                      >
                        <Share2 size={11} />
                        Share
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportTeam(t.id, t.name);
                        }}
                        className="btn-ghost px-3 py-1.5 flex items-center gap-1.5"
                        style={{ fontSize: "12px" }}
                      >
                        <Download size={11} />
                        Export
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTeam(t);
                        }}
                        className="btn-ghost px-3 py-1.5 flex items-center gap-1.5"
                        style={{ fontSize: "12px", color: "var(--color-red)" }}
                      >
                        <Trash2 size={11} />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </button>
            );
          })}

          {/* Create new team card */}
          <button
            onClick={() => {
              setBuilderEditTeam(undefined);
              setShowBuilder(true);
            }}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-[14px] transition-all duration-200 cursor-pointer"
            style={{
              border: "1px dashed var(--color-border)",
              background: "transparent",
              minHeight: "90px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
            }}
          >
            <div
              className="flex items-center justify-center w-9 h-9"
              style={{ background: "rgba(255,255,255,0.07)", borderRadius: "10px" }}
            >
              <Sparkles size={15} style={{ color: "var(--color-text-secondary)" }} />
            </div>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              {t("buildNewTeam")}
            </p>
          </button>
        </div>

        {/* ── Right panel: Playground ── */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <h2
            className="font-semibold text-xs uppercase tracking-wider"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Playground
          </h2>

          <div className="glass-card p-5 flex flex-col gap-4">
            {/* Target selector */}
            <div className="flex items-center gap-3">
              <span
                className="text-xs shrink-0 font-medium"
                style={{ color: "var(--color-muted)" }}
              >
                Target
              </span>
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="glass-input flex items-center gap-2 px-3 py-2 text-sm"
                  style={{ cursor: "pointer" }}
                >
                  <span style={{ color: "var(--color-text)" }}>{target}</span>
                  <ChevronDown
                    size={14}
                    style={{
                      color: "var(--color-muted)",
                      transition: "transform 0.2s",
                      transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </button>
                {dropdownOpen && (
                  <div
                    className="glass-panel animate-fade-in"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      zIndex: 10,
                      minWidth: "180px",
                      overflow: "hidden",
                    }}
                  >
                    {targets.map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setTarget(t);
                          setDropdownOpen(false);
                        }}
                        style={{
                          backgroundColor:
                            t === target ? "rgba(255,255,255,0.08)" : "transparent",
                          color: "var(--color-text)",
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 14px",
                          fontSize: "13px",
                          border: "none",
                          cursor: "pointer",
                        }}
                        className="hover:bg-white/[0.05] transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want the agent to do..."
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) runTask();
              }}
              className="glass-input"
              style={{
                resize: "none",
                fontFamily: "inherit",
                fontSize: "14px",
                padding: "12px",
                lineHeight: "1.6",
              }}
            />

            <div className="flex items-center justify-between">
              <span
                className="text-[11px] flex items-center gap-1.5"
                style={{ color: "var(--color-muted)" }}
              >
                <kbd
                  className="px-1.5 py-0.5 rounded text-[10px]"
                  style={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  ⌘
                </kbd>
                <span>+</span>
                <kbd
                  className="px-1.5 py-0.5 rounded text-[10px]"
                  style={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  Enter
                </kbd>
                <span>to run</span>
              </span>
              <div className="flex gap-2">
                {running && (
                  <button
                    onClick={() => {
                      abortRef.current?.abort();
                      setRunning(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                    style={{
                      background: "var(--color-red-dim)",
                      color: "var(--color-red)",
                      border: "1px solid rgba(248,113,113,0.2)",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    <Square size={12} />
                    Stop
                  </button>
                )}
                <button
                  onClick={runTask}
                  disabled={!prompt.trim() || running}
                  className="btn-primary flex items-center gap-2 px-5 py-2"
                >
                  <Play size={13} />
                  {running ? "Running..." : "Run Task"}
                </button>
              </div>
            </div>
          </div>

          {(output || running) && (
            <div className="glass-card p-4" style={{ background: "rgba(6,6,14,0.8)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Terminal size={13} style={{ color: "var(--color-muted)" }} />
                <span
                  className="text-[11px] font-medium"
                  style={{ color: "var(--color-muted)" }}
                >
                  Output — {target}
                </span>
              </div>
              <pre
                style={{
                  color: "var(--color-text)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  lineHeight: "1.7",
                  whiteSpace: "pre-wrap",
                  margin: 0,
                }}
              >
                {output}
                {running && !output && (
                  <span style={{ color: "var(--color-muted)" }}>Connecting...</span>
                )}
                {running && <span style={{ opacity: 0.5 }}>▊</span>}
              </pre>
            </div>
          )}

          {!historyLoading && history.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={13} style={{ color: "var(--color-muted)" }} />
                <h2
                  className="font-semibold text-xs uppercase tracking-wider"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Run History
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                {history.slice(0, 5).map((h) => (
                  <div
                    key={h.id}
                    className="glass-card-interactive px-4 py-3"
                    onClick={() => {
                      setTarget(h.target);
                      setPrompt(h.prompt);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: "var(--color-text)" }}
                      >
                        {h.target}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                        {formatTimestamp(h.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm mb-0.5" style={{ color: "var(--color-text)" }}>
                      {h.prompt}
                    </p>
                    <p
                      className="truncate text-[12px]"
                      style={{
                        color: "var(--color-green)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {h.result.slice(0, 120).replace(/\n/g, " ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {historyLoading && (
            <div className="glass-card p-4 animate-pulse" style={{ height: "80px" }} />
          )}
        </div>
      </div>

    </div>

      {/* ── Modals — outside animated wrapper so fixed positioning uses viewport ── */}
      {showBuilder && (
        <TeamBuilderModal
          editTeam={builderEditTeam}
          onClose={() => setShowBuilder(false)}
          onRefresh={fetchTeams}
        />
      )}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={fetchTeams}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => !deleting && setDeleteTeam(null)}
        >
          <div
            className="glass-card p-6 flex flex-col gap-4 w-full max-w-sm animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
                  {t("deleteTeam")}
                </h3>
                <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                  {t("deleteTeamDesc")} <strong style={{ color: "var(--color-text)" }}>{deleteTeam.name}</strong> {t("deleteTeamDesc2")}
                </p>
              </div>
              <button
                onClick={() => setDeleteTeam(null)}
                disabled={deleting}
                style={{ color: "var(--color-muted)", background: "transparent", border: "none", cursor: "pointer", padding: "2px" }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTeam(null)}
                disabled={deleting}
                className="btn-ghost px-4 py-2"
                style={{ fontSize: "13px" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTeam}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  fontSize: "13px",
                  background: "rgba(248,113,113,0.15)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  color: "var(--color-red)",
                  cursor: deleting ? "not-allowed" : "pointer",
                }}
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {deleting ? "Deleting..." : "Delete team"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
