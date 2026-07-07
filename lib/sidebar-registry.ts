// Sidebar registry — single source of truth for the customizable Chat-tab sidebar.
// The user's layout lives on User.sidebarLayout (Json). It is an ordered set of
// built-in items + collapsible sections + user-created "chat with agent" shortcuts.
// Unknown ids are dropped on read AND write so stale configs survive registry changes.

export type RegistryEntry = { id: string; label: string };

// ── Built-in Chat-tab items (above the sections) ─────────────────────
// Each maps to a fixed action in the Sidebar. Users can hide/reorder them
// but cannot delete them (they always exist in the registry).

export const BUILTIN_SIDEBAR_ITEMS: RegistryEntry[] = [
  { id: "new-chat", label: "New chat" },
  { id: "create-meeting", label: "Create a meeting" },
  { id: "brain", label: "Brain" },
  { id: "projects", label: "Projects" },
];

// ── Collapsible sections (below the items) ───────────────────────────
// "shortcuts" holds user-created agent shortcuts; the other two are dynamic lists.

export const SIDEBAR_SECTIONS: RegistryEntry[] = [
  { id: "shortcuts", label: "Shortcuts" },
  { id: "chat-with", label: "Chat with" },
  { id: "recents", label: "Recents" },
];

// ── Shapes ───────────────────────────────────────────────────────────

export type SidebarItemConfig = { id: string; hidden?: boolean };
export type SidebarSectionConfig = { id: string; hidden?: boolean; collapsed?: boolean };
export type SidebarShortcut = { id: string; label: string; target: string };

export type SidebarLayout = {
  items: SidebarItemConfig[];
  sections: SidebarSectionConfig[];
  shortcuts: SidebarShortcut[];
};

export const DEFAULT_SIDEBAR_LAYOUT: SidebarLayout = {
  items: BUILTIN_SIDEBAR_ITEMS.map((i) => ({ id: i.id })),
  sections: SIDEBAR_SECTIONS.map((s) => ({ id: s.id, collapsed: false })),
  shortcuts: [],
};

// ── Sanitizers ───────────────────────────────────────────────────────

function mergeConfigs<T extends { id: string }>(
  saved: unknown,
  registry: RegistryEntry[],
  build: (id: string, raw: Record<string, unknown> | undefined) => T,
): T[] {
  const valid = new Map(registry.map((r) => [r.id, r] as const));
  const out: T[] = [];
  const seen = new Set<string>();

  // Keep saved entries that are still valid, preserving order + flags.
  if (Array.isArray(saved)) {
    for (const entry of saved) {
      const raw = entry as Record<string, unknown> | undefined;
      const id = raw && typeof raw.id === "string" ? raw.id : undefined;
      if (id && valid.has(id) && !seen.has(id)) {
        seen.add(id);
        out.push(build(id, raw));
      }
    }
  }
  // Append any registry entries the saved config didn't mention (new built-ins).
  for (const r of registry) {
    if (!seen.has(r.id)) out.push(build(r.id, undefined));
  }
  return out;
}

function sanitizeShortcuts(raw: unknown): SidebarShortcut[] {
  if (!Array.isArray(raw)) return [];
  const out: SidebarShortcut[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const s = entry as Record<string, unknown> | undefined;
    if (!s) continue;
    const id = typeof s.id === "string" ? s.id : undefined;
    const label = typeof s.label === "string" ? s.label.trim().slice(0, 40) : undefined;
    const target = typeof s.target === "string" ? s.target : undefined;
    if (!id || !label || !target || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label, target });
  }
  return out.slice(0, 30);
}

/** Merge a raw stored layout with the registry defaults into a complete, valid layout. */
export function resolveSidebarLayout(raw: unknown): SidebarLayout {
  const layout = (raw ?? {}) as Partial<SidebarLayout>;
  return {
    items: mergeConfigs(layout.items, BUILTIN_SIDEBAR_ITEMS, (id, r) => ({
      id,
      hidden: r?.hidden === true,
    })),
    sections: mergeConfigs(layout.sections, SIDEBAR_SECTIONS, (id, r) => ({
      id,
      hidden: r?.hidden === true,
      collapsed: r?.collapsed === true,
    })),
    shortcuts: sanitizeShortcuts(layout.shortcuts),
  };
}
