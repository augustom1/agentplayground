"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Send, Bot, Plus, ChevronDown, Loader2,
  MessageSquare, Users,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import ModelPicker from "@/components/ModelPicker";
import type { ProviderId } from "@/lib/model-catalog";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Team = { id: string; name: string };

type PlaygroundData = {
  id: string;
  name: string;
  icon: string | null;
  teamIds: string[];
};

function renderContent(content: string) {
  return content.split("\n").map((line, i) => {
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

export default function PlaygroundChatPage() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();

  const [playground, setPlayground] = useState<PlaygroundData | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("coordinator");
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<ProviderId>("anthropic");
  const [model, setModel] = useState("claude-sonnet-4-6");

  // Start on the user's default provider/model (wizard / Settings choice)
  useEffect(() => {
    fetch("/api/settings/provider-model")
      .then(r => r.ok ? r.json() : null)
      .then((d: { provider?: string; model?: string } | null) => {
        if (d?.provider && (["anthropic", "openai", "nvidia", "ollama"] as string[]).includes(d.provider)) {
          setProvider(d.provider as ProviderId);
        }
        if (d?.model) setModel(d.model);
      })
      .catch(() => {});
  }, []);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/playgrounds/${id}`).then(r => r.ok ? r.json() : null),
      fetch("/api/teams").then(r => r.ok ? r.json() : []),
    ]).then(([pg, allTeams]) => {
      if (!pg) return;
      setPlayground(pg as PlaygroundData);
      const teamIds = new Set<string>((pg as PlaygroundData).teamIds);
      const filtered = (allTeams as Team[]).filter(t => teamIds.has(t.id));
      setTeams(filtered);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    if (!input.trim() || streaming || !playground) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

      const systemContext =
      `You are currently operating within the "${playground.name}" playground. ` +
        (teams.length > 0
          ? `Available teams in this playground: ${teams.map(t => t.name).join(", ")}. ` +
            `When delegating or routing tasks, prefer these teams unless the user explicitly requests another.`
          : `This playground has no teams assigned yet. Suggest the user add teams via playground settings.`);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          provider,
          model,
          teamId: teamId === "coordinator" ? "coordinator" : teamId,
          systemContext,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Chat request failed");
      }

      // /api/chat streams plain text tokens (with an optional [USAGE:{...}] sentinel at the end)
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const clean = acc.replace(/\n?\[USAGE:\{[^}]*\}\]/, "");
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: clean } : m
        ));
      }
    } catch {
      addToast("Chat failed — please try again", "error");
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, playground, messages, teamId, teams, provider, model, addToast]);

  const currentTeamLabel =
    teamId === "coordinator" ? "Coordinator" :
    teams.find(t => t.id === teamId)?.name ?? teamId;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: 8, color: "var(--color-muted)" }}>
        <Loader2 size={16} className="animate-spin" />
        <span style={{ fontSize: 13 }}>Loading…</span>
      </div>
    );
  }

  if (!playground) {
    return (
      <div style={{ padding: 32, color: "var(--color-muted)", fontSize: 14 }}>
        Playground not found.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 0" }}>
        {messages.length === 0 ? (
          <div
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              height: "100%", gap: 12, color: "var(--color-muted)", textAlign: "center",
              padding: "0 24px",
            }}
          >
            <div
              style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <MessageSquare size={18} style={{ color: "var(--color-text-secondary)" }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>
                {playground.icon ? `${playground.icon} ` : ""}{playground.name}
              </p>
              {teams.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
                  Add teams to this playground in Settings to start chatting with scoped agents.
                </p>
              ) : (
                <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
                  Chat scoped to this playground. Teams: {teams.map(t => t.name).join(", ")}.
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div
                key={msg.id}
                className="animate-fade-in"
                style={{ padding: "8px 0" }}
              >
                <div
                  style={{
                    maxWidth: 680, margin: "0 auto", padding: "0 24px",
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                    alignItems: "flex-start", gap: 10,
                  }}
                >
                  {msg.role === "assistant" && (
                    <div
                      style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, marginTop: 3,
                      }}
                    >
                      <Bot size={13} style={{ color: "var(--color-text-secondary)" }} />
                    </div>
                  )}
                  <div
                    style={{
                      maxWidth: "80%",
                      ...(msg.role === "user" ? {
                        background: "var(--color-surface-2)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "18px 18px 4px 18px",
                        padding: "10px 16px",
                      } : { paddingTop: 3 }),
                    }}
                  >
                    <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text)", whiteSpace: "pre-wrap" }}>
                      {msg.role === "assistant" ? renderContent(msg.content) : msg.content}
                    </div>
                    {msg.role === "assistant" && msg.content === "" && streaming && (
                      <span style={{ display: "inline-block", width: 8, height: 14, background: "var(--color-brand)", borderRadius: 1, animation: "pulse 1s infinite" }} />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid var(--color-border)", padding: "12px 24px 16px", background: "var(--color-surface)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div
            className="glass-input"
            style={{ borderRadius: 16, padding: "12px 14px 10px", display: "flex", flexDirection: "column" }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={`Message ${currentTeamLabel} in ${playground.name}…`}
              rows={1}
              style={{
                background: "transparent", border: "none", outline: "none",
                color: "var(--color-text)", fontSize: 15, resize: "none",
                width: "100%", fontFamily: "inherit", lineHeight: 1.5, minHeight: 28,
              }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              {/* Team picker */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setTeamPickerOpen(v => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 12, color: "var(--color-text-secondary)", padding: "3px 6px",
                    borderRadius: 6,
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  <Users size={11} style={{ opacity: 0.7 }} />
                  {currentTeamLabel}
                  <ChevronDown size={10} style={{ opacity: 0.6 }} />
                </button>
                {teamPickerOpen && (
                  <>
                    <div
                      onClick={() => setTeamPickerOpen(false)}
                      style={{ position: "fixed", inset: 0, zIndex: 100 }}
                    />
                    <div
                      style={{
                        position: "absolute", bottom: "calc(100% + 6px)", left: 0,
                        zIndex: 101, background: "var(--color-surface-2)",
                        border: "1px solid var(--color-border)", borderRadius: 10,
                        padding: 4, minWidth: 160, boxShadow: "var(--shadow-md)",
                      }}
                    >
                      {[{ id: "coordinator", name: "Coordinator" }, ...teams].map(t => (
                        <button
                          key={t.id}
                          onClick={() => { setTeamId(t.id); setTeamPickerOpen(false); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 8, width: "100%",
                            padding: "6px 10px", borderRadius: 7, border: "none", cursor: "pointer",
                            background: t.id === teamId ? "var(--color-surface-3)" : "transparent",
                            color: t.id === teamId ? "var(--color-text)" : "var(--color-text-secondary)",
                            fontSize: 12, textAlign: "left",
                          }}
                          onMouseEnter={e => { if (t.id !== teamId) (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; }}
                          onMouseLeave={e => { if (t.id !== teamId) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          {t.id === "coordinator"
                            ? <Plus size={11} style={{ opacity: 0.7 }} />
                            : <Users size={11} style={{ opacity: 0.6 }} />}
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <ModelPicker provider={provider} model={model} onChange={(p, m) => { setProvider(p); setModel(m); }} />
                <button
                onClick={send}
                disabled={!input.trim() || streaming}
                style={{
                  background: input.trim() && !streaming ? "var(--color-brand)" : "var(--color-surface-3)",
                  borderRadius: 8, border: "none",
                  cursor: input.trim() && !streaming ? "pointer" : "not-allowed",
                  padding: "6px 8px", display: "flex", alignItems: "center",
                  transition: "background 0.15s",
                }}
              >
                {streaming
                  ? <Loader2 size={14} className="animate-spin" style={{ color: "var(--color-muted)" }} />
                  : <Send size={14} style={{ color: input.trim() ? "#0a1628" : "var(--color-muted)" }} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
