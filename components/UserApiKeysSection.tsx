"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Save, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type KeyStatus = {
  anthropicKey: boolean;
  openaiKey: boolean;
  nvidiaKey: boolean;
  anthropicSource: "env" | "db" | "none";
  openaiSource: "env" | "db" | "none";
  nvidiaSource: "env" | "db" | "none";
};

function MaskedInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        style={{
          width: "100%",
          padding: "7px 36px 7px 10px",
          borderRadius: "8px",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-text)",
          fontSize: "13px",
          fontFamily: "monospace",
          outline: "none",
        }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        style={{
          position: "absolute",
          right: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--color-muted)",
          display: "flex",
          alignItems: "center",
        }}
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

export function UserApiKeysSection() {
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [nvidiaKey, setNvidiaKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<"saved" | "error" | null>(null);

  useEffect(() => {
    fetch("/api/settings/api-keys")
      .then((r) => r.json())
      .then((data: KeyStatus) => setStatus(data))
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setResult(null);
    try {
      const body: { anthropicKey?: string; openaiKey?: string; nvidiaKey?: string } = {};
      if (anthropicKey !== "") body.anthropicKey = anthropicKey;
      if (openaiKey !== "") body.openaiKey = openaiKey;
      if (nvidiaKey !== "") body.nvidiaKey = nvidiaKey;

      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");

      setResult("saved");
      setAnthropicKey("");
      setOpenaiKey("");
      setNvidiaKey("");
      const updated = await fetch("/api/settings/api-keys").then((r) => r.json()) as KeyStatus;
      setStatus(updated);
    } catch {
      setResult("error");
    } finally {
      setSaving(false);
    }
  }

  function sourceLabel(src: "env" | "db" | "none") {
    if (src === "env") return "via .env";
    if (src === "db") return "via Settings";
    return null;
  }

  return (
    <div className="glass-card p-4">
      <h2 className="font-semibold text-xs uppercase tracking-wider mb-1" style={{ color: "var(--color-text-secondary)" }}>
        API Keys
      </h2>
      <p className="text-[11px] mb-4" style={{ color: "var(--color-muted)" }}>
        Your keys are stored locally and used only for your agent conversations. Leave a field blank to keep the current value.
      </p>

      <div className="flex flex-col gap-3">
        {/* Anthropic */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px] font-medium" style={{ color: "var(--color-text)" }}>
              Anthropic API Key
            </label>
            {status && (
              <div className="flex items-center gap-1">
                {status.anthropicKey ? (
                  <>
                    <CheckCircle2 size={12} style={{ color: "var(--color-green)" }} />
                    <span className="text-[11px]" style={{ color: "var(--color-green)" }}>
                      Set {sourceLabel(status.anthropicSource) ? `(${sourceLabel(status.anthropicSource)})` : ""}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle size={12} style={{ color: "var(--color-red)" }} />
                    <span className="text-[11px]" style={{ color: "var(--color-red)" }}>Not set</span>
                  </>
                )}
              </div>
            )}
          </div>
          <MaskedInput
            value={anthropicKey}
            onChange={setAnthropicKey}
            placeholder={status?.anthropicKey ? "Enter new key to replace…" : "sk-ant-…"}
            disabled={saving}
          />
        </div>

        {/* OpenAI */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px] font-medium" style={{ color: "var(--color-text)" }}>
              OpenAI API Key
            </label>
            {status && (
              <div className="flex items-center gap-1">
                {status.openaiKey ? (
                  <>
                    <CheckCircle2 size={12} style={{ color: "var(--color-green)" }} />
                    <span className="text-[11px]" style={{ color: "var(--color-green)" }}>
                      Set {sourceLabel(status.openaiSource) ? `(${sourceLabel(status.openaiSource)})` : ""}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle size={12} style={{ color: "var(--color-muted)" }} />
                    <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>Not set</span>
                  </>
                )}
              </div>
            )}
          </div>
          <MaskedInput
            value={openaiKey}
            onChange={setOpenaiKey}
            placeholder={status?.openaiKey ? "Enter new key to replace…" : "sk-…"}
            disabled={saving}
          />
        </div>

        {/* NVIDIA */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px] font-medium" style={{ color: "var(--color-text)" }}>
              NVIDIA API Key <span style={{ color: "var(--color-muted)", fontWeight: 400 }}>(free — build.nvidia.com)</span>
            </label>
            {status && (
              <div className="flex items-center gap-1">
                {status.nvidiaKey ? (
                  <>
                    <CheckCircle2 size={12} style={{ color: "var(--color-green)" }} />
                    <span className="text-[11px]" style={{ color: "var(--color-green)" }}>
                      Set {sourceLabel(status.nvidiaSource) ? `(${sourceLabel(status.nvidiaSource)})` : ""}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle size={12} style={{ color: "var(--color-muted)" }} />
                    <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>Not set</span>
                  </>
                )}
              </div>
            )}
          </div>
          <MaskedInput
            value={nvidiaKey}
            onChange={setNvidiaKey}
            placeholder={status?.nvidiaKey ? "Enter new key to replace…" : "nvapi-…"}
            disabled={saving}
          />
        </div>

        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={handleSave}
            disabled={saving || (anthropicKey === "" && openaiKey === "" && nvidiaKey === "")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              border: "none",
              background: "var(--color-brand)",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 500,
              cursor: saving || (anthropicKey === "" && openaiKey === "" && nvidiaKey === "") ? "not-allowed" : "pointer",
              opacity: saving || (anthropicKey === "" && openaiKey === "" && nvidiaKey === "") ? 0.6 : 1,
            }}
          >
            {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
            Save keys
          </button>

          {result === "saved" && (
            <span className="text-[12px]" style={{ color: "var(--color-green)" }}>Saved successfully</span>
          )}
          {result === "error" && (
            <span className="text-[12px]" style={{ color: "var(--color-red)" }}>Failed to save</span>
          )}
        </div>
      </div>
    </div>
  );
}
