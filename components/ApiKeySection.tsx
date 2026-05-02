"use client";

import { useState, useEffect } from "react";
import { Key, Copy, RefreshCw, Trash2, CheckCircle2, Eye, EyeOff } from "lucide-react";

export function ApiKeySection({ appUrl }: { appUrl: string }) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetch("/api/settings/api-key")
      .then((r) => r.json())
      .then((d) => setHasKey(d.hasKey))
      .catch(() => setHasKey(false));
  }, []);

  async function generate() {
    setLoading(true);
    setNewKey(null);
    try {
      const r = await fetch("/api/settings/api-key", { method: "POST" });
      const d = await r.json();
      setNewKey(d.key);
      setHasKey(true);
      setShowKey(true);
    } finally {
      setLoading(false);
    }
  }

  async function revoke() {
    setLoading(true);
    try {
      await fetch("/api/settings/api-key", { method: "DELETE" });
      setHasKey(false);
      setNewKey(null);
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        agentplayground: {
          url: `${appUrl}/api/mcp`,
          headers: { Authorization: "Bearer YOUR_KEY_HERE" },
        },
      },
    },
    null,
    2
  );

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Key size={14} style={{ color: "var(--color-text-secondary)" }} />
          <h2 className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
            MCP API Key
          </h2>
        </div>
        {hasKey !== null && (
          <div className="flex items-center gap-1.5">
            {hasKey ? (
              <>
                <CheckCircle2 size={13} style={{ color: "var(--color-green)" }} />
                <span className="text-[11px] font-medium" style={{ color: "var(--color-green)" }}>Active</span>
              </>
            ) : (
              <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>No key</span>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] mb-3" style={{ color: "var(--color-muted)" }}>
        Lets Claude Desktop, ChatGPT, Cursor, and any MCP-compatible client read and write your vault without logging in.
      </p>

      {/* New key reveal */}
      {newKey && (
        <div
          className="rounded-lg p-3 mb-3"
          style={{ background: "var(--color-green-dim)", border: "1px solid rgba(74,222,128,0.2)" }}
        >
          <p className="text-[11px] font-medium mb-2" style={{ color: "var(--color-green)" }}>
            Copy this key now — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code
              className="text-[11px] flex-1 break-all"
              style={{ color: "var(--color-text)", fontFamily: "monospace" }}
            >
              {showKey ? newKey : newKey.slice(0, 12) + "••••••••••••••••••••••••••••••••"}
            </code>
            <button
              onClick={() => setShowKey((v) => !v)}
              className="shrink-0 p-1 rounded hover:opacity-80"
              style={{ color: "var(--color-muted)" }}
            >
              {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            <button
              onClick={() => copy(newKey)}
              className="shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--color-green)", color: "#000" }}
            >
              {copied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: "var(--color-accent)", color: "#000" }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {hasKey ? "Regenerate key" : "Generate key"}
        </button>
        {hasKey && (
          <button
            onClick={revoke}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: "var(--color-red-dim)", color: "var(--color-red)" }}
          >
            <Trash2 size={12} />
            Revoke
          </button>
        )}
      </div>

      {/* MCP config snippet */}
      <div>
        <p className="text-[11px] font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
          Claude Desktop / Cursor config (<code>claude_desktop_config.json</code>):
        </p>
        <div
          className="relative rounded-lg p-3"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <pre className="text-[10px] overflow-x-auto" style={{ color: "var(--color-text)", fontFamily: "monospace" }}>
            {mcpConfig}
          </pre>
          <button
            onClick={() => copy(mcpConfig)}
            className="absolute top-2 right-2 p-1 rounded hover:opacity-80"
            style={{ color: "var(--color-muted)" }}
          >
            {copied ? <CheckCircle2 size={12} style={{ color: "var(--color-green)" }} /> : <Copy size={12} />}
          </button>
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: "var(--color-muted)" }}>
          Replace <code>YOUR_KEY_HERE</code> with your generated key.
        </p>
      </div>
    </div>
  );
}
