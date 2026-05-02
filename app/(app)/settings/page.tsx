import { CheckCircle2, XCircle, ExternalLink, Cpu, Sparkles } from "lucide-react";
import { OllamaPanel } from "@/components/OllamaPanel";
import { BillingSection } from "@/components/BillingSection";
import { ApiKeySection } from "@/components/ApiKeySection";

function EnvRow({
  name,
  value,
  description,
  required,
}: {
  name: string;
  value: string | undefined;
  description: string;
  required: boolean;
}) {
  const set = !!value;
  return (
    <div
      className="flex items-center justify-between py-3.5"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 mb-0.5">
          <code className="text-[12px]" style={{ color: "var(--color-text)" }}>{name}</code>
          {required && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: "var(--color-red-dim)", color: "var(--color-red)" }}
            >
              required
            </span>
          )}
        </div>
        <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>{description}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {set ? (
          <>
            <CheckCircle2 size={14} style={{ color: "var(--color-green)" }} />
            <span className="text-[12px]" style={{ color: "var(--color-green)" }}>Set</span>
          </>
        ) : (
          <>
            <XCircle size={14} style={{ color: required ? "var(--color-red)" : "var(--color-muted)" }} />
            <span
              className="text-[12px]"
              style={{ color: required ? "var(--color-red)" : "var(--color-muted)" }}
            >
              Not set
            </span>
          </>
        )}
      </div>
    </div>
  );
}

const providers = [
  {
    id: "anthropic",
    name: "Anthropic Claude",
    description: "claude-sonnet-4-6 — Recommended",
    icon: Sparkles,
    color: "#a78bfa",
    status: "active",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4 Turbo — Coming soon",
    icon: Cpu,
    color: "var(--color-green)",
    status: "planned",
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    description: "Run models locally — free, private, no API key",
    icon: Cpu,
    color: "var(--color-yellow)",
    status: "active",
  },
];

export default function SettingsPage() {
  const vars = [
    {
      name: "ANTHROPIC_API_KEY",
      value: process.env.ANTHROPIC_API_KEY,
      description: "Claude API key — powers Chat and Playground",
      required: true,
    },
    {
      name: "DATABASE_URL",
      value: process.env.DATABASE_URL,
      description: "PostgreSQL connection string — required for all data persistence",
      required: true,
    },
    {
      name: "OLLAMA_BASE_URL",
      value: process.env.OLLAMA_BASE_URL,
      description: "Ollama API base URL (default: http://localhost:11434)",
      required: false,
    },
    {
      name: "AGENTS_BASE_URL",
      value: process.env.AGENTS_BASE_URL,
      description: "Base URL for agent microservices (default: http://localhost)",
      required: false,
    },
    {
      name: "AGENT_MARKETING_PORT",
      value: process.env.AGENT_MARKETING_PORT,
      description: "Marketing agent port (default: 8001)",
      required: false,
    },
    {
      name: "AGENT_ACCOUNTING_PORT",
      value: process.env.AGENT_ACCOUNTING_PORT,
      description: "Accounting agent port (default: 8002)",
      required: false,
    },
    {
      name: "AGENT_MESSAGING_PORT",
      value: process.env.AGENT_MESSAGING_PORT,
      description: "Messaging agent port (default: 8003)",
      required: false,
    },
    {
      name: "AGENT_WEBSITE_BUILDER_PORT",
      value: process.env.AGENT_WEBSITE_BUILDER_PORT,
      description: "Website Builder agent port (default: 3001)",
      required: false,
    },
    {
      name: "RESEND_API_KEY",
      value: process.env.RESEND_API_KEY,
      description: "Resend API key — enables email notifications (resend.com)",
      required: false,
    },
    {
      name: "NOTIFICATION_EMAIL",
      value: process.env.NOTIFICATION_EMAIL,
      description: "Recipient address for task complete/fail alerts",
      required: false,
    },
    {
      name: "NOTIFICATION_FROM_EMAIL",
      value: process.env.NOTIFICATION_FROM_EMAIL,
      description: "Sender address (default: notifications@agentplayground.net)",
      required: false,
    },
  ];

  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOllamaUrl = !!process.env.OLLAMA_BASE_URL;
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const allRequiredSet = hasDatabaseUrl && (hasAnthropicKey || hasOllamaUrl);

  return (
    <div className="flex flex-col gap-5 p-6 max-w-3xl animate-fade-in">
      <div>
        <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
          Settings
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
          Configuration — edit <code style={{ color: "var(--color-text)" }}>.env.local</code> then restart
        </p>
      </div>

      {!allRequiredSet && (
        <div
          className="px-4 py-3 rounded-xl"
          style={{ background: "var(--color-red-dim)", border: "1px solid rgba(248,113,113,0.2)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-red)" }}>
            Missing required configuration
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
            Copy <code>.env.local.example</code> → <code>.env.local</code> and fill in your values.
          </p>
        </div>
      )}

      {/* AI Provider Selection */}
      <div className="glass-card p-4">
        <h2 className="font-semibold text-xs uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>
          AI Provider
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {providers.map((p) => (
            <div
              key={p.id}
              className="glass-card-interactive p-3 flex flex-col gap-2"
              style={{
                borderColor: p.status === "active" ? "rgba(255,255,255,0.08)" : undefined,
                opacity: p.status === "planned" ? 0.6 : 1,
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center w-7 h-7"
                  style={{
                    background: `${p.color}15`,
                    borderRadius: "7px",
                  }}
                >
                  <p.icon size={14} style={{ color: p.color }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                    {p.name}
                  </p>
                </div>
              </div>
              <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                {p.description}
              </p>
              {p.status === "active" && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full self-start font-medium"
                  style={{ background: "var(--color-green-dim)", color: "var(--color-green)" }}
                >
                  Active
                </span>
              )}
              {p.status === "planned" && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full self-start font-medium"
                  style={{ background: "var(--color-yellow-dim)", color: "var(--color-yellow)" }}
                >
                  Coming Soon
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MCP API Key */}
      <ApiKeySection appUrl={process.env.NEXT_PUBLIC_APP_URL || "https://app.agentplayground.net"} />

      {/* Billing */}
      <BillingSection />

      {/* Ollama Panel */}
      <OllamaPanel />

      {/* Environment Variables */}
      <div className="glass-card px-4">
        <div className="py-3.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h2 className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
            Environment Variables
          </h2>
        </div>
        {vars.map((v) => (
          <EnvRow key={v.name} {...v} />
        ))}
      </div>

      {/* Notifications */}
      {(() => {
        const hasResendKey = !!process.env.RESEND_API_KEY;
        const hasNotificationEmail = !!process.env.NOTIFICATION_EMAIL;
        const notificationsConfigured = hasResendKey && hasNotificationEmail;
        return (
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                Email Notifications
              </h2>
              <div className="flex items-center gap-1.5">
                {notificationsConfigured ? (
                  <>
                    <CheckCircle2 size={13} style={{ color: "var(--color-green)" }} />
                    <span className="text-[11px] font-medium" style={{ color: "var(--color-green)" }}>Configured</span>
                  </>
                ) : (
                  <>
                    <XCircle size={13} style={{ color: "var(--color-muted)" }} />
                    <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>Not configured</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-[11px] mb-3" style={{ color: "var(--color-muted)" }}>
              When configured, AgentPlayground emails you when tasks complete or fail. Powered by{" "}
              <a href="https://resend.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text)" }}>Resend</a>.
              Add the vars below to <code style={{ color: "var(--color-text)" }}>.env.local</code> then restart.
            </p>
            <div
              className="rounded-lg px-3"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              {[
                { name: "RESEND_API_KEY", set: hasResendKey, desc: "Resend API key (resend.com)" },
                { name: "NOTIFICATION_EMAIL", set: hasNotificationEmail, desc: "Recipient address" },
                { name: "NOTIFICATION_FROM_EMAIL", set: !!process.env.NOTIFICATION_FROM_EMAIL, desc: "Sender address — optional, defaults to notifications@agentplayground.net" },
              ].map((item, i, arr) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : undefined }}
                >
                  <div>
                    <code className="text-[11px]" style={{ color: "var(--color-text)" }}>{item.name}</code>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>{item.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    {item.set ? (
                      <>
                        <CheckCircle2 size={12} style={{ color: "var(--color-green)" }} />
                        <span className="text-[11px]" style={{ color: "var(--color-green)" }}>Set</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={12} style={{ color: "var(--color-muted)" }} />
                        <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>Not set</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Channels */}
      <div className="glass-card p-4">
        <h2 className="font-semibold text-xs uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>
          Messaging Channels
        </h2>
        <div className="flex flex-col gap-0">
          {[
            {
              name: "Telegram",
              configured: !!process.env.TELEGRAM_BOT_TOKEN,
              webhook: "https://app.agentplayground.net/api/telegram/webhook",
              note: "Set TELEGRAM_BOT_TOKEN + TELEGRAM_WEBHOOK_SECRET. Register via @BotFather.",
            },
            {
              name: "WhatsApp (Twilio)",
              configured: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN,
              webhook: "https://app.agentplayground.net/api/channels/whatsapp/webhook",
              note: "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM.",
            },
            {
              name: "Email (Gmail polling)",
              configured: !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD,
              webhook: null,
              note: "Set GMAIL_USER + GMAIL_APP_PASSWORD (Google App Password). Polled every 2 min via cron.",
            },
          ].map((ch) => (
            <div key={ch.name} className="py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{ch.name}</span>
                <div className="flex items-center gap-1.5">
                  {ch.configured ? (
                    <>
                      <CheckCircle2 size={13} style={{ color: "var(--color-green)" }} />
                      <span className="text-[12px]" style={{ color: "var(--color-green)" }}>Configured</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={13} style={{ color: "var(--color-muted)" }} />
                      <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>Not configured</span>
                    </>
                  )}
                </div>
              </div>
              {ch.webhook && (
                <p className="text-[11px] font-mono mb-0.5" style={{ color: "var(--color-text-secondary)" }}>{ch.webhook}</p>
              )}
              <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>{ch.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="glass-card p-4">
        <h2 className="font-semibold text-xs uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>
          Quick Links
        </h2>
        <div className="flex flex-col gap-2">
          {[
            { label: "Get Anthropic API Key", href: "https://console.anthropic.com/settings/keys" },
            { label: "Marketing Agent Docs (:8001)", href: "http://localhost:8001/docs" },
            { label: "Accounting Agent Docs (:8002)", href: "http://localhost:8002/docs" },
            { label: "Messaging Agent Docs (:8003)", href: "http://localhost:8003/docs" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-sm"
              style={{ color: "var(--color-text)" }}
            >
              <ExternalLink size={12} />
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Stack info */}
      <div className="glass-card p-4">
        <h2 className="font-semibold text-xs uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>
          Stack
        </h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ["Framework", "Next.js 16 (App Router)"],
            ["Runtime", "React 19 / Node 20+"],
            ["Styling", "Tailwind CSS v4"],
            ["AI", "Anthropic claude-sonnet-4-6"],
            ["Icons", "Lucide React"],
            ["Language", "TypeScript 5"],
          ].map(([k, v]) => (
            <div key={k}>
              <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>{k}: </span>
              <span className="text-[12px]" style={{ color: "var(--color-text)" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
