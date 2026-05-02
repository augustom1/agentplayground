"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  Zap,
  Plus,
  ChevronDown,
  Globe,
  Network,
  Loader2,
  Sparkles,
  Search,
  Eye,
  Users,
  Paperclip,
  Mic,
  FileText,
  X,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageUsage = { input: number; output: number; model: string };

type PendingAttachment = {
  id: string;
  filename: string;
  type: "image" | "audio" | "text" | "other";
  base64?: string;
  mimeType?: string;
  transcript?: string;
  content?: string;
  previewUrl?: string;
  status: "processing" | "ready" | "error";
};

type AttachmentPayload =
  | { type: "image"; base64: string; mimeType: string; filename?: string }
  | { type: "text"; content: string; filename: string };

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  usage?: MessageUsage;
};

type Team = {
  id: string;
  name: string;
  status: string;
  _count: { agents: number };
};

type Provider = "anthropic" | "openai" | "ollama";

type ProviderConfig = {
  label: string;
  color: string;
  models: Array<{ value: string; label: string }>;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const PROVIDERS: Record<Provider, ProviderConfig> = {
  anthropic: {
    label: "Anthropic",
    color: "#a78bfa",
    models: [
      { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
      { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
    ],
  },
  openai: {
    label: "OpenAI",
    color: "#34d399",
    models: [
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o mini" },
      { value: "o1-mini", label: "o1-mini" },
    ],
  },
  ollama: {
    label: "Ollama",
    color: "#fb923c",
    models: [
      { value: "llama3", label: "Llama 3" },
      { value: "llama3.1", label: "Llama 3.1" },
      { value: "mistral", label: "Mistral" },
      { value: "codellama", label: "CodeLlama" },
      { value: "gemma2", label: "Gemma 2" },
    ],
  },
};

const SESSION_KEY = "chat_conversation_id";

// ─── Token cost helper ────────────────────────────────────────────────────────

function calcCost(input: number, output: number, model: string): string {
  const rates: Record<string, { in: number; out: number }> = {
    "claude-sonnet-4-6":        { in: 0.003,   out: 0.015   },
    "claude-opus-4-6":          { in: 0.015,   out: 0.075   },
    "claude-haiku-4-5-20251001":{ in: 0.00025, out: 0.00125 },
  };
  const rate = rates[model] ?? rates["claude-sonnet-4-6"];
  const cost = (input / 1000) * rate.in + (output / 1000) * rate.out;
  return cost < 0.001 ? "<$0.001" : `$${cost.toFixed(3)}`;
}

// ─── Greeting & suggestions by mode ──────────────────────────────────────────

function getGreeting(teamId: string, teamName?: string): Message {
  if (teamId === "coordinator") {
    return {
      id: "0",
      role: "assistant",
      content:
        "I'm the **Coordinator Agent** — I have visibility into all your agent teams and can route tasks, delegate work, and orchestrate multi-team workflows.\n\nTell me what you need done and I'll assign it to the right team.",
    };
  }
  if (teamId !== "all" && teamName) {
    return {
      id: "0",
      role: "assistant",
      content: `You're now connected to the **${teamName}** team.\n\nI have full context of this team's agents, skills, and capabilities. What would you like to accomplish?`,
    };
  }
  return {
    id: "0",
    role: "assistant",
    content:
      "Hey! I'm your agent copilot. I have visibility into all your agent teams.\n\nI can help you create teams, run tasks, do web research, build chatbots, and automate processes — just tell me what you need.",
  };
}

function getSuggestions(teamId: string): string[] {
  if (teamId === "coordinator") {
    return [
      "Route this task to the best team: create a weekly SEO report",
      "Which team should handle customer support automation?",
      "Delegate a data analysis task to the right team",
      "Coordinate a product launch across all teams",
    ];
  }
  return [
    "Search the web for AI agent frameworks in 2025",
    "Create a marketing team with 3 specialized agents",
    "Build a customer support chatbot for our website",
    "Schedule a daily data processing task",
    "Browse https://example.com and summarize it",
  ];
}

// ─── Inline dropdown component ─────────────────────────────────────────────────

function Dropdown<T extends string>({
  value,
  options,
  onChange,
  renderLabel,
  renderOption,
  minWidth = 160,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  renderLabel: (v: T) => React.ReactNode;
  renderOption: (v: T) => React.ReactNode;
  minWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors"
        style={{
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border)",
          fontSize: "12px",
          color: "var(--color-text)",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {renderLabel(value)}
        <ChevronDown
          size={11}
          style={{
            color: "var(--color-muted)",
            transition: "transform 0.15s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {open && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 50,
            minWidth,
            overflow: "hidden",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className="hover:bg-white/[0.05] transition-colors"
              style={{
                backgroundColor: opt === value ? "rgba(255,255,255,0.07)" : "transparent",
                color: "var(--color-text)",
                width: "100%",
                textAlign: "left",
                padding: "8px 14px",
                fontSize: "12px",
                border: "none",
                cursor: "pointer",
                display: "block",
              }}
            >
              {renderOption(opt)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function renderContent(content: string) {
  const lines = content.split("\n");
  return lines.map((line, i) => {
    const toolMatch = line.match(/⚡ \*Used tool: (\w+)\*/);
    if (toolMatch) {
      const toolIcons: Record<string, React.ReactNode> = {
        web_search: <Search size={10} />,
        web_browse: <Eye size={10} />,
        create_team: <Zap size={10} />,
        create_agent: <Bot size={10} />,
        delegate_to_team: <Network size={10} />,
      };
      const icon = toolIcons[toolMatch[1]] || <Sparkles size={10} />;
      return (
        <span key={i} style={{ display: "block", margin: "3px 0" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "2px 8px",
              borderRadius: "6px",
              fontSize: "11px",
              background: "rgba(99,102,241,0.12)",
              color: "rgba(167,139,250,0.95)",
              border: "1px solid rgba(99,102,241,0.2)",
              fontWeight: 500,
            }}
          >
            {icon} {toolMatch[1].replace(/_/g, " ")}
          </span>
        </span>
      );
    }
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <span key={i} style={{ display: "block", minHeight: line === "" ? "0.5em" : undefined }}>
        {line === ""
          ? null
          : parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
                <strong key={j}>{part.slice(2, -2)}</strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
      </span>
    );
  });
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === "user") {
    return (
      <div className="animate-fade-in" style={{ padding: "4px 0" }}>
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              background: "var(--color-surface-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "18px 18px 4px 18px",
              padding: "10px 16px",
              maxWidth: "80%",
            }}
          >
            <p
              style={{
                color: "var(--color-text)",
                fontSize: "15px",
                lineHeight: "1.65",
                whiteSpace: "pre-wrap",
                margin: 0,
              }}
            >
              {msg.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in group" style={{ padding: "12px 0", position: "relative" }}>
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: "3px",
          }}
        >
          <Bot size={14} style={{ color: "var(--color-text-secondary)" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: "var(--color-text)",
              fontSize: "15px",
              lineHeight: "1.75",
              paddingTop: "3px",
            }}
          >
            {renderContent(msg.content)}
          </div>
          {msg.usage && (
            <div
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                fontSize: "10px",
                color: "var(--color-muted)",
                marginTop: "4px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>↑ {msg.usage.input.toLocaleString()}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>↓ {msg.usage.output.toLocaleString()} tokens</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{calcCost(msg.usage.input, msg.usage.output, msg.usage.model)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { addToast } = useToast();

  // Conversation
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Config
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [model, setModel] = useState<string>("claude-sonnet-4-6");
  const [teamId, setTeamId] = useState<string>("coordinator");

  // Teams
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  // Token usage tracking
  const [sessionUsage, setSessionUsage] = useState({ input: 0, output: 0 });
  const [lastUsageModel, setLastUsageModel] = useState<string>("claude-sonnet-4-6");

  // Attachments
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);

  // Dynamic Ollama models
  const [ollamaModels, setOllamaModels] = useState(PROVIDERS.ollama.models);

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Fetch teams
  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((data: Team[]) => {
        setTeams(data.filter((t) => !(t as unknown as { isSystemTeam?: boolean }).isSystemTeam));
      })
      .catch(() => {})
      .finally(() => setTeamsLoading(false));
  }, []);

  // Fetch dynamic Ollama models
  useEffect(() => {
    fetch("/api/ollama/models")
      .then(r => r.json())
      .then(data => {
        if (data.running && data.models?.length > 0) {
          setOllamaModels(data.models.map((m: { name: string }) => ({
            value: m.name,
            label: m.name,
          })));
        }
      })
      .catch(() => {});
  }, []);

  // Set greeting when team changes
  useEffect(() => {
    const team = teams.find((t) => t.id === teamId);
    setMessages([getGreeting(teamId, team?.name)]);
  }, [teamId, teams]);

  // Update model when provider changes
  function changeProvider(p: Provider) {
    setProvider(p);
    const models = p === "ollama" ? ollamaModels : PROVIDERS[p].models;
    setModel(models[0].value);
  }

  // Load or create conversation
  useEffect(() => {
    async function init() {
      try {
        const storedId = sessionStorage.getItem(SESSION_KEY);
        if (storedId) {
          const res = await fetch(`/api/conversations/${storedId}`);
          if (res.ok) {
            const conv = await res.json();
            if (conv.messages?.length > 0) {
              setMessages((prev) => [
                prev[0],
                ...conv.messages.map((m: { id: string; role: "user" | "assistant"; content: string }) => ({
                  id: m.id,
                  role: m.role,
                  content: m.content,
                })),
              ]);
            }
            setConversationId(storedId);
            return;
          }
        }
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (res.ok) {
          const conv = await res.json();
          sessionStorage.setItem(SESSION_KEY, conv.id);
          setConversationId(conv.id);
        }
      } catch {}
      finally {
        setLoadingHistory(false);
      }
    }
    init();
  }, []);

  const saveMessage = useCallback(
    async (convId: string, role: "user" | "assistant", content: string) => {
      try {
        await fetch(`/api/conversations/${convId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, content }),
        });
      } catch {}
    },
    []
  );

  async function newConversation() {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (res.ok) {
        const conv = await res.json();
        sessionStorage.setItem(SESSION_KEY, conv.id);
        setConversationId(conv.id);
        const team = teams.find((t) => t.id === teamId);
        setMessages([getGreeting(teamId, team?.name)]);
        setStreamingContent("");
        setSessionUsage({ input: 0, output: 0 });
        setPendingAttachments([]);
        addToast("New conversation started", "info");
      }
    } catch {
      addToast("Failed to start new conversation", "error");
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        addToast(`${file.name} is too large (max 10MB)`, "error");
        continue;
      }

      const id = `${Date.now()}-${Math.random()}`;
      const isImage = file.type.startsWith("image/");
      const isAudio = file.type.startsWith("audio/") || /\.(ogg|m4a|webm|wav|mp3)$/i.test(file.name);
      const attType: PendingAttachment["type"] = isImage ? "image" : isAudio ? "audio" : "text";

      setPendingAttachments((prev) => [
        ...prev,
        { id, filename: file.name, type: attType, status: "processing" },
      ]);

      if (isImage) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          const base64 = dataUrl.split(",")[1];
          setPendingAttachments((prev) =>
            prev.map((a) =>
              a.id === id
                ? { ...a, base64, mimeType: file.type, previewUrl: dataUrl, status: "ready" }
                : a
            )
          );
        };
        reader.readAsDataURL(file);
      } else if (isAudio) {
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          const data = (await res.json()) as { transcript?: string; error?: string };
          if (data.transcript) {
            setPendingAttachments((prev) =>
              prev.map((a) => (a.id === id ? { ...a, transcript: data.transcript, status: "ready" } : a))
            );
          } else {
            addToast(data.error ?? "Transcription failed", "error");
            setPendingAttachments((prev) =>
              prev.map((a) => (a.id === id ? { ...a, status: "error" } : a))
            );
          }
        } catch {
          setPendingAttachments((prev) =>
            prev.map((a) => (a.id === id ? { ...a, status: "error" } : a))
          );
        }
      } else {
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch("/api/files/extract", { method: "POST", body: formData });
          const data = (await res.json()) as { text?: string; error?: string };
          if (data.text) {
            setPendingAttachments((prev) =>
              prev.map((a) => (a.id === id ? { ...a, content: data.text, status: "ready" } : a))
            );
          } else {
            addToast(data.error ?? "Could not extract text from file", "error");
            setPendingAttachments((prev) =>
              prev.map((a) => (a.id === id ? { ...a, status: "error" } : a))
            );
          }
        } catch {
          setPendingAttachments((prev) =>
            prev.map((a) => (a.id === id ? { ...a, status: "error" } : a))
          );
        }
      }
    }

    e.target.value = "";
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    // Wait for any in-flight attachment processing
    const hasProcessing = pendingAttachments.some((a) => a.status === "processing");
    if (hasProcessing) {
      addToast("Attachments are still processing, please wait", "info");
      return;
    }

    setInput("");

    // Build display content for the user message bubble
    const readyAttachments = pendingAttachments.filter((a) => a.status === "ready");
    const audioLines = readyAttachments
      .filter((a) => a.type === "audio" && a.transcript)
      .map((a) => `🎤 *Voice: "${a.transcript}"*`);
    const displayContent = audioLines.length > 0 ? `${audioLines.join("\n")}\n\n${content}` : content;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: displayContent };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setStreaming(true);
    setStreamingContent("");
    setPendingAttachments([]);

    if (conversationId) saveMessage(conversationId, "user", displayContent);

    const history = nextMessages
      .filter((m) => m.id !== "0")
      .map((m) => ({ role: m.role, content: m.content }));

    // Build attachments payload for API (Anthropic vision format)
    const attachmentsPayload: AttachmentPayload[] = readyAttachments.map((a) => {
      if (a.type === "image") {
        return { type: "image", base64: a.base64!, mimeType: a.mimeType!, filename: a.filename };
      }
      const textContent =
        a.type === "audio" ? a.transcript ?? "" : a.content ?? "";
      return { type: "text", content: textContent, filename: a.filename };
    });

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          provider,
          model,
          teamId: teamId !== "all" ? teamId : undefined,
          attachments: attachmentsPayload.length > 0 ? attachmentsPayload : undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: "assistant", content: `⚠ Error: ${err}` },
        ]);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        // Stream display: strip sentinel if already in buffer
        const displayText = accumulated.replace(/\n?\[USAGE:\{[^}]*\}\]/, "");
        setStreamingContent(displayText);
      }

      // Parse and strip usage sentinel
      let usageData: MessageUsage | undefined;
      const usageMatch = accumulated.match(/\[USAGE:(\{[^}]*\})\]/);
      if (usageMatch) {
        try {
          usageData = JSON.parse(usageMatch[1]) as MessageUsage;
          setLastUsageModel(usageData.model);
          setSessionUsage(prev => ({
            input: prev.input + usageData!.input,
            output: prev.output + usageData!.output,
          }));
          accumulated = accumulated.replace(/\n?\[USAGE:\{[^}]*\}\]/, "");
        } catch {}
      }

      const assistantMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: accumulated,
        usage: usageData,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (conversationId) saveMessage(conversationId, "assistant", accumulated);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: "⚠ Request failed. Check your API key and try again.",
          },
        ]);
      }
    } finally {
      setStreaming(false);
      setStreamingContent("");
    }
  }

  // ── Team selector options ──
  type TeamOption = string;
  const teamOptions: TeamOption[] = ["all", "coordinator", ...teams.map((t) => t.id)];

  function teamLabel(id: TeamOption): React.ReactNode {
    if (id === "all")
      return (
        <span className="flex items-center gap-1.5">
          <Globe size={11} style={{ color: "var(--color-muted)" }} />
          All Teams
        </span>
      );
    if (id === "coordinator")
      return (
        <span className="flex items-center gap-1.5">
          <Network size={11} style={{ color: "#a78bfa" }} />
          Coordinator
        </span>
      );
    const t = teams.find((t) => t.id === id);
    return (
      <span className="flex items-center gap-1.5">
        <Zap size={11} style={{ color: "var(--color-muted)" }} />
        {t?.name || id}
      </span>
    );
  }

  function teamOptionLabel(id: TeamOption): React.ReactNode {
    if (id === "all")
      return (
        <span className="flex items-center gap-2">
          <Globe size={12} style={{ color: "var(--color-muted)" }} />
          <span>All Teams</span>
          <span style={{ fontSize: "10px", color: "var(--color-muted)", marginLeft: "auto" }}>
            general
          </span>
        </span>
      );
    if (id === "coordinator")
      return (
        <span className="flex items-center gap-2">
          <Network size={12} style={{ color: "#a78bfa" }} />
          <span style={{ color: "#a78bfa" }}>Coordinator</span>
          <span style={{ fontSize: "10px", color: "var(--color-muted)", marginLeft: "auto" }}>
            routes tasks
          </span>
        </span>
      );
    const t = teams.find((t) => t.id === id);
    return (
      <span className="flex items-center gap-2">
        <Zap size={12} style={{ color: "var(--color-text-secondary)" }} />
        <span>{t?.name || id}</span>
        {t && (
          <span style={{ fontSize: "10px", color: "var(--color-muted)", marginLeft: "auto" }}>
            {t._count.agents} agents
          </span>
        )}
      </span>
    );
  }

  // ── Provider selector ──
  const providerOptions: Provider[] = ["anthropic", "openai", "ollama"];
  function providerLabel(p: Provider): React.ReactNode {
    const cfg = PROVIDERS[p];
    return (
      <span className="flex items-center gap-1.5">
        <span
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: cfg.color,
            flexShrink: 0,
          }}
        />
        {cfg.label}
      </span>
    );
  }

  // ── Model selector ──
  const currentProviderModels = provider === "ollama" ? ollamaModels : PROVIDERS[provider].models;
  const modelOptions = currentProviderModels.map((m) => m.value);
  function modelLabel(m: string): React.ReactNode {
    const found = currentProviderModels.find((x) => x.value === m);
    return <span>{found?.label || m}</span>;
  }

  // ── Current context subtitle ──
  function getSubtitle(): string {
    const pLabel = PROVIDERS[provider].label;
    const mLabel = currentProviderModels.find((m) => m.value === model)?.label || model;
    if (teamId === "coordinator") return `${pLabel} · ${mLabel} · Coordinator Mode`;
    if (teamId !== "all") {
      const t = teams.find((t) => t.id === teamId);
      return `${pLabel} · ${mLabel} · ${t?.name || "Team"} context`;
    }
    return `${pLabel} · ${mLabel} · connected to all teams`;
  }

  const suggestions = getSuggestions(teamId);
  const showSuggestions = messages.length <= 1 && !streaming;

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <div
        className="shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-background)" }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-8 h-8"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
              }}
            >
              {teamId === "coordinator" ? (
                <Network size={15} style={{ color: "#a78bfa" }} />
              ) : (
                <Bot size={15} style={{ color: "var(--color-text-secondary)" }} />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                {teamId === "coordinator" ? "Coordinator Agent" : "Agent Copilot"}
              </p>
              <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                {getSubtitle()}
              </p>
            </div>
          </div>
          <button
            onClick={newConversation}
            className="btn-ghost flex items-center gap-1.5 px-3 py-1.5"
            style={{ fontSize: "12px" }}
          >
            <Plus size={13} />
            New Chat
          </button>
        </div>

        {/* Config row — team, provider, model selectors */}
        <div
          className="flex items-center gap-2 px-6 pb-3"
          style={{ flexWrap: "wrap" }}
        >
          {/* Team selector */}
          <div className="flex items-center gap-1.5">
            <Users size={11} style={{ color: "var(--color-muted)" }} />
            <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
              Context:
            </span>
          </div>
          {teamsLoading ? (
            <Loader2 size={12} className="animate-spin" style={{ color: "var(--color-muted)" }} />
          ) : (
            <Dropdown
              value={teamId}
              options={teamOptions}
              onChange={setTeamId}
              renderLabel={teamLabel}
              renderOption={teamOptionLabel}
              minWidth={210}
            />
          )}

          <div
            style={{
              width: "1px",
              height: "16px",
              background: "var(--color-border)",
              margin: "0 4px",
            }}
          />

          {/* Provider selector */}
          <Dropdown
            value={provider}
            options={providerOptions}
            onChange={changeProvider}
            renderLabel={providerLabel}
            renderOption={providerLabel}
            minWidth={150}
          />

          {/* Model selector */}
          <Dropdown
            value={model}
            options={modelOptions}
            onChange={setModel}
            renderLabel={modelLabel}
            renderOption={modelLabel}
            minWidth={190}
          />
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto py-6 flex flex-col gap-1"
        style={{ background: "var(--color-background)" }}
      >
        {loadingHistory && (
          <div className="flex justify-center py-4">
            <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
              Loading history...
            </span>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {streaming && (
          <div className="animate-fade-in" style={{ padding: "12px 0" }}>
            <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "3px",
                }}
              >
                <Bot size={14} style={{ color: "var(--color-text-secondary)" }} />
              </div>
              {streamingContent ? (
                <div
                  style={{
                    color: "var(--color-text)",
                    fontSize: "15px",
                    lineHeight: "1.75",
                    paddingTop: "3px",
                  }}
                >
                  {renderContent(streamingContent)}
                  <span style={{ opacity: 0.4, marginLeft: "2px" }}>▊</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 py-2">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: "var(--color-muted)",
                        display: "inline-block",
                        animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Session token bar */}
      {sessionUsage.input > 0 && (
        <div
          className="shrink-0 flex items-center gap-3 px-6"
          style={{
            borderTop: "1px solid var(--color-border)",
            padding: "6px 24px",
            fontSize: "11px",
            color: "var(--color-muted)",
          }}
        >
          <span>↑ {sessionUsage.input.toLocaleString()} in</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>↓ {sessionUsage.output.toLocaleString()} out</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ color: "var(--color-text-secondary)" }}>
            {calcCost(sessionUsage.input, sessionUsage.output, lastUsageModel)}
          </span>
          <span style={{ marginLeft: "auto", opacity: 0.5 }}>{lastUsageModel}</span>
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && (
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
            padding: "0 24px 12px",
            width: "100%",
          }}
        >
          <div className="flex gap-2 flex-wrap">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200"
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-secondary)",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--color-border-light)";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
                }}
              >
                <Zap size={10} />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="py-4 shrink-0" style={{ background: "var(--color-background)" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 24px" }}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,audio/*,.pdf,.txt,.md,.csv,.json,.py,.ts,.tsx,.js,.jsx,.sh,.yaml,.yml"
            onChange={handleFileSelect}
          />

          {/* Attachment chips */}
          {pendingAttachments.length > 0 && (
            <div
              className="flex flex-wrap gap-2 mb-2"
            >
              {pendingAttachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 rounded-lg"
                  style={{
                    background: "var(--color-surface-3)",
                    border: `1px solid ${att.status === "error" ? "rgba(239,68,68,0.4)" : "var(--color-border)"}`,
                    padding: "4px 10px",
                    fontSize: "12px",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {att.status === "processing" && (
                    <Loader2 size={11} className="animate-spin" style={{ color: "var(--color-muted)" }} />
                  )}
                  {att.status === "ready" && att.type === "image" && att.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={att.previewUrl} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover" }} />
                  ) : att.type === "audio" ? (
                    <Mic size={11} />
                  ) : (
                    <FileText size={11} />
                  )}
                  <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {att.filename}
                  </span>
                  {att.status === "ready" && att.type === "audio" && (
                    <span style={{ fontSize: "10px", color: "var(--color-text-secondary)", opacity: 0.7 }}>✓</span>
                  )}
                  {att.status === "error" && (
                    <span style={{ fontSize: "10px", color: "rgb(239,68,68)" }}>error</span>
                  )}
                  <button
                    onClick={() => setPendingAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                  >
                    <X size={11} style={{ color: "var(--color-muted)" }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="glass-input flex items-end gap-2 px-4 py-3">
            {/* Attach button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming}
              className="shrink-0 transition-colors"
              style={{
                background: "none",
                border: "none",
                cursor: streaming ? "not-allowed" : "pointer",
                padding: "6px",
                display: "flex",
                alignItems: "center",
                color: "var(--color-muted)",
                borderRadius: "6px",
              }}
              title="Attach file (image, audio, PDF, text)"
            >
              <Paperclip size={16} />
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={
                teamId === "coordinator"
                  ? "Tell the coordinator what needs to be done..."
                  : teamId !== "all"
                  ? `Message ${teams.find((t) => t.id === teamId)?.name || "this team"}...`
                  : "Message Agent Copilot..."
              }
              rows={1}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--color-text)",
                fontSize: "15px",
                resize: "none",
                flex: 1,
                fontFamily: "inherit",
                lineHeight: "1.5",
              }}
            />
            <button
              onClick={() => send()}
              disabled={(!input.trim() && pendingAttachments.length === 0) || streaming}
              className="transition-all shrink-0"
              style={{
                background:
                  (input.trim() || pendingAttachments.length > 0) && !streaming
                    ? "var(--color-accent)"
                    : "var(--color-surface-3)",
                borderRadius: "8px",
                border: "none",
                cursor: (input.trim() || pendingAttachments.length > 0) && !streaming ? "pointer" : "not-allowed",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Send
                size={14}
                style={{
                  color:
                    (input.trim() || pendingAttachments.length > 0) && !streaming ? "#0d0d0d" : "var(--color-muted)",
                }}
              />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
              Enter to send · Shift+Enter for new line
            </p>
            {input.length > 0 && (
              <p className="text-[11px]" style={{ color: "var(--color-muted)", opacity: 0.7 }}>
                ~{Math.ceil(input.length / 4).toLocaleString()} tokens
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
