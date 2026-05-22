"use client";

import { useState, useEffect } from "react";
import { Send, CheckCircle2, XCircle, RefreshCw, Loader2, Bot, AlertTriangle } from "lucide-react";

type WebhookInfo = {
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_message?: string;
};

type WebhookStatus = {
  configured: boolean;
  webhook: WebhookInfo | null;
};

export function TelegramSettings({
  botTokenSet,
  webhookSecretSet,
  groupChatIdSet,
  ownerChatIdSet,
}: {
  botTokenSet: boolean;
  webhookSecretSet: boolean;
  groupChatIdSet: boolean;
  ownerChatIdSet: boolean;
}) {
  const [status, setStatus] = useState<WebhookStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/register-webhook");
      if (res.ok) setStatus(await res.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (botTokenSet) fetchStatus();
  }, [botTokenSet]);

  async function registerWebhook() {
    setRegistering(true);
    setResult(null);
    try {
      const res = await fetch("/api/telegram/register-webhook", { method: "POST" });
      const data = await res.json();
      if (data.ok || data.description === "Webhook was set") {
        setResult(`Webhook registered: ${data.webhookUrl ?? ""}`);
        await fetchStatus();
      } else {
        setResult(`Error: ${data.error ?? data.description ?? "Unknown error"}`);
      }
    } catch (err) {
      setResult(`Error: ${String(err)}`);
    }
    setRegistering(false);
  }

  const isFullyConfigured = botTokenSet && webhookSecretSet;
  const webhookActive = !!status?.webhook?.url;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-4"
      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2">
        <Bot size={15} style={{ color: "var(--color-brand)" }} />
        <span className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>
          Telegram Bot
        </span>
        {webhookActive ? (
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: "var(--color-green-dim)", color: "var(--color-green)" }}
          >
            Active
          </span>
        ) : isFullyConfigured ? (
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}
          >
            Webhook not set
          </span>
        ) : (
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: "var(--color-red-dim)", color: "var(--color-red)" }}
          >
            Not configured
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "TELEGRAM_BOT_TOKEN", set: botTokenSet, required: true },
          { label: "TELEGRAM_WEBHOOK_SECRET", set: webhookSecretSet, required: true },
          { label: "TELEGRAM_GROUP_CHAT_ID", set: groupChatIdSet, required: false, hint: "Group notifications" },
          { label: "TELEGRAM_OWNER_CHAT_ID", set: ownerChatIdSet, required: false, hint: "Owner DM routing" },
        ].map(({ label, set, required, hint }) => (
          <div
            key={label}
            className="flex items-start gap-2 p-2.5 rounded-lg"
            style={{ background: "var(--color-surface-3)", border: "1px solid var(--color-border)" }}
          >
            {set ? (
              <CheckCircle2 size={12} style={{ color: "var(--color-green)", marginTop: 1, flexShrink: 0 }} />
            ) : (
              <XCircle size={12} style={{ color: required ? "var(--color-red)" : "var(--color-muted)", marginTop: 1, flexShrink: 0 }} />
            )}
            <div className="min-w-0">
              <code className="text-[10px] block truncate" style={{ color: "var(--color-text)" }}>{label}</code>
              {hint && <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>{hint}</p>}
            </div>
          </div>
        ))}
      </div>

      {!isFullyConfigured && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg text-[11px]"
          style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}
        >
          <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Add <code>TELEGRAM_BOT_TOKEN</code> and <code>TELEGRAM_WEBHOOK_SECRET</code> to{" "}
            <code>.env.local</code> to enable Telegram. Create a bot at{" "}
            <span style={{ textDecoration: "underline" }}>@BotFather</span>.
          </span>
        </div>
      )}

      {isFullyConfigured && (
        <div className="flex flex-col gap-2">
          {status?.webhook?.url && (
            <p className="text-[11px] truncate" style={{ color: "var(--color-muted)" }}>
              Webhook: <code style={{ color: "var(--color-text)" }}>{status.webhook.url.replace(/secret_token=.*/, "secret_token=…")}</code>
            </p>
          )}
          {status?.webhook?.last_error_message && (
            <p className="text-[11px]" style={{ color: "var(--color-red)" }}>
              Last error: {status.webhook.last_error_message}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={registerWebhook}
              disabled={registering}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity"
              style={{ background: "var(--color-brand)", color: "#fff", opacity: registering ? 0.6 : 1 }}
            >
              {registering ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              {webhookActive ? "Re-register Webhook" : "Register Webhook"}
            </button>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ color: "var(--color-muted)", border: "1px solid var(--color-border)" }}
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {result && (
            <p
              className="text-[11px] p-2 rounded-lg"
              style={{
                background: result.startsWith("Error") ? "var(--color-red-dim)" : "var(--color-green-dim)",
                color: result.startsWith("Error") ? "var(--color-red)" : "var(--color-green)",
              }}
            >
              {result}
            </p>
          )}
        </div>
      )}

      <div
        className="text-[11px] leading-relaxed"
        style={{ color: "var(--color-muted)", borderTop: "1px solid var(--color-border)", paddingTop: "12px" }}
      >
        <p className="font-medium mb-1" style={{ color: "var(--color-text)" }}>How it works</p>
        <ul className="flex flex-col gap-1 list-disc list-inside">
          <li>All DMs route to the Playground Keeper (bidirectional chat)</li>
          <li>Use <code>/note</code>, <code>/brain</code>, <code>/daily</code> for vault commands</li>
          <li>Set <code>TELEGRAM_GROUP_CHAT_ID</code> to get task completion notifications in a group</li>
          <li>Set <code>TELEGRAM_OWNER_CHAT_ID</code> to receive checkpoint alerts as DMs</li>
        </ul>
      </div>
    </div>
  );
}
