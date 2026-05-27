"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Settings, Users, Wrench, Sparkles, Server,
  Globe, Brain, Workflow, Link2, CreditCard, Sun, Moon,
  FolderOpen, BookOpen, ClipboardList, Plus, Layers,
  MessageSquare, Calendar, ChevronLeft, ChevronRight,
  Search, Menu, Clock, PanelLeftClose, StickyNote,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/UserMenu";
import { LogoMark } from "@/components/Logo";
import { useLanguage } from "@/components/LanguageProvider";
import { useTheme } from "@/components/ThemeProvider";

type Conversation = { id: string; title: string; updatedAt: string };
type Tab = "chat" | "teams" | "brain";

const TAB_NAV: Record<Tab, Array<{ href: string; label: string; icon: React.ComponentType<{ size?: number }> }>> = {
  chat: [
    { href: "/plans",      label: "Plans",       icon: ClipboardList },
    { href: "/playground", label: "Playground",  icon: Layers },
    { href: "/pipeline",   label: "Work Queue",  icon: Workflow },
  ],
  teams: [
    { href: "/agent-lab",  label: "Agent Lab",   icon: Users },
    { href: "/tools",      label: "Apps & Tools", icon: Wrench },
    { href: "/connect",    label: "Integrations", icon: Link2 },
    { href: "/optimize",   label: "AI Efficiency",icon: Sparkles },
  ],
  brain: [
    { href: "/notes",      label: "Notes",       icon: StickyNote },
    { href: "/files",      label: "Brain & Files",icon: Brain },
    { href: "/projects",   label: "Projects",    icon: FolderOpen },
    { href: "/schedule",   label: "Schedule",    icon: Calendar },
    { href: "/server",     label: "Server",      icon: Server },
    { href: "/websites",   label: "Websites",    icon: Globe },
    { href: "/blog",       label: "Blog",        icon: BookOpen },
  ],
};

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
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

const ICON_BTN: React.CSSProperties = {
  width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: 7, border: "none", background: "transparent", cursor: "pointer",
  color: "var(--color-muted)", flexShrink: 0,
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  const { locale, toggle: toggleLocale } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showRecents, setShowRecents] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      pathname.startsWith("/agent-lab") || pathname.startsWith("/optimize") ||
      pathname.startsWith("/tools") || pathname.startsWith("/connect")
    ) {
      setActiveTab("teams");
    } else if (
      pathname.startsWith("/files") || pathname.startsWith("/brain") ||
      pathname.startsWith("/server") || pathname.startsWith("/websites") ||
      pathname.startsWith("/blog") || pathname.startsWith("/projects")
    ) {
      setActiveTab("brain");
    } else {
      setActiveTab("chat");
    }
  }, [pathname]);

  useEffect(() => {
    async function load() {
      setLoadingConvs(true);
      try {
        const res = await fetch("/api/conversations");
        if (res.ok) setConversations((await res.json() as Conversation[]).slice(0, 8));
      } catch {
        // ignore
      } finally {
        setLoadingConvs(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const w = collapsed ? 56 : 260;

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: "chat",  label: "Chat",  icon: MessageSquare },
    { id: "teams", label: "Teams", icon: Users },
    { id: "brain", label: "Brain", icon: Brain },
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
            {/* Back */}
            <button
              onClick={() => router.back()}
              style={ICON_BTN}
              title="Go back"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-muted)"; }}
            >
              <ChevronLeft size={14} />
            </button>

            {/* Search */}
            <button
              style={ICON_BTN}
              title="Search"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-muted)"; }}
            >
              <Search size={13} />
            </button>

            {/* Hamburger — language + theme dropdown */}
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
                  {/* Navigation links */}
                  {[
                    { href: "/billing",  label: "Billing",  icon: CreditCard },
                    ...(isAdmin ? [{ href: "/users", label: "Users", icon: Users }] : []),
                    { href: "/settings", label: "Settings", icon: Settings },
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
                      onMouseLeave={e => { if (!isActive(href)) (e.currentTarget as HTMLElement).style.background = isActive(href) ? "var(--color-surface-3)" : "transparent"; }}
                    >
                      <span style={{ opacity: 0.7, display: "inline-flex" }}><Icon size={13} /></span>
                      {label}
                    </Link>
                  ))}
                  {/* Divider */}
                  <div style={{ height: "1px", background: "var(--color-border)", margin: "4px 6px" }} />
                  {/* Language toggle */}
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
                  {/* Theme toggle */}
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
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapse toggle */}
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
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }} title={collapsed ? "Home" : undefined}>
          <LogoMark size={18} />
          {!collapsed && (
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)", letterSpacing: "-0.01em" }}>
              Agent Playground
            </span>
          )}
        </Link>
      </div>

      {/* ── Tab pill box ─────────────────────────────────── */}
      <div style={{ padding: collapsed ? "0 6px 8px" : "0 8px 8px" }}>
        <div style={{
          background: "var(--color-background)",
          border: "1px solid var(--color-border)",
          borderRadius: "10px",
          padding: "3px",
          display: "flex",
          flexDirection: collapsed ? "column" : "row",
          gap: "2px",
        }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                if (id === "chat") router.push("/chat");
                else if (id === "teams") router.push("/agent-lab");
                else router.push("/files");
              }}
              title={collapsed ? label : undefined}
              style={{
                flex: collapsed ? undefined : 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: collapsed ? 0 : "5px",
                padding: collapsed ? "7px 0" : "5px 8px",
                borderRadius: "7px", border: "none", cursor: "pointer",
                background: activeTab === id ? "var(--color-surface-3)" : "transparent",
                color: activeTab === id ? "var(--color-text)" : "var(--color-muted)",
                fontSize: "12px", fontWeight: activeTab === id ? 500 : 400,
                transition: "background 0.12s, color 0.12s",
              }}
              onMouseEnter={e => {
                if (activeTab !== id) {
                  (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== id) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--color-muted)";
                }
              }}
            >
              <Icon size={13} />
              {!collapsed && label}
            </button>
          ))}
        </div>
      </div>

      {/* ── New chat button ──────────────────────────────── */}
      <div style={{ padding: collapsed ? "0 6px 4px" : "0 8px 4px" }}>
        <Link
          href="/chat"
          title={collapsed ? "New chat" : undefined}
          style={{
            display: "flex", alignItems: "center",
            gap: collapsed ? 0 : "8px",
            padding: collapsed ? "7px 0" : "6px 10px",
            justifyContent: collapsed ? "center" : "flex-start",
            borderRadius: "8px", textDecoration: "none",
            color: "var(--color-text-secondary)",
            fontSize: "13px", fontWeight: 500,
            transition: "background 0.12s",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
        >
          <Plus size={14} style={{ opacity: 0.8, flexShrink: 0 }} />
          {!collapsed && "New chat"}
        </Link>
      </div>

      {/* ── Main nav ─────────────────────────────────────── */}
      <nav
        style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          display: "flex", flexDirection: "column", gap: "1px",
          padding: collapsed ? "0 6px 8px" : "0 8px 8px",
        }}
      >
        {TAB_NAV[activeTab].map(item => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            collapsed={collapsed}
            active={isActive(item.href)}
          />
        ))}

        {/* Recents — chat tab, expanded only */}
        {activeTab === "chat" && !collapsed && (
          <div style={{ marginTop: "12px" }}>
            <button
              onClick={() => setShowRecents(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: "4px", width: "100%",
                padding: "4px 10px", border: "none", background: "transparent",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted)" }}>
                Recents
              </span>
              <ChevronRight
                size={10}
                style={{
                  color: "var(--color-muted)",
                  transform: showRecents ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.15s",
                }}
              />
            </button>
            {showRecents && (
              loadingConvs ? (
                <p style={{ padding: "4px 10px", fontSize: "12px", color: "var(--color-muted)" }}>Loading…</p>
              ) : conversations.length === 0 ? (
                <p style={{ padding: "4px 10px", fontSize: "12px", color: "var(--color-muted)" }}>No recent chats</p>
              ) : (
                conversations.map(c => (
                  <Link
                    key={c.id}
                    href={`/chat?conversation=${c.id}`}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "5px 10px", borderRadius: "8px", textDecoration: "none",
                      color: isActive(`/chat?conversation=${c.id}`) ? "var(--color-text)" : "var(--color-text-secondary)",
                      fontSize: "12px", transition: "background 0.12s",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <Clock size={11} style={{ opacity: 0.6, flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.title || "Untitled"}
                    </span>
                  </Link>
                ))
              )
            )}
          </div>
        )}
      </nav>

      {/* ── Bottom — user menu only ───────────────────────── */}
      <div style={{ borderTop: "1px solid var(--color-border)", padding: collapsed ? "6px 6px 10px" : "6px 8px 10px" }}>
        <UserMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
