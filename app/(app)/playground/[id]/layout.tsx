"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  LayoutGrid, MessageSquare, BookOpen, Users, Settings,
  ChevronRight, ChevronDown, Loader2, ListTodo, Zap, CalendarDays,
} from "lucide-react";
import { resolvePlaygroundLayout } from "@/lib/widget-registry";

type PlaygroundData = {
  id: string;
  name: string;
  icon: string | null;
  teamIds: string[];
  layout?: unknown;
};

// Menu item catalog — ids match lib/widget-registry PLAYGROUND_MENU_ITEMS.
// Dashboard (entry) and Settings (bottom) are fixed; the rest follow Playground.layout.menu.
const MENU_CATALOG: Record<string, {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  href: (id: string) => string;
  scoped: boolean; // true = lives under /playground/[id]/
}> = {
  chat: { label: "Chat", icon: MessageSquare, href: id => `/playground/${id}/chat`, scoped: true },
  brain: { label: "Brain", icon: BookOpen, href: id => `/playground/${id}/brain`, scoped: true },
  schedule: { label: "Schedule", icon: CalendarDays, href: id => `/playground/${id}/schedule`, scoped: true },
  plans: { label: "Plans", icon: ListTodo, href: () => "/plans", scoped: false },
  actions: { label: "Actions", icon: Zap, href: () => "/actions", scoped: false },
};

type TeamItem = { id: string; name: string };

function SidebarLink({
  href, label, icon: Icon, active,
}: {
  href: string; label: string;
  icon: React.ComponentType<{ size?: number }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "6px 10px", borderRadius: 7, fontSize: 13, textDecoration: "none",
        background: active ? "var(--color-surface-3)" : "transparent",
        color: active ? "var(--color-text)" : "var(--color-text-secondary)",
        fontWeight: active ? 500 : 400,
        transition: "background 0.12s",
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <span style={{ opacity: 0.7, flexShrink: 0, display: "inline-flex" }}><Icon size={13} /></span>
      {label}
    </Link>
  );
}

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
  textTransform: "uppercase", color: "var(--color-muted)",
  padding: "4px 10px 2px", margin: 0,
};

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();

  const [playground, setPlayground] = useState<PlaygroundData | null>(null);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [menu, setMenu] = useState<string[]>([]);
  const [teamsOpen, setTeamsOpen] = useState(true);
  const [appsOpen, setAppsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/playgrounds/${id}`).then(r => r.ok ? r.json() : null),
      fetch("/api/teams").then(r => r.ok ? r.json() : []),
    ]).then(([pg, allTeams]) => {
      if (pg) {
        setPlayground(pg as PlaygroundData);
        setMenu(resolvePlaygroundLayout((pg as PlaygroundData).layout).menu);
        const teamIds = new Set<string>((pg as PlaygroundData).teamIds);
        const filtered = (allTeams as TeamItem[]).filter(t => teamIds.has(t.id));
        setTeams(filtered);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  function isActive(href: string) {
    if (href === `/playground/${id}`) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* ── Inner sidebar ─────────────────────────────────────────── */}
      <aside
        style={{
          width: 200, minWidth: 200, height: "100%", overflow: "hidden",
          display: "flex", flexDirection: "column",
          borderRight: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        {/* Playground identity */}
        <div
          style={{
            padding: "12px 14px 10px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-muted)" }}>
              <Loader2 size={12} className="animate-spin" />
              <span style={{ fontSize: 12 }}>Loading…</span>
            </div>
          ) : playground ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {playground.icon && (
                <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{playground.icon}</span>
              )}
              <span
                style={{
                  fontSize: 13, fontWeight: 600, color: "var(--color-text)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {playground.name}
              </span>
            </div>
          ) : null}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 6px", display: "flex", flexDirection: "column", gap: 1 }}>
          <p style={SECTION_LABEL}>Workspace</p>

          <SidebarLink
            href={`/playground/${id}`}
            label="Dashboard"
            icon={LayoutGrid}
            active={isActive(`/playground/${id}`)}
          />
          {menu.map(itemId => {
            const item = MENU_CATALOG[itemId];
            if (!item) return null;
            const href = item.href(id);
            return (
              <SidebarLink
                key={itemId}
                href={href}
                label={item.label}
                icon={item.icon}
                active={item.scoped ? isActive(href) : pathname === href}
              />
            );
          })}

          {/* Teams section */}
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => setTeamsOpen(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 4, width: "100%",
                border: "none", background: "transparent", cursor: "pointer", padding: "4px 10px 2px",
              }}
            >
              <span style={SECTION_LABEL}>Teams</span>
              {teamsOpen
                ? <ChevronDown size={9} style={{ color: "var(--color-muted)", marginTop: 1 }} />
                : <ChevronRight size={9} style={{ color: "var(--color-muted)", marginTop: 1 }} />
              }
            </button>
            {teamsOpen && (
              teams.length === 0 ? (
                <p style={{ fontSize: 11, color: "var(--color-muted)", padding: "3px 10px" }}>No teams assigned</p>
              ) : (
                teams.map(team => (
                  <SidebarLink
                    key={team.id}
                    href={`/playground/${id}/team/${team.id}`}
                    label={team.name}
                    icon={Users}
                    active={isActive(`/playground/${id}/team/${team.id}`)}
                  />
                ))
              )
            )}
          </div>

          {/* Apps section */}
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => setAppsOpen(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 4, width: "100%",
                border: "none", background: "transparent", cursor: "pointer", padding: "4px 10px 2px",
              }}
            >
              <span style={SECTION_LABEL}>Apps</span>
              {appsOpen
                ? <ChevronDown size={9} style={{ color: "var(--color-muted)", marginTop: 1 }} />
                : <ChevronRight size={9} style={{ color: "var(--color-muted)", marginTop: 1 }} />
              }
            </button>
            {appsOpen && (
              <div style={{ padding: "4px 10px" }}>
                <p style={{ fontSize: 11, color: "var(--color-muted)", margin: "0 0 6px" }}>No apps installed</p>
                <button
                  disabled
                  style={{
                    fontSize: 11, color: "var(--color-muted)", background: "transparent",
                    border: "1px dashed var(--color-border)", borderRadius: 6,
                    padding: "4px 8px", cursor: "not-allowed", opacity: 0.6,
                  }}
                >
                  + Install App (coming soon)
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Settings at bottom */}
        <div style={{ borderTop: "1px solid var(--color-border)", padding: "6px" }}>
          <SidebarLink
            href={`/playground/${id}/settings`}
            label="Settings"
            icon={Settings}
            active={isActive(`/playground/${id}/settings`)}
          />
        </div>
      </aside>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}
