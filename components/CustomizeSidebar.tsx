"use client";

import { useState, useEffect } from "react";
import { X, ChevronUp, ChevronDown, Eye, EyeOff, Trash2, Plus } from "lucide-react";
import {
  BUILTIN_SIDEBAR_ITEMS,
  SIDEBAR_SECTIONS,
  type SidebarLayout,
} from "@/lib/sidebar-registry";

type TeamItem = { id: string; name: string };

const ITEM_LABELS = new Map(BUILTIN_SIDEBAR_ITEMS.map((i) => [i.id, i.label]));
const SECTION_LABELS = new Map(SIDEBAR_SECTIONS.map((s) => [s.id, s.label]));

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = [...arr];
  const [x] = copy.splice(from, 1);
  copy.splice(to, 0, x);
  return copy;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 10px",
  borderRadius: 8,
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  fontSize: 13,
  color: "var(--color-text)",
};

const iconBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  borderRadius: 6,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "var(--color-muted)",
  flexShrink: 0,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-muted)",
  margin: "18px 0 8px",
};

export function CustomizeSidebar({
  open,
  onClose,
  layout,
  teams,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  layout: SidebarLayout;
  teams: TeamItem[];
  onSave: (next: SidebarLayout) => void;
}) {
  const [draft, setDraft] = useState<SidebarLayout>(layout);
  const [newLabel, setNewLabel] = useState("");
  const [newTarget, setNewTarget] = useState("coordinator");

  // Reset the draft each time the panel opens with the current layout.
  useEffect(() => {
    if (open) setDraft(layout);
  }, [open, layout]);

  if (!open) return null;

  function targetName(target: string): string {
    if (target === "coordinator") return "Playground Keeper";
    return teams.find((t) => t.id === target)?.name ?? "Team";
  }

  function addShortcut() {
    const label = newLabel.trim();
    if (!label) return;
    setDraft((d) => ({
      ...d,
      shortcuts: [
        ...d.shortcuts,
        { id: `sc-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, label, target: newTarget },
      ],
    }));
    setNewLabel("");
  }

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 301,
          width: "min(460px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 64px)",
          display: "flex",
          flexDirection: "column",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          boxShadow: "var(--shadow-md)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
            Customize sidebar
          </h2>
          <button onClick={onClose} style={iconBtn} title="Close">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 18px 18px" }}>
          {/* Items */}
          <p style={sectionTitle}>Items</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {draft.items.map((it, i) => (
              <div key={it.id} style={{ ...rowStyle, opacity: it.hidden ? 0.5 : 1 }}>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ITEM_LABELS.get(it.id) ?? it.id}
                </span>
                <button
                  style={iconBtn}
                  title={it.hidden ? "Show" : "Hide"}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      items: d.items.map((x) => (x.id === it.id ? { ...x, hidden: !x.hidden } : x)),
                    }))
                  }
                >
                  {it.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button style={iconBtn} title="Move up" onClick={() => setDraft((d) => ({ ...d, items: move(d.items, i, i - 1) }))}>
                  <ChevronUp size={14} />
                </button>
                <button style={iconBtn} title="Move down" onClick={() => setDraft((d) => ({ ...d, items: move(d.items, i, i + 1) }))}>
                  <ChevronDown size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Sections */}
          <p style={sectionTitle}>Sections</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {draft.sections.map((sec, i) => (
              <div key={sec.id} style={{ ...rowStyle, opacity: sec.hidden ? 0.5 : 1, flexWrap: "wrap" }}>
                <span style={{ flex: 1, minWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {SECTION_LABELS.get(sec.id) ?? sec.id}
                </span>
                <button
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      sections: d.sections.map((x) => (x.id === sec.id ? { ...x, collapsed: !x.collapsed } : x)),
                    }))
                  }
                  style={{
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--color-border)",
                    background: sec.collapsed ? "var(--color-surface-3)" : "transparent",
                    color: sec.collapsed ? "var(--color-text)" : "var(--color-muted)",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  title="Start collapsed"
                >
                  {sec.collapsed ? "Collapsed" : "Expanded"}
                </button>
                <button
                  style={iconBtn}
                  title={sec.hidden ? "Show" : "Hide"}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      sections: d.sections.map((x) => (x.id === sec.id ? { ...x, hidden: !x.hidden } : x)),
                    }))
                  }
                >
                  {sec.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button style={iconBtn} title="Move up" onClick={() => setDraft((d) => ({ ...d, sections: move(d.sections, i, i - 1) }))}>
                  <ChevronUp size={14} />
                </button>
                <button style={iconBtn} title="Move down" onClick={() => setDraft((d) => ({ ...d, sections: move(d.sections, i, i + 1) }))}>
                  <ChevronDown size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Shortcuts */}
          <p style={sectionTitle}>Agent shortcuts</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {draft.shortcuts.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "2px 0 6px" }}>
                Pin a direct chat with any agent — e.g. &quot;Personal Trainer&quot; or &quot;Company CEO&quot;.
              </p>
            )}
            {draft.shortcuts.map((sc) => (
              <div key={sc.id} style={rowStyle}>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {sc.label}
                  <span style={{ color: "var(--color-muted)", fontSize: 11 }}> · {targetName(sc.target)}</span>
                </span>
                <button
                  style={iconBtn}
                  title="Remove shortcut"
                  onClick={() => setDraft((d) => ({ ...d, shortcuts: d.shortcuts.filter((x) => x.id !== sc.id) }))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {/* Add shortcut form */}
            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addShortcut(); }}
                placeholder="Shortcut name"
                style={{
                  flex: 1,
                  minWidth: 120,
                  padding: "7px 10px",
                  borderRadius: 8,
                  fontSize: 13,
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                  outline: "none",
                }}
              />
              <select
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                style={{
                  padding: "7px 10px",
                  borderRadius: 8,
                  fontSize: 13,
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                  cursor: "pointer",
                }}
              >
                <option value="coordinator">Playground Keeper</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button
                onClick={addShortcut}
                disabled={!newLabel.trim()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: newLabel.trim() ? "pointer" : "not-allowed",
                  background: newLabel.trim() ? "var(--color-brand)" : "var(--color-surface-3)",
                  color: newLabel.trim() ? "#0a1628" : "var(--color-muted)",
                }}
              >
                <Plus size={13} /> Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "12px 18px",
            borderTop: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(draft); onClose(); }}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: "none",
              background: "var(--color-brand)",
              color: "#0a1628",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}
