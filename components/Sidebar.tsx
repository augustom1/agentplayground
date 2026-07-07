"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Settings, Users, Plus, MessageSquare,
  LayoutGrid, Layers, Loader2, X,
  ChevronLeft, ChevronRight, Search, Menu,
  PanelLeftClose, Sun, Moon, Shield, Send,
  ArrowRight, Check, Network, Brain, FolderOpen,
  ChevronDown, Calendar, SlidersHorizontal, Store,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/UserMenu";
import { LogoMark } from "@/components/Logo";
import { useLanguage } from "@/components/LanguageProvider";
import { useTheme } from "@/components/ThemeProvider";
import { TaskRouter } from "@/components/TaskRouter";
import { CustomizeSidebar } from "@/components/CustomizeSidebar";
import {
  resolveSidebarLayout, DEFAULT_SIDEBAR_LAYOUT, type SidebarLayout,
} from "@/lib/sidebar-registry";

type SidebarTab = "chat" | "playgrounds" | "overview";

type PlaygroundItem = { id: string; name: string; icon: string | null; color: string | null };
type TeamItem = { id: string; name: string; isSystemTeam?: boolean };
type ConversationItem = { id: string; title: string | null; _count: { messages: number } };

type PlaygroundConfig = {
  name: string;
  icon: string;
  description: string;
  suggestedTeamIds: string[];
  suggestedBrainTags: string[];
  newTeamsNeeded: { name: string; role: string; description: string }[];
};

type PanelMessage = { role: "user" | "assistant"; content: string };
type PanelState = "chatting" | "proposing" | "creating" | "done";

function NavItem({
  href, label, icon: Icon, collapsed, active,
}: {
  href: string; label: string;
  icon: React.ComponentType<{ size?: number }>;
  collapsed: boolean; active: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      style={{
        display: "flex", alignItems: "center",
        gap: collapsed ? 0 : "10px",
        padding: collapsed ? "7px 0" : "7px 10px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: "8px", fontSize: "13px", textDecoration: "none",
        transition: "background 0.12s, color 0.12s",
        background: active ? "var(--color-surface-3)" : "transparent",
        color: active ? "var(--color-text)" : "var(--color-text-secondary)",
        fontWeight: active ? 500 : 400,
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <span style={{ opacity: 0.75, flexShrink: 0, display: "inline-flex" }}><Icon size={14} /></span>
      {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>}
    </Link>
  );
}

const ICON_BTN: React.CSSProperties = {
  width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: 7, border: "none", background: "transparent", cursor: "pointer",
  color: "var(--color-muted)", flexShrink: 0,
};

// Collapsible section header — user-toggleable, persisted in the sidebar layout.
function CollapsibleSection({
  label, collapsed, onToggle, children,
}: {
  label: string; collapsed: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", width: "100%",
          padding: "4px 10px 2px", border: "none", background: "transparent",
          cursor: "pointer", gap: 4,
        }}
      >
        <span style={{ ...SECTION_LABEL, padding: 0, flex: 1, textAlign: "left" }}>{label}</span>
        <ChevronDown
          size={12}
          style={{
            color: "var(--color-muted)", flexShrink: 0,
            transition: "transform 0.15s", transform: collapsed ? "rotate(-90deg)" : "none",
          }}
        />
      </button>
      {!collapsed && <div>{children}</div>}
    </div>
  );
}

const SECTION_LABEL: React.CSSProperties = {
  fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em",
  textTransform: "uppercase", color: "var(--color-muted)",
  padding: "4px 10px 2px", margin: 0,
};

const OPENING_MESSAGE = "Hi! I'll help you set up your playground. What would you like to use it for? For example: 'A marketing workspace with content and social media agents' or 'A dev environment for my backend projects'.";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  const { locale, toggle: toggleLocale } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTaskRouter, setShowTaskRouter] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [layout, setLayout] = useState<SidebarLayout>(DEFAULT_SIDEBAR_LAYOUT);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Tab pill state — synced to route ─────────────────
  const [tab, setTab] = useState<SidebarTab>("chat");
  useEffect(() => {
    if (pathname.startsWith("/playground")) setTab("playgrounds");
    else if (pathname.startsWith("/overview")) setTab("overview");
  }, [pathname]);

  const [playgrounds, setPlaygrounds] = useState<PlaygroundItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [recents, setRecents] = useState<ConversationItem[]>([]);

  // ── Playground creation panel ────────────────────────
  const [showPanel, setShowPanel] = useState(false);
  const [panelState, setPanelState] = useState<PanelState>("chatting");
  const [panelMessages, setPanelMessages] = useState<PanelMessage[]>([]);
  const [panelInput, setPanelInput] = useState("");
  const [panelLoading, setPanelLoading] = useState(false);
  const [proposedConfig, setProposedConfig] = useState<PlaygroundConfig | null>(null);
  const [createdPgId, setCreatedPgId] = useState<string | null>(null);
  const [createdPgName, setCreatedPgName] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showPanel) {
      setTimeout(() => panelInputRef.current?.focus(), 100);
    }
  }, [showPanel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [panelMessages, panelLoading]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  useEffect(() => {
    fetch("/api/playgrounds")
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => { if (Array.isArray(data)) setPlaygrounds(data as PlaygroundItem[]); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/teams")
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => {
        if (Array.isArray(data)) setTeams((data as TeamItem[]).filter(t => !t.isSystemTeam).slice(0, 8));
      })
      .catch(() => {});
  }, []);

  // Recents — refresh when navigating so new chats appear
  useEffect(() => {
    fetch("/api/conversations")
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => {
        if (Array.isArray(data)) setRecents((data as ConversationItem[]).filter(c => c._count.messages > 0).slice(0, 8));
      })
      .catch(() => {});
  }, [pathname]);

  // User's customizable sidebar layout (items, sections, agent shortcuts)
  useEffect(() => {
    fetch("/api/settings/sidebar")
      .then(r => r.ok ? r.json() : null)
      .then((data: unknown) => { if (data) setLayout(resolveSidebarLayout(data)); })
      .catch(() => {});
  }, []);

  // Persist a layout change (Customize UI save, or a section collapse toggle).
  function saveLayout(next: SidebarLayout) {
    setLayout(next);
    fetch("/api/settings/sidebar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => {});
  }

  function toggleSection(id: string) {
    saveLayout({
      ...layout,
      sections: layout.sections.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s),
    });
  }

  function sectionCollapsed(id: string): boolean {
    return layout.sections.find(s => s.id === id)?.collapsed === true;
  }
  function sectionHidden(id: string): boolean {
    return layout.sections.find(s => s.id === id)?.hidden === true;
  }
  function itemVisible(id: string): boolean {
    const it = layout.items.find(i => i.id === id);
    return it ? it.hidden !== true : false;
  }

  function goCreateMeeting() {
    router.push(`/chat?team=coordinator&q=${encodeURIComponent("Schedule a meeting: ")}`);
  }

  // Renders one built-in Chat-tab item by id (order + visibility come from the layout).
  function chatItemNode(id: string): React.ReactNode {
    switch (id) {
      case "new-chat":
        return <NavItem key="new-chat" href="/chat?new=1" label="New chat" icon={Plus} collapsed={false} active={false} />;
      case "create-meeting":
        return (
          <button
            key="create-meeting"
            onClick={goCreateMeeting}
            style={{
              display: "flex", alignItems: "center", gap: "10px", width: "100%",
              padding: "7px 10px", borderRadius: "8px", fontSize: "13px",
              border: "none", background: "transparent", cursor: "pointer", textAlign: "left",
              color: "var(--color-text-secondary)", transition: "background 0.12s",
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <span style={{ opacity: 0.75, flexShrink: 0, display: "inline-flex" }}><Calendar size={14} /></span>
            <span>Create a meeting</span>
          </button>
        );
      case "brain":
        // Same-page hash links don't fire hashchange (Next uses pushState) — force it so the hub switches sections.
        return (
          <Link
            key="brain"
            href="/overview#brain"
            onClick={() => { if (window.location.pathname.startsWith("/overview")) window.location.hash = "brain"; }}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "7px 10px", borderRadius: "8px", fontSize: "13px", textDecoration: "none",
              transition: "background 0.12s", background: "transparent", color: "var(--color-text-secondary)",
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <span style={{ opacity: 0.75, flexShrink: 0, display: "inline-flex" }}><Brain size={14} /></span>
            <span>Brain</span>
          </Link>
        );
      case "projects":
        return (
          <div
            key="projects"
            title="Projects — coming soon"
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "7px 10px", borderRadius: "8px",
              fontSize: "13px", color: "var(--color-muted)", cursor: "default",
            }}
          >
            <span style={{ opacity: 0.6, flexShrink: 0, display: "inline-flex" }}><FolderOpen size={14} /></span>
            <span>Projects</span>
            <span style={{
              marginLeft: "auto", fontSize: "9px", fontWeight: 600, letterSpacing: "0.05em",
              textTransform: "uppercase", color: "var(--color-muted)",
              border: "1px solid var(--color-border)", borderRadius: "4px", padding: "1px 5px",
            }}>Soon</span>
          </div>
        );
      default:
        return null;
    }
  }

  function openCreatePlayground() {
    setPanelState("chatting");
    setPanelMessages([{ role: "assistant", content: OPENING_MESSAGE }]);
    setPanelInput("");
    setProposedConfig(null);
    setCreatedPgId(null);
    setCreatedPgName(null);
    setShowPanel(true);
  }

  async function handlePanelSend() {
    if (!panelInput.trim() || panelLoading) return;
    const userContent = panelInput.trim();
    setPanelInput("");

    const newMessages: PanelMessage[] = [...panelMessages, { role: "user", content: userContent }];
    setPanelMessages(newMessages);
    setPanelLoading(true);

    try {
      const res = await fetch("/api/playground-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json() as {
        text: string;
        proposedConfig?: PlaygroundConfig;
        done?: boolean;
        playgroundId?: string;
        playgroundName?: string;
      };

      const updatedMessages: PanelMessage[] = [...newMessages, { role: "assistant", content: data.text }];
      setPanelMessages(updatedMessages);

      if (data.done && data.playgroundId) {
        setCreatedPgId(data.playgroundId);
        setCreatedPgName(data.playgroundName ?? "New Playground");
        const icon = data.proposedConfig?.icon ?? proposedConfig?.icon ?? null;
        setPlaygrounds(prev => [...prev, { id: data.playgroundId!, name: data.playgroundName!, icon, color: null }]);
        setPanelState("done");
      } else if (data.proposedConfig) {
        setProposedConfig(data.proposedConfig);
        setPanelState("proposing");
      }
    } catch {
      setPanelMessages(prev => [...prev, { role: "assistant", content: "I couldn't reach your AI provider — check your key in Settings > API Keys. You can also create a playground without me: open the Playgrounds tab and use New playground." }]);
    } finally {
      setPanelLoading(false);
    }
  }

  async function handleLooksGood() {
    if (!proposedConfig) return;
    setPanelState("creating");
    const confirmMsg: PanelMessage = { role: "user", content: "Looks good! Please create it." };
    setPanelMessages(prev => [...prev, confirmMsg]);

    try {
      const res = await fetch("/api/playground-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...panelMessages, confirmMsg],
          confirmedConfig: proposedConfig,
        }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json() as {
        text: string;
        done?: boolean;
        playgroundId?: string;
        playgroundName?: string;
      };

      setPanelMessages(prev => [...prev, { role: "assistant", content: data.text }]);

      if (data.done && data.playgroundId) {
        setCreatedPgId(data.playgroundId);
        setCreatedPgName(data.playgroundName ?? proposedConfig.name);
        setPlaygrounds(prev => [...prev, {
          id: data.playgroundId!,
          name: data.playgroundName ?? proposedConfig.name,
          icon: proposedConfig.icon ?? null,
          color: null,
        }]);
        setPanelState("done");
      } else {
        setPanelState("chatting");
      }
    } catch {
      setPanelMessages(prev => [...prev, { role: "assistant", content: "Creating the playground failed — that step needs a working AI provider (Settings > API Keys). You can also create it manually: Playgrounds tab, New playground." }]);
      setPanelState("chatting");
    }
  }

  function handleChangeSomething() {
    setProposedConfig(null);
    setPanelState("chatting");
    setPanelMessages(prev => [...prev, { role: "assistant", content: "Of course! What would you like to change?" }]);
    setTimeout(() => panelInputRef.current?.focus(), 100);
  }

  function closePanel() {
    setShowPanel(false);
  }

  function openCreatedPlayground() {
    if (createdPgId) {
      setShowPanel(false);
      router.push(`/playground/${createdPgId}`);
    }
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const w = collapsed ? 56 : 260;

  const TABS: Array<{ id: SidebarTab; label: string }> = [
    { id: "chat", label: "Chat" },
    { id: "playgrounds", label: "Playgrounds" },
    { id: "overview", label: "Overview" },
  ];

  return (
    <aside
      className="glass-sidebar flex flex-col h-full"
      style={{
        width: `${w}px`, minWidth: `${w}px`,
        transition: "width 0.2s ease, min-width 0.2s ease",
        overflow: "hidden",
      }}
    >
      {/* ── Top control bar ─────────────────────────────── */}
      <div
        style={{
          display: "flex", alignItems: "center",
          padding: "6px 8px", gap: "2px",
          borderBottom: "1px solid var(--color-border)",
          justifyContent: collapsed ? "center" : "space-between",
        }}
      >
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <button
              onClick={() => router.back()}
              style={ICON_BTN}
              title="Go back"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-muted)"; }}
            >
              <ChevronLeft size={14} />
            </button>

            <button
              style={ICON_BTN}
              title="Search"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-muted)"; }}
            >
              <Search size={13} />
            </button>

            {/* Hamburger — Settings, Admin, Users, language, theme */}
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                style={{
                  ...ICON_BTN,
                  background: menuOpen ? "var(--color-hover-subtle)" : "transparent",
                  color: menuOpen ? "var(--color-text-secondary)" : "var(--color-muted)",
                }}
                title="Menu"
              >
                <Menu size={13} />
              </button>
              {menuOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100,
                  background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                  borderRadius: "10px", padding: "4px", minWidth: "180px",
                  boxShadow: "var(--shadow-md)",
                }}>
                  {[
                    { href: "/settings", label: "Settings", icon: Settings },
                    { href: "/store", label: "Store", icon: Store },
                    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
                    ...(isAdmin ? [{ href: "/users", label: "Users", icon: Users }] : []),
                  ].map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px", width: "100%",
                        padding: "6px 10px", borderRadius: "7px", textDecoration: "none",
                        color: isActive(href) ? "var(--color-text)" : "var(--color-text-secondary)",
                        fontSize: "12px", fontWeight: isActive(href) ? 500 : 400,
                        background: isActive(href) ? "var(--color-surface-3)" : "transparent",
                      }}
                      onMouseEnter={e => { if (!isActive(href)) (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; }}
                      onMouseLeave={e => { if (!isActive(href)) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <span style={{ opacity: 0.7, display: "inline-flex" }}><Icon size={13} /></span>
                      {label}
                    </Link>
                  ))}
                  <div style={{ height: "1px", background: "var(--color-border)", margin: "4px 6px" }} />
                  <button
                    onClick={() => { toggleLocale(); setMenuOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px", width: "100%",
                      padding: "6px 10px", borderRadius: "7px", border: "none",
                      background: "transparent", cursor: "pointer",
                      color: "var(--color-text-secondary)", fontSize: "12px", textAlign: "left",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <span style={{ fontSize: "10px", fontWeight: 700, width: 20, textAlign: "center", color: "var(--color-muted)", letterSpacing: "0.04em" }}>
                      {locale === "en" ? "ES" : "EN"}
                    </span>
                    {locale === "en" ? "Switch to Spanish" : "Switch to English"}
                  </button>
                  <button
                    onClick={() => { toggleTheme(); setMenuOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px", width: "100%",
                      padding: "6px 10px", borderRadius: "7px", border: "none",
                      background: "transparent", cursor: "pointer",
                      color: "var(--color-text-secondary)", fontSize: "12px", textAlign: "left",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
                    {theme === "dark" ? "Light mode" : "Dark mode"}
                  </button>
                  <div style={{ height: "1px", background: "var(--color-border)", margin: "4px 6px" }} />
                  <button
                    onClick={() => { setShowCustomize(true); setMenuOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px", width: "100%",
                      padding: "6px 10px", borderRadius: "7px", border: "none",
                      background: "transparent", cursor: "pointer",
                      color: "var(--color-text-secondary)", fontSize: "12px", textAlign: "left",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <span style={{ opacity: 0.7, display: "inline-flex" }}><SlidersHorizontal size={13} /></span>
                    Customize UI
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(v => !v)}
          style={{ ...ICON_BTN, marginLeft: collapsed ? 0 : "auto" }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-muted)"; }}
        >
          {collapsed ? <ChevronRight size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {/* ── Logo row ─────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        padding: collapsed ? "10px 0" : "10px 14px",
      }}>
        <Link href="/chat" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }} title={collapsed ? "Home" : undefined}>
          <LogoMark size={18} />
          {!collapsed && (
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)", letterSpacing: "-0.01em" }}>
              Agent Playground
            </span>
          )}
        </Link>
      </div>

      {/* ── Tab pill — Chat | Playgrounds | Overview ─────── */}
      {!collapsed && (
        <div style={{
          margin: "0 8px 10px", padding: "3px",
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border)",
          borderRadius: "10px",
          display: "flex", gap: "2px", flexShrink: 0,
        }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  if (t.id === "overview") router.push("/overview");
                }}
                style={{
                  flex: 1, padding: "5px 0", borderRadius: "7px", border: "none",
                  cursor: "pointer", fontSize: "12px",
                  background: active ? "var(--color-surface-3)" : "transparent",
                  color: active ? "var(--color-text)" : "var(--color-muted)",
                  fontWeight: active ? 500 : 400,
                  transition: "background 0.12s, color 0.12s",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "var(--color-muted)"; }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Tab content ──────────────────────────────────── */}
      <nav
        style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          display: "flex", flexDirection: "column", gap: "1px",
          padding: collapsed ? "0 6px 8px" : "0 8px 8px",
        }}
      >
        {collapsed ? (
          <>
            <NavItem href="/chat" label="Chat" icon={MessageSquare} collapsed active={isActive("/chat")} />
            <NavItem href="/playgrounds" label="Playgrounds" icon={LayoutGrid} collapsed active={isActive("/playgrounds") || isActive("/playground")} />
            <NavItem href="/overview" label="Overview" icon={Layers} collapsed active={isActive("/overview")} />
          </>
        ) : tab === "chat" ? (
          <>
            {/* Built-in items — order + visibility from the user's layout */}
            {layout.items.filter(i => itemVisible(i.id)).map(i => chatItemNode(i.id))}

            {/* Collapsible sections — order + visibility + collapsed state from the layout */}
            {layout.sections.filter(s => !sectionHidden(s.id)).map(sec => {
              if (sec.id === "shortcuts") {
                if (layout.shortcuts.length === 0) return null;
                return (
                  <CollapsibleSection key="shortcuts" label="Shortcuts" collapsed={sectionCollapsed("shortcuts")} onToggle={() => toggleSection("shortcuts")}>
                    {layout.shortcuts.map(sc => (
                      <NavItem key={sc.id} href={`/chat?team=${sc.target}`} label={sc.label} icon={MessageSquare} collapsed={false} active={false} />
                    ))}
                  </CollapsibleSection>
                );
              }
              if (sec.id === "chat-with") {
                return (
                  <CollapsibleSection key="chat-with" label="Chat with" collapsed={sectionCollapsed("chat-with")} onToggle={() => toggleSection("chat-with")}>
                    <NavItem href="/chat?team=coordinator" label="Playground Keeper" icon={Network} collapsed={false} active={false} />
                    {teams.map(t => (
                      <NavItem key={t.id} href={`/chat?team=${t.id}`} label={t.name} icon={Users} collapsed={false} active={false} />
                    ))}
                  </CollapsibleSection>
                );
              }
              if (sec.id === "recents") {
                if (recents.length === 0) return null;
                return (
                  <CollapsibleSection key="recents" label="Recents" collapsed={sectionCollapsed("recents")} onToggle={() => toggleSection("recents")}>
                    {recents.map(c => (
                      <Link
                        key={c.id}
                        href={`/chat?c=${c.id}`}
                        style={{
                          display: "block", padding: "5px 10px", borderRadius: "8px",
                          textDecoration: "none", fontSize: "12px",
                          color: "var(--color-text-secondary)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                      >
                        {c.title || "Untitled chat"}
                      </Link>
                    ))}
                  </CollapsibleSection>
                );
              }
              return null;
            })}
          </>
        ) : tab === "playgrounds" ? (
          <>
            {/* Coordinator quick chat — the task router */}
            <button
              onClick={() => setShowTaskRouter(true)}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "7px 10px", borderRadius: "8px", width: "100%",
                fontSize: "13px", border: "none", background: "transparent",
                cursor: "pointer", textAlign: "left",
                color: "var(--color-text-secondary)",
                transition: "background 0.12s, color 0.12s",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <span style={{ opacity: 0.75, flexShrink: 0, display: "inline-flex" }}><Network size={14} /></span>
              <span>Quick task</span>
            </button>

            <div style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "2px 10px 4px" }}>
                <span style={{ ...SECTION_LABEL, padding: 0, flex: 1 }}>Playgrounds</span>
                <button
                  onClick={openCreatePlayground}
                  title="New playground"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 18, height: 18, borderRadius: 4, border: "none",
                    background: "transparent", cursor: "pointer", color: "var(--color-muted)",
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-muted)"; }}
                >
                  <Plus size={11} />
                </button>
              </div>

              {playgrounds.length === 0 ? (
                <button
                  onClick={openCreatePlayground}
                  style={{
                    display: "block", width: "100%", padding: "5px 10px",
                    fontSize: "12px", color: "var(--color-muted)", background: "none",
                    border: "none", cursor: "pointer", textAlign: "left",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--color-muted)"}
                >
                  + Create your first Playground
                </button>
              ) : (
                playgrounds.map(pg => (
                  <NavItem
                    key={pg.id}
                    href={`/playground/${pg.id}`}
                    label={pg.name}
                    icon={LayoutGrid}
                    collapsed={false}
                    active={isActive(`/playground/${pg.id}`)}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          <NavItem href="/overview" label="Overview" icon={Layers} collapsed={false} active={isActive("/overview")} />
        )}
      </nav>

      {/* ── Playground creation panel ─────────────────────── */}
      {showPanel && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(0,0,0,0.45)",
            }}
            onClick={panelState !== "creating" ? closePanel : undefined}
          />

          {/* Slide-in panel */}
          <div
            style={{
              position: "fixed", right: 0, top: 0, bottom: 0,
              width: 440, zIndex: 201,
              background: "var(--color-surface)",
              borderLeft: "1px solid var(--color-border)",
              display: "flex", flexDirection: "column",
              boxShadow: "-12px 0 40px rgba(0,0,0,0.25)",
            }}
          >
            {/* Panel header */}
            <div style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--color-border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                Create a Playground
              </h2>
              {panelState !== "creating" && (
                <button
                  onClick={closePanel}
                  style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--color-muted)", display: "flex", padding: 4, borderRadius: 6 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--color-muted)"}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Messages list */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "16px 20px",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              {panelMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "88%",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: msg.role === "user" ? "var(--color-brand)" : "var(--color-surface-2)",
                    color: msg.role === "user" ? "#0a1628" : "var(--color-text)",
                    fontSize: 13, lineHeight: 1.55,
                    border: msg.role === "assistant" ? "1px solid var(--color-border)" : "none",
                  }}
                >
                  {msg.content}
                </div>
              ))}

              {/* Thinking indicator */}
              {panelLoading && (
                <div style={{
                  alignSelf: "flex-start",
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 12px", borderRadius: "14px 14px 14px 4px",
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-muted)", fontSize: 12,
                }}>
                  <Loader2 size={11} className="animate-spin" />
                  Thinking…
                </div>
              )}

              {/* Proposing state: config card */}
              {panelState === "proposing" && proposedConfig && !panelLoading && (
                <div style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12, padding: "14px 16px",
                  display: "flex", flexDirection: "column", gap: 10,
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{proposedConfig.name}</div>
                    <div style={{ fontSize: 12, color: "var(--color-muted)" }}>{proposedConfig.description}</div>
                  </div>

                  {proposedConfig.suggestedTeamIds.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 4 }}>Teams</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {proposedConfig.suggestedTeamIds.length} existing team{proposedConfig.suggestedTeamIds.length !== 1 ? "s" : ""} included
                      </div>
                    </div>
                  )}

                  {proposedConfig.newTeamsNeeded.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 4 }}>New teams to create</div>
                      {proposedConfig.newTeamsNeeded.map((t, i) => (
                        <div key={i} style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>+ {t.name}</div>
                      ))}
                    </div>
                  )}

                  {proposedConfig.suggestedBrainTags.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 4 }}>Brain tags</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {proposedConfig.suggestedBrainTags.map(tag => (
                          <span key={tag} style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 20,
                            background: "var(--color-surface-3)", color: "var(--color-text-secondary)",
                            border: "1px solid var(--color-border)",
                          }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                    <button
                      onClick={handleLooksGood}
                      style={{
                        flex: 1, padding: "8px 14px", borderRadius: 8, border: "none",
                        background: "var(--color-brand)", color: "#0a1628",
                        cursor: "pointer", fontSize: 13, fontWeight: 600,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      <Check size={13} /> Looks good
                    </button>
                    <button
                      onClick={handleChangeSomething}
                      style={{
                        padding: "8px 14px", borderRadius: 8,
                        border: "1px solid var(--color-border)",
                        background: "transparent", color: "var(--color-text-secondary)",
                        cursor: "pointer", fontSize: 13,
                      }}
                    >
                      Change something
                    </button>
                  </div>
                </div>
              )}

              {/* Creating state */}
              {panelState === "creating" && (
                <div style={{
                  alignSelf: "flex-start",
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", borderRadius: "14px 14px 14px 4px",
                  background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                  color: "var(--color-muted)", fontSize: 13,
                }}>
                  <Loader2 size={13} className="animate-spin" />
                  Creating your playground…
                </div>
              )}

              {/* Done state */}
              {panelState === "done" && (
                <div style={{
                  background: "var(--color-brand-dim)",
                  border: "1px solid var(--color-brand-muted)",
                  borderRadius: 12, padding: "14px 16px",
                  display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text)", fontWeight: 500 }}>
                    <Check size={14} style={{ color: "var(--color-brand)" }} />
                    <span><strong>{createdPgName}</strong> is ready</span>
                  </div>
                  <button
                    onClick={openCreatedPlayground}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 14px", borderRadius: 8, border: "none",
                      background: "var(--color-brand)", color: "#0a1628",
                      cursor: "pointer", fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Open Playground <ArrowRight size={13} />
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            {(panelState === "chatting" || (panelState === "proposing" && !panelLoading)) && (
              <div style={{
                padding: "12px 20px",
                borderTop: "1px solid var(--color-border)",
                flexShrink: 0,
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <input
                    ref={panelInputRef}
                    value={panelInput}
                    onChange={e => setPanelInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey && !panelLoading && panelInput.trim()) {
                        e.preventDefault();
                        handlePanelSend();
                      }
                    }}
                    placeholder={panelState === "proposing" ? "Ask for changes…" : "Describe what you want…"}
                    disabled={panelLoading}
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13,
                      background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                      color: "var(--color-text)", outline: "none",
                      opacity: panelLoading ? 0.5 : 1,
                    }}
                  />
                  <button
                    onClick={handlePanelSend}
                    disabled={panelLoading || !panelInput.trim()}
                    style={{
                      width: 34, height: 34, borderRadius: 8, border: "none",
                      background: panelInput.trim() && !panelLoading ? "var(--color-brand)" : "var(--color-surface-3)",
                      color: panelInput.trim() && !panelLoading ? "#0a1628" : "var(--color-muted)",
                      cursor: panelInput.trim() && !panelLoading ? "pointer" : "not-allowed",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, transition: "background 0.1s",
                    }}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Footer for done/creating states */}
            {(panelState === "done") && (
              <div style={{
                padding: "10px 20px",
                borderTop: "1px solid var(--color-border)",
                display: "flex", justifyContent: "flex-end",
                flexShrink: 0,
              }}>
                <button
                  onClick={closePanel}
                  style={{
                    padding: "6px 14px", borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    background: "transparent", color: "var(--color-text-secondary)",
                    cursor: "pointer", fontSize: 13,
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Coordinator task router ───────────────────────── */}
      <TaskRouter open={showTaskRouter} onClose={() => setShowTaskRouter(false)} />

      {/* ── Customize UI editor ───────────────────────────── */}
      <CustomizeSidebar
        open={showCustomize}
        onClose={() => setShowCustomize(false)}
        layout={layout}
        teams={teams}
        onSave={saveLayout}
      />

      {/* ── Bottom — user menu only ───────────────────────── */}
      <div style={{ borderTop: "1px solid var(--color-border)", padding: collapsed ? "6px 6px 10px" : "6px 8px 10px" }}>
        <UserMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
