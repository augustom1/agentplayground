"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { MODEL_CATALOG, type ProviderId } from "@/lib/model-catalog";

// Compact provider + model picker for chat input bars (used by the playground
// scoped chat). Opens upward. Includes the custom model id input so users are
// never locked to the curated shortlists.

const PROVIDER_IDS: ProviderId[] = ["anthropic", "openai", "nvidia", "ollama"];

export default function ModelPicker({
  provider,
  model,
  onChange,
}: {
  provider: ProviderId;
  model: string;
  onChange: (provider: ProviderId, model: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const cfg = MODEL_CATALOG[provider];
  const current = cfg.models.find((m) => m.value === model);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors"
        style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "12px", color: "var(--color-text-secondary)" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-text)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)")}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, display: "inline-block", flexShrink: 0 }} />
        {current?.label || model}
        <ChevronDown size={10} style={{ color: "var(--color-muted)", transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 0,
            zIndex: 120,
            width: "min(300px, calc(100vw - 32px))",
            overflow: "hidden",
          }}
        >
          {/* Provider tabs */}
          <div className="flex gap-px p-2 pb-1.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
            {PROVIDER_IDS.map((p) => (
              <button
                key={p}
                onClick={() => onChange(p, MODEL_CATALOG[p].models[0].value)}
                style={{
                  flex: 1, fontSize: "11px", padding: "4px 0", borderRadius: 6, border: "none", cursor: "pointer",
                  background: p === provider ? "var(--color-surface-3)" : "transparent",
                  color: p === provider ? "var(--color-text)" : "var(--color-muted)",
                  fontWeight: p === provider ? 500 : 400,
                }}
              >
                {MODEL_CATALOG[p].label}
              </button>
            ))}
          </div>

          {/* Models */}
          <div className="py-1">
            {cfg.models.map((m) => (
              <button
                key={m.value}
                onClick={() => { onChange(provider, m.value); setOpen(false); }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 transition-colors"
                style={{ background: m.value === model ? "var(--color-surface-3)" : "transparent", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--color-text)" }}
                onMouseEnter={(e) => { if (m.value !== model) (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; }}
                onMouseLeave={(e) => { if (m.value !== model) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.value === model ? cfg.color : "var(--color-muted)", display: "inline-block", flexShrink: 0 }} />
                {m.label}
                {m.value === model && <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--color-muted)" }}>active</span>}
              </button>
            ))}
          </div>

          {/* Custom model id */}
          <div className="px-3 pb-2 pt-1.5" style={{ borderTop: "1px solid var(--color-border)" }}>
            <input
              key={provider}
              type="text"
              placeholder={
                provider === "nvidia" ? "Custom model id (e.g. mistralai/mixtral-8x7b-instruct-v0.1)"
                : provider === "ollama" ? "Custom model (e.g. gemma2:9b)"
                : "Custom model id"
              }
              defaultValue={cfg.models.some((m) => m.value === model) ? "" : model}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = (e.target as HTMLInputElement).value.trim();
                  if (v) { onChange(provider, v); setOpen(false); }
                }
              }}
              className="glass-input w-full px-2 py-1.5"
              style={{ fontSize: "12px", color: "var(--color-text)" }}
            />
            <p style={{ fontSize: 10, color: "var(--color-muted)", marginTop: 4 }}>
              Any model this provider serves — type its id and press Enter.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
