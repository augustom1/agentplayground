"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

// Settings → Appearance: dark (default) / light theme switch
export function ThemeSection() {
  const { theme, toggle } = useTheme();

  const options = [
    { id: "dark" as const, label: "Dark", icon: Moon, hint: "Charcoal + blue accent (default)" },
    { id: "light" as const, label: "Light", icon: Sun, hint: "White + grey with the same blue" },
  ];

  return (
    <div className="glass-card px-4">
      <div className="py-3.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Appearance</h2>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
          Theme applies to this browser and is remembered.
        </p>
      </div>
      <div className="flex gap-3 py-4">
        {options.map(opt => {
          const active = theme === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => { if (!active) toggle(); }}
              className="flex-1 flex flex-col items-start gap-2 rounded-xl p-4 transition-all"
              style={{
                background: active ? "var(--color-brand-dim)" : "var(--color-surface-2)",
                border: `1px solid ${active ? "var(--color-brand)" : "var(--color-border)"}`,
                cursor: active ? "default" : "pointer",
                textAlign: "left",
              }}
            >
              <opt.icon size={16} style={{ color: active ? "var(--color-brand)" : "var(--color-text-secondary)" }} />
              <div>
                <div className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>{opt.label}</div>
                <div className="text-[11px]" style={{ color: "var(--color-muted)" }}>{opt.hint}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
