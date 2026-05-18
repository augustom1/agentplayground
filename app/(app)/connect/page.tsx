"use client";

import { useState, useEffect } from "react";
import { Copy, CheckCircle2, Key, Brain, Zap, Globe, ArrowRight, Sparkles, Users } from "lucide-react";

const APP_URL = "https://app.agentplayground.net";

// ─── System prompt templates ───────────────────────────────────────────────────

function buildSystemPrompt(apiKey: string) {
  return `You have access to the AgentPlayground Brain — a shared knowledge vault used by AI agent teams running on a private server.

## When to push to the Brain
- The user asks you to save, store, remember, or share something for their agents
- You generate a strategy, brief, plan, or research they want agents to act on
- The user says "dump this to the brain", "save this for my agents", or similar

## How to push
Call the Brain Push API:

POST ${APP_URL}/api/brain/push
Authorization: Bearer ${apiKey}
Content-Type: application/json

{
  "title": "<descriptive title>",
  "content": "<full markdown content>",
  "team": "<team name if routing to a specific team, else omit>",
  "tags": ["#tag1", "#tag2"]
}

## Team routing
If the user mentions a specific team (e.g. "marketing team", "research team"), set "team" to that name. The note will land in Teams/<team>/ where agents look first.

## Format guidelines
Structure your output as clean markdown with:
- A clear ## Summary section
- ## Key Points or ## Strategy as appropriate
- ## Next Steps or ## Action Items at the bottom
- Use bold for key decisions, bullet points for lists

After pushing, confirm: "Saved to Brain at <path>. Your agents will find this in Teams/<team>/."`;
}

function buildChatGPTSystemPrompt(apiKey: string) {
  return `You have access to the AgentPlayground Brain via the pushToBrain action.

When the user wants to save content for their AI agents, call pushToBrain with:
- title: descriptive title
- content: well-structured markdown
- team: the relevant team name (e.g. "marketing", "research") — omit to save to inbox
- tags: relevant tags

Format content as clean markdown. After saving, confirm what was stored and where.

Your API key is already configured. Use it whenever the user asks to send something to their agents or save something to the brain.`;
}

// ─── Provider configs ─────────────────────────────────────────────────────────

const PROVIDERS = [
  {
    id: "claude-mobile",
    name: "Claude Mobile",
    icon: "📱",
    badge: "Remote MCP",
    badgeColor: "#a78bfa",
    description: "Claude iOS/Android supports remote MCP via Integrations. Gives you vault_search, vault_write, dispatch_task and more.",
    steps: [
      'Open Claude app → Settings → Integrations',
      'Tap "Add Integration" → Custom',
      `Set URL: <code>${APP_URL}/api/mcp</code>`,
      "Set Authorization header: <code>Bearer YOUR_KEY</code>",
      "Save → start a new chat. Brain tools are now available.",
    ],
    configKey: "claude_mobile",
    hasConfig: true,
    hasPromptTemplate: true,
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    icon: "🖥️",
    badge: "MCP",
    badgeColor: "#a78bfa",
    description: "Full MCP support on Mac and Windows. Paste the config and restart.",
    steps: [
      'Open Claude Desktop → Settings → Developer → Edit Config',
      'Add the JSON block below to <code>claude_desktop_config.json</code>',
      "Restart Claude Desktop",
      "Open a new chat — Brain tools appear under the hammer icon",
    ],
    configKey: "claude_desktop",
    hasConfig: true,
    hasPromptTemplate: true,
  },
  {
    id: "chatgpt-action",
    name: "ChatGPT Custom GPT",
    icon: "💬",
    badge: "Actions",
    badgeColor: "#34d399",
    description: "Create a Custom GPT with a Brain action. Gives ChatGPT a pushToBrain action it can call on your behalf.",
    steps: [
      "Go to ChatGPT → Explore GPTs → Create a GPT",
      "Open the Actions tab → Add action",
      `Set Schema URL: <code>${APP_URL}/api/brain/push</code> (fetches OpenAPI schema)`,
      "Under Authentication: select API Key → Bearer → paste your key",
      "Add the system prompt below to your GPT's instructions",
      "Save → test by asking the GPT to save something to your brain",
    ],
    configKey: "chatgpt",
    hasConfig: false,
    hasPromptTemplate: true,
  },
  {
    id: "direct-api",
    name: "Direct / REST",
    icon: "⚡",
    badge: "API",
    badgeColor: "#f59e0b",
    description: "Call the push endpoint directly from any tool: n8n, Make, Zapier, curl, or your own code.",
    steps: [
      `POST to: <code>${APP_URL}/api/brain/push</code>`,
      "Header: <code>Authorization: Bearer YOUR_KEY</code>",
      "Body JSON: <code>{ title, content, team?, tags? }</code>",
      "The 'team' field routes to Teams/<team>/ so agents pick it up automatically",
      "GET the same URL to fetch the full OpenAPI schema",
    ],
    configKey: "rest",
    hasConfig: true,
    hasPromptTemplate: false,
  },
  {
    id: "cursor",
    name: "Cursor / VS Code",
    icon: "⚡",
    badge: "MCP",
    badgeColor: "#a78bfa",
    description: "Access your Brain from inside your IDE via the MCP extension.",
    steps: [
      "Open Cursor → Settings → MCP",
      'Click "Add MCP Server"',
      "Paste the config JSON below",
      "Reload the window — Brain tools appear in the Claude panel",
    ],
    configKey: "cursor",
    hasConfig: true,
    hasPromptTemplate: false,
  },
  {
    id: "n8n",
    name: "n8n / Make / Zapier",
    icon: "⚙️",
    badge: "Webhook",
    badgeColor: "#f59e0b",
    description: "Route automation outputs directly to agent team folders.",
    steps: [
      "Add an HTTP Request node",
      `Set Method: POST, URL: <code>${APP_URL}/api/brain/push</code>`,
      "Header: <code>Authorization: Bearer YOUR_KEY</code>",
      `Body (JSON): see the example below`,
      "Set 'team' to the agent team that should receive the data",
    ],
    configKey: "n8n",
    hasConfig: true,
    hasPromptTemplate: false,
  },
];

const MCP_TOOLS = [
  { name: "vault_write", desc: "Save a note to the Brain — routed to a team folder or inbox" },
  { name: "vault_search", desc: "Semantic search across all notes — finds relevant context by meaning" },
  { name: "vault_read", desc: "Read the full content of any note by path" },
  { name: "get_context", desc: "Pull relevant notes + active projects for a topic" },
  { name: "dispatch_task", desc: "Create a task and route it to the right agent team" },
];

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] hover:opacity-80 transition-all shrink-0"
      style={{
        background: "var(--color-surface)",
        color: copied ? "var(--color-green)" : "var(--color-muted)",
        border: "1px solid var(--color-border)",
      }}
    >
      {copied ? <CheckCircle2 size={10} /> : <Copy size={10} />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      {label && (
        <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
          <span className="text-[10px] font-mono" style={{ color: "var(--color-muted)" }}>{label}</span>
          <CopyButton text={code} />
        </div>
      )}
      {!label && (
        <div className="absolute top-2 right-2">
          <CopyButton text={code} />
        </div>
      )}
      <pre
        className="p-3 overflow-x-auto text-[11px] leading-relaxed"
        style={{
          background: "var(--color-surface)",
          color: "var(--color-text)",
          fontFamily: "var(--font-mono)",
          margin: 0,
          position: "relative",
        }}
      >
        {code}
      </pre>
    </div>
  );
}

export default function ConnectPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(PROVIDERS[0].id);

  const displayKey = apiKey || "YOUR_API_KEY";

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

  const provider = PROVIDERS.find((p) => p.id === selectedProvider)!;

  // Config snippets per provider
  function getConfig(providerId: string): string {
    switch (providerId) {
      case "claude_mobile":
      case "claude-mobile":
        return `URL: ${APP_URL}/api/mcp\nAuthorization: Bearer ${displayKey}`;

      case "claude_desktop":
      case "claude-desktop":
        return JSON.stringify({
          mcpServers: {
            "agentplayground-brain": {
              url: `${APP_URL}/api/mcp`,
              headers: { Authorization: `Bearer ${displayKey}` },
            },
          },
        }, null, 2);

      case "chatgpt":
      case "chatgpt-action":
        return `Schema URL: ${APP_URL}/api/brain/push\nAuth type: Bearer\nAPI Key: ${displayKey}`;

      case "rest":
      case "direct-api":
        return `curl -X POST ${APP_URL}/api/brain/push \\
  -H "Authorization: Bearer ${displayKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Q3 Marketing Strategy",
    "content": "## Strategy\\n\\nFocus on...",
    "team": "marketing",
    "tags": ["#strategy", "#q3"]
  }'`;

      case "cursor":
        return JSON.stringify({
          mcpServers: {
            "agentplayground-brain": {
              url: `${APP_URL}/api/mcp`,
              headers: { Authorization: `Bearer ${displayKey}` },
            },
          },
        }, null, 2);

      case "n8n":
        return JSON.stringify({
          method: "POST",
          url: `${APP_URL}/api/brain/push`,
          headers: { Authorization: `Bearer ${displayKey}`, "Content-Type": "application/json" },
          body: {
            title: "={{ $json.title }}",
            content: "={{ $json.content }}",
            team: "marketing",
            tags: ["#automated"],
          },
        }, null, 2);

      default:
        return "";
    }
  }

  const systemPrompt = buildSystemPrompt(displayKey);
  const chatGPTPrompt = buildChatGPTSystemPrompt(displayKey);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl animate-fade-in">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Globe size={16} style={{ color: "#a78bfa" }} />
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>Connect from Any AI</h1>
        </div>
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          Feed your agent teams from Claude Mobile, ChatGPT, or any tool. Anything pushed to the Brain is immediately available to your agents.
        </p>
      </div>

      {/* Workflow diagram */}
      <div className="glass-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>How it works</p>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { icon: "💬", label: "Claude Mobile\nChatGPT\nAny AI" },
            null,
            { icon: "🧠", label: "Brain Vault\nTeams/<team>/" },
            null,
            { icon: "🤖", label: "Agent Teams\nread + act" },
          ].map((item, i) =>
            item === null ? (
              <ArrowRight key={i} size={16} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
            ) : (
              <div key={i} className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", flex: "1 1 100px", minWidth: 100 }}>
                <span className="text-xl">{item.icon}</span>
                <p className="text-[10px] text-center leading-relaxed" style={{ color: "var(--color-muted)", whiteSpace: "pre-line" }}>{item.label}</p>
              </div>
            )
          )}
        </div>
        <p className="text-[11px] mt-3 leading-relaxed" style={{ color: "var(--color-muted)" }}>
          You describe a strategy or brief in Claude Mobile → push it to the Brain → your Marketing team agents find it in <code style={{ fontFamily: "var(--font-mono)", fontSize: 10, background: "rgba(139,92,246,0.12)", color: "#a78bfa", padding: "1px 4px", borderRadius: 4 }}>Teams/marketing/</code> and use it for their next task.
        </p>
      </div>

      {/* What agents see */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Brain size={14} style={{ color: "#a78bfa" }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>What agents can do with your data</h2>
        </div>
        <div className="grid gap-2">
          {MCP_TOOLS.map((t) => (
            <div key={t.name} className="flex items-start gap-3">
              <code className="text-[11px] shrink-0 px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa" }}>
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
            hasKey
              ? <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--color-green)" }}><CheckCircle2 size={12} /> Active</span>
              : <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>No key yet</span>
          )}
        </div>

        {apiKey && (
          <div className="rounded-lg p-3 mb-3" style={{ background: "var(--color-green-dim)", border: "1px solid rgba(74,222,128,0.2)" }}>
            <p className="text-[10px] font-medium mb-1" style={{ color: "var(--color-green)" }}>
              Copy this key now — it won&apos;t be shown again after you leave.
            </p>
            <div className="flex items-center gap-2">
              <code className="text-[11px] flex-1 break-all font-mono" style={{ color: "var(--color-text)" }}>{apiKey}</code>
              <CopyButton text={apiKey} label="Copy key" />
            </div>
          </div>
        )}

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
            You have an active key. Regenerate to reveal it (revokes the old one).
          </p>
        )}
      </div>

      {/* Provider tabs */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Connect a Provider</h2>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {PROVIDERS.map((p) => (
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

        <div className="rounded-xl p-4 flex flex-col gap-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          {/* Provider header */}
          <div className="flex items-start gap-3">
            <span className="text-2xl">{provider.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{provider.name}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${provider.badgeColor}22`, color: provider.badgeColor, border: `1px solid ${provider.badgeColor}44` }}>
                  {provider.badge}
                </span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>{provider.description}</p>
            </div>
          </div>

          {/* Steps */}
          <ol className="flex flex-col gap-2">
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

          {/* Config block */}
          {provider.hasConfig && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
                {provider.id === "direct-api" ? "curl example" : provider.id === "n8n" ? "n8n HTTP node config" : "Config"}
              </p>
              <CodeBlock
                code={getConfig(provider.id)}
                label={provider.id.includes("claude") ? "claude_desktop_config.json" : undefined}
              />
            </div>
          )}

          {/* System prompt template */}
          {provider.hasPromptTemplate && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles size={12} style={{ color: "#a78bfa" }} />
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                  System prompt to copy into {provider.name}
                </p>
              </div>
              <p className="text-[11px] mb-2" style={{ color: "var(--color-muted)" }}>
                {provider.id === "chatgpt-action"
                  ? "Paste this into your Custom GPT's Instructions field."
                  : "Paste this into a Project's System Prompt (Claude) or a Custom Instruction (ChatGPT). It tells the AI when and how to push data to your Brain."}
              </p>
              <CodeBlock
                code={provider.id === "chatgpt-action" ? chatGPTPrompt : systemPrompt}
                label="system_prompt.txt"
              />
            </div>
          )}
        </div>
      </div>

      {/* Push endpoint reference */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} style={{ color: "var(--color-text-secondary)" }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Brain Push Endpoint</h2>
        </div>
        <p className="text-[11px] mb-3 leading-relaxed" style={{ color: "var(--color-muted)" }}>
          The <code style={{ fontFamily: "var(--font-mono)", fontSize: 10, background: "rgba(139,92,246,0.12)", color: "#a78bfa", padding: "1px 4px", borderRadius: 4 }}>/api/brain/push</code> endpoint accepts Bearer auth from any external tool. Set <code style={{ fontFamily: "var(--font-mono)", fontSize: 10, background: "rgba(139,92,246,0.12)", color: "#a78bfa", padding: "1px 4px", borderRadius: 4 }}>team</code> to route content into that team&apos;s Brain folder. Your agents automatically search their folder before starting tasks.
        </p>
        <div className="grid gap-3">
          {[
            {
              label: "Save to inbox (any team can find it)",
              body: JSON.stringify({ title: "Product Idea", content: "## Idea\n\nBuild a widget that...", tags: ["#idea"] }, null, 2),
            },
            {
              label: "Route to Marketing team",
              body: JSON.stringify({ title: "Q3 Campaign Strategy", content: "## Strategy\n\nFocus on...", team: "marketing", tags: ["#strategy", "#q3"] }, null, 2),
            },
            {
              label: "Route to Research team",
              body: JSON.stringify({ title: "Competitor Analysis", content: "## Findings\n\n...", team: "research", tags: ["#research"] }, null, 2),
            },
          ].map((ex, i) => (
            <div key={i}>
              <p className="text-[10px] mb-1" style={{ color: "var(--color-muted)" }}>{ex.label}</p>
              <CodeBlock code={ex.body} />
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 rounded-lg" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
          <p className="text-[11px] leading-relaxed" style={{ color: "#a78bfa" }}>
            <strong>GET</strong> <code style={{ fontFamily: "var(--font-mono)" }}>{APP_URL}/api/brain/push</code> returns the OpenAPI schema. Use this URL as the Schema URL in ChatGPT Custom GPT Actions.
          </p>
        </div>
      </div>

    </div>
  );
}
