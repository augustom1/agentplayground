"use client";

import { useState, useEffect } from "react";
import { Copy, CheckCircle2, ExternalLink, Key, Brain, Zap, Globe } from "lucide-react";

const APP_URL = "https://app.agentplayground.net";

const providers = [
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    icon: "🤖",
    description: "Works on Mac and Windows. Full MCP support.",
    steps: [
      'Open Claude Desktop → Settings → Developer → Edit Config',
      'Paste the JSON config below into <code>claude_desktop_config.json</code>',
      "Restart Claude Desktop",
      "Open a new chat — your Brain tools appear automatically",
    ],
    configKey: "claude_desktop_config",
  },
  {
    id: "claude-mobile",
    name: "Claude Mobile (iOS/Android)",
    icon: "📱",
    description: "Use your Brain in Claude on mobile via remote MCP.",
    steps: [
      "Open Claude app → Settings → Integrations",
      "Tap Add Integration → Custom",
      `Set URL to: <code>${APP_URL}/api/mcp</code>`,
      "Set Authorization header: <code>Bearer YOUR_KEY</code>",
      "Save and start a new conversation",
    ],
    configKey: "mobile",
  },
  {
    id: "chatgpt",
    name: "ChatGPT (Actions / Plugins)",
    icon: "💬",
    description: "Connect as a custom GPT action or plugin.",
    steps: [
      "Go to ChatGPT → Explore GPTs → Create a GPT",
      "Open the Actions tab → Add action",
      `Set Schema URL to: <code>${APP_URL}/api/mcp/openapi.json</code>`,
      "Set Authentication: Bearer Token → paste your key",
      "Save and test the GPT",
    ],
    configKey: "chatgpt",
  },
  {
    id: "deepseek",
    name: "DeepSeek / Open WebUI",
    icon: "🔭",
    description: "Connect via OpenWebUI tool config or direct API calls.",
    steps: [
      "Open your Open WebUI instance → Settings → Tools",
      "Add a new tool server with the URL below",
      "Set the API key in the Authorization field",
      "Enable the tools in your chat session",
    ],
    configKey: "openwebui",
  },
  {
    id: "cursor",
    name: "Cursor / VS Code",
    icon: "⚡",
    description: "Access your Brain from inside your IDE.",
    steps: [
      "Open Cursor → Settings → MCP",
      'Click "Add MCP Server"',
      "Paste the config JSON below",
      "Reload window — tools appear in Claude panel",
    ],
    configKey: "cursor",
  },
  {
    id: "n8n",
    name: "n8n Automation",
    icon: "⚙️",
    description: "Use vault tools in n8n workflows via HTTP Request node.",
    steps: [
      "Add an HTTP Request node",
      `Set Method: POST, URL: <code>${APP_URL}/api/mcp</code>`,
      "Add header: <code>Authorization: Bearer YOUR_KEY</code>",
      "Body (JSON): <code>{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"vault_search\",\"arguments\":{\"query\":\"{{$json.query}}\"}}}</code>",
    ],
    configKey: "n8n",
  },
];

const MCP_TOOLS = [
  { name: "vault_search", desc: "Semantic search across all notes — finds relevant context by meaning, not just keywords" },
  { name: "vault_read", desc: "Read the full content of any note by its path" },
  { name: "vault_write", desc: "Save a new note to the inbox — auto-indexed and searchable immediately" },
  { name: "get_context", desc: "Get the most relevant notes + active projects for a topic — use before answering" },
  { name: "dispatch_task", desc: "Create a task and route it to the right agent team" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] hover:opacity-80 transition-all"
      style={{ background: "var(--color-surface)", color: copied ? "var(--color-green)" : "var(--color-muted)", border: "1px solid var(--color-border)" }}
    >
      {copied ? <CheckCircle2 size={10} /> : <Copy size={10} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function ConnectPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(providers[0].id);
  const [copied, setCopied] = useState<string | null>(null);

  const displayKey = apiKey || "YOUR_API_KEY_HERE";

  const mcpConfig = JSON.stringify({
    mcpServers: {
      "agentplayground-brain": {
        url: `${APP_URL}/api/mcp`,
        headers: { Authorization: `Bearer ${displayKey}` },
      },
    },
  }, null, 2);

  useEffect(() => {
    fetch("/api/settings/api-key")
      .then((r) => r.json())
      .then((d) => setHasKey(d.hasKey))
      .catch(() => setHasKey(false));
  }, []);

  async function generateKey() {
    setGenerating(true);
    try {
      const r = await fetch("/api/settings/api-key", { method: "POST" });
      const d = await r.json();
      setApiKey(d.key);
      setHasKey(true);
    } finally {
      setGenerating(false);
    }
  }

  async function copy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const provider = providers.find((p) => p.id === selectedProvider)!;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Globe size={16} style={{ color: "#a78bfa" }} />
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>Connect from Any LLM</h1>
        </div>
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          Your 2nd Brain is available as an MCP server. Connect Claude Desktop, ChatGPT, DeepSeek, Cursor, or any LLM client.
        </p>
      </div>

      {/* What is MCP Brain */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain size={14} style={{ color: "#a78bfa" }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>What you get</h2>
        </div>
        <div className="grid gap-2">
          {MCP_TOOLS.map((t) => (
            <div key={t.name} className="flex items-start gap-3">
              <code className="text-[11px] shrink-0 px-1.5 py-0.5 rounded font-mono"
                style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa" }}>
                {t.name}
              </code>
              <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Key size={14} style={{ color: "var(--color-text-secondary)" }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Your API Key</h2>
          </div>
          {hasKey !== null && (
            <div className="flex items-center gap-1.5">
              {hasKey
                ? <><CheckCircle2 size={12} style={{ color: "var(--color-green)" }} /><span className="text-[11px]" style={{ color: "var(--color-green)" }}>Active</span></>
                : <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>No key</span>}
            </div>
          )}
        </div>

        {apiKey ? (
          <div className="rounded-lg p-3 mb-3" style={{ background: "var(--color-green-dim)", border: "1px solid rgba(74,222,128,0.2)" }}>
            <p className="text-[10px] font-medium mb-1" style={{ color: "var(--color-green)" }}>
              Copy this key now — it won't be shown again after you leave this page.
            </p>
            <div className="flex items-center gap-2">
              <code className="text-[11px] flex-1 break-all font-mono" style={{ color: "var(--color-text)" }}>{apiKey}</code>
              <button onClick={() => copy(apiKey, "key")} className="shrink-0 px-2.5 py-1 rounded text-[11px] font-medium hover:opacity-80"
                style={{ background: "var(--color-green)", color: "#000" }}>
                {copied === "key" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        ) : null}

        <button
          onClick={generateKey}
          disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-80 disabled:opacity-50"
          style={{ background: "var(--color-accent)", color: "#000" }}
        >
          {generating ? <Zap size={11} className="animate-pulse" /> : <Key size={11} />}
          {hasKey ? "Regenerate Key" : "Generate Key"}
        </button>
        {hasKey && !apiKey && (
          <p className="text-[10px] mt-2" style={{ color: "var(--color-muted)" }}>
            You have an active key. Regenerate to get a new one (revokes the old one).
          </p>
        )}
      </div>

      {/* Provider tabs */}
      <div className="glass-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>Setup Instructions</h2>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProvider(p.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: selectedProvider === p.id ? "var(--color-accent)" : "var(--color-surface)",
                color: selectedProvider === p.id ? "#000" : "var(--color-muted)",
                border: "1px solid var(--color-border)",
              }}
            >
              <span>{p.icon}</span> {p.name}
            </button>
          ))}
        </div>

        {/* Selected provider detail */}
        <div className="rounded-xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{provider.icon}</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{provider.name}</p>
              <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>{provider.description}</p>
            </div>
          </div>

          <ol className="flex flex-col gap-2 mb-4">
            {provider.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5"
                  style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                  {i + 1}
                </span>
                <span
                  className="text-[12px] leading-relaxed"
                  style={{ color: "var(--color-text)" }}
                  dangerouslySetInnerHTML={{ __html: step }}
                />
              </li>
            ))}
          </ol>

          {/* Config snippet */}
          {(provider.id === "claude-desktop" || provider.id === "cursor") && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>Config JSON:</p>
                <CopyButton text={mcpConfig} />
              </div>
              <pre className="text-[10px] p-3 rounded-lg overflow-x-auto font-mono"
                style={{ background: "#02020a", color: "#e2e8f0", border: "1px solid var(--color-border)" }}>
                {mcpConfig}
              </pre>
            </div>
          )}

          {provider.id === "n8n" && (
            <div className="flex items-center gap-2 text-[11px] mt-2" style={{ color: "var(--color-muted)" }}>
              <ExternalLink size={11} />
              <span>Your n8n is at <a href="https://n8n.agentplayground.net" target="_blank" rel="noopener noreferrer"
                style={{ color: "#a78bfa" }}>n8n.agentplayground.net</a></span>
            </div>
          )}
        </div>
      </div>

      {/* Endpoint reference */}
      <div className="glass-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>Endpoint Reference</h2>
        <div className="flex flex-col gap-2">
          {[
            { label: "MCP endpoint", value: `${APP_URL}/api/mcp` },
            { label: "Auth header", value: `Authorization: Bearer ${displayKey}` },
            { label: "Protocol", value: "MCP JSON-RPC 2.0 (2024-11-05)" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-2"
              style={{ borderBottom: "1px solid var(--color-border)" }}>
              <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>{row.label}</span>
              <div className="flex items-center gap-2">
                <code className="text-[11px] font-mono" style={{ color: "var(--color-text)" }}>{row.value}</code>
                <CopyButton text={row.value} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
