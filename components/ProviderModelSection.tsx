"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, CheckCircle2 } from "lucide-react";

type Settings = { provider: string; model: string };

const PROVIDER_MODELS: Record<string, Array<{ value: string; label: string }>> = {
  anthropic: [
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (fastest, cheapest)" },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (recommended)" },
    { value: "claude-opus-4-8", label: "Claude Opus 4.8 (most capable)" },
  ],
  openai: [
    { value: "gpt-4o-mini", label: "GPT-4o mini (recommended)" },
    { value: "gpt-4o", label: "GPT-4o" },
  ],
  nvidia: [
    { value: "meta/llama-3.1-8b-instruct", label: "Llama 3.1 8B (free, recommended)" },
    { value: "qwen/qwen2.5-coder-32b-instruct", label: "Qwen2.5 Coder 32B (free, code)" },
    { value: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B (free, larger)" },
    { value: "deepseek-ai/deepseek-r1", label: "DeepSeek R1 (free, reasoning)" },
  ],
  ollama: [],
};

const PROVIDERS = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai", label: "OpenAI" },
  { id: "nvidia", label: "NVIDIA (Free)" },
  { id: "ollama", label: "Ollama (Local)" },
];

export function ProviderModelSection() {
  const [settings, setSettings] = useState<Settings>({ provider: "anthropic", model: "claude-sonnet-4-6" });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ollamaModel, setOllamaModel] = useState("");

  useEffect(() => {
    fetch("/api/settings/provider-model")
      .then(r => r.ok ? r.json() : null)
      .then((data: Settings | null) => {
        if (data) {
          setSettings(data);
          if (data.provider === "ollama") setOllamaModel(data.model);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  function selectProvider(p: string) {
    const defaultModel = PROVIDER_MODELS[p]?.[0]?.value ?? "";
    setSettings({ provider: p, model: defaultModel });
    setSaved(false);
  }

  function selectModel(m: string) {
    setSettings(s => ({ ...s, model: m }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const model = settings.provider === "ollama" ? ollamaModel : settings.model;
    try {
      const res = await fetch("/api/settings/provider-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: settings.provider, model }),
      });
      if (!res.ok) throw new Error("Failed");
      setSettings(s => ({ ...s, model }));
      setSaved(true);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  const models = PROVIDER_MODELS[settings.provider] ?? [];

  return (
    <div className="glass-card p-4">
      <h2 className="font-semibold text-xs uppercase tracking-wider mb-1" style={{ color: "var(--color-text-secondary)" }}>
        Default Provider &amp; Model
      </h2>
      <p className="text-[11px] mb-4" style={{ color: "var(--color-muted)" }}>
        Used when Chat doesn&apos;t specify a provider. Overridden by the per-chat selector.
      </p>

      {/* Provider radio */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            onClick={() => selectProvider(p.id)}
            style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
              border: settings.provider === p.id
                ? "1px solid var(--color-brand)"
                : "1px solid var(--color-border)",
              background: settings.provider === p.id ? "rgba(212,113,90,0.12)" : "transparent",
              color: settings.provider === p.id ? "var(--color-brand)" : "var(--color-text-secondary)",
              cursor: "pointer",
              transition: "all 0.12s",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Model selector */}
      {settings.provider === "ollama" ? (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
            Model name
          </label>
          <input
            value={ollamaModel}
            onChange={e => { setOllamaModel(e.target.value); setSaved(false); }}
            placeholder="e.g. llama3, qwen2.5:7b, mistral"
            style={{
              width: "100%", padding: "7px 10px", borderRadius: 8, fontSize: 13,
              border: "1px solid var(--color-border)", background: "var(--color-surface)",
              color: "var(--color-text)", outline: "none",
            }}
          />
        </div>
      ) : models.length > 0 ? (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>
            Model
          </label>
          <select
            value={settings.model}
            onChange={e => selectModel(e.target.value)}
            style={{
              width: "100%", padding: "7px 10px", borderRadius: 8, fontSize: 13,
              border: "1px solid var(--color-border)", background: "var(--color-surface)",
              color: "var(--color-text)", outline: "none", cursor: "pointer",
            }}
          >
            {models.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8, border: "none",
            background: "var(--color-brand)", color: "#fff",
            fontSize: 12, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
          Save
        </button>
        {saved && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--color-green)" }}>
            <CheckCircle2 size={12} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
