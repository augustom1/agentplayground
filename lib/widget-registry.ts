// Widget + playground menu registry — single source of truth for what can appear
// on the Overview dashboard, playground dashboards, and the playground WORKSPACE menu.
// Layout configs are ordered arrays of ids; unknown ids are dropped on read and write
// so stale configs survive registry changes.

export type RegistryEntry = { id: string; label: string };

// ── Overview dashboard (per-user, User.dashboardLayout) ─────────────

export const OVERVIEW_WIDGETS: RegistryEntry[] = [
  { id: "tasks", label: "Tasks" },
  { id: "playgrounds", label: "Playgrounds" },
  { id: "teams", label: "Teams" },
  { id: "plans", label: "Plans" },
  { id: "completions", label: "Recent Completions" },
];

export const DEFAULT_OVERVIEW_WIDGETS: string[] = OVERVIEW_WIDGETS.map(w => w.id);

// ── Playground dashboard (per-playground, Playground.layout.widgets) ─

export const PLAYGROUND_WIDGETS: RegistryEntry[] = [
  { id: "agents", label: "Agents" },
  { id: "active-tasks", label: "Active Tasks" },
  { id: "skills", label: "Skills" },
  { id: "completions", label: "Recent Completions" },
];

export const DEFAULT_PLAYGROUND_WIDGETS: string[] = PLAYGROUND_WIDGETS.map(w => w.id);

// ── Playground WORKSPACE menu (per-playground, Playground.layout.menu) ─
// Dashboard (entry route) and Settings are fixed and not part of the config.

export const PLAYGROUND_MENU_ITEMS: RegistryEntry[] = [
  { id: "chat", label: "Chat" },
  { id: "brain", label: "Brain" },
  { id: "schedule", label: "Schedule" },
  { id: "plans", label: "Plans" },
  { id: "actions", label: "Actions" },
];

export const DEFAULT_PLAYGROUND_MENU: string[] = PLAYGROUND_MENU_ITEMS.map(m => m.id);

// ── Shared shape + sanitizers ────────────────────────────────────────

export type PlaygroundLayout = {
  widgets?: string[];
  menu?: string[];
};

/** Keep only known ids, deduped, preserving order. Returns null when input is not an array. */
export function sanitizeIds(input: unknown, registry: RegistryEntry[]): string[] | null {
  if (!Array.isArray(input)) return null;
  const valid = new Set(registry.map(r => r.id));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of input) {
    if (typeof v === "string" && valid.has(v) && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/** Sanitized layout for a playground record; both keys fall back to defaults when absent/invalid. */
export function resolvePlaygroundLayout(raw: unknown): { widgets: string[]; menu: string[] } {
  const layout = (raw ?? {}) as PlaygroundLayout;
  return {
    widgets: sanitizeIds(layout.widgets, PLAYGROUND_WIDGETS) ?? DEFAULT_PLAYGROUND_WIDGETS,
    menu: sanitizeIds(layout.menu, PLAYGROUND_MENU_ITEMS) ?? DEFAULT_PLAYGROUND_MENU,
  };
}
