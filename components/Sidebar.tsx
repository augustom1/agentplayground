"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Settings, Users, Wrench, Sparkles, Server, Clock,
  Globe, Brain, Workflow, Link2, CreditCard, Sun, Moon,
  FolderOpen, BookOpen, ClipboardList, Plus, Layers,
  MessageSquare, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
    { href: "/projects",   label: "Projects",    icon: FolderOpen },
    { href: "/schedule",   label: "Schedule",    icon: Calendar },
    { href: "/pipeline",   label: "Work Queue",  icon: Workflow },
  ],
  teams: [
    { href: "/agent-lab",  label: "Agent Lab",   icon: Users },
    { href: "/plans",      label: "Plans",       icon: ClipboardList },
    { href: "/optimize",   label: "AI Efficiency",icon: Sparkles },
    { href: "/tools",      label: "Apps & Tools", icon: Wrench },
    { href: "/connect",    label: "Integrations", icon: Link2 },
  ],
  brain: [
    { href: "/files",      label: "Brain & Files",icon: Brain },
    { href: "/projects",   label: "Projects",    icon: FolderOpen },
    { href: "/schedule",   label: "Schedule",    icon: Calendar },
    { href: "/server",     label: "Server",      icon: Server },
    { href: "/websites",   label: "Websites",    icon: Globe },
    { href: "/blog",       label: "Blog",        icon: BookOpen },
  ],
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

  useEffect(() => {
    if (pathname.startsWith("/agent-lab") || pathname.startsWith("/optimize") || pathname.startsWith("/tools") || pathname.startsWith("/connect")) {
      setActiveTab("teams");
    } else if (pathname.startsWith("/files") || pathname.startsWith("/brain") || pathname.startsWith("/server") || pathname.startsWith("/websites") || pathname.startsWith("/blog")) {
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
      } catch {} finally { setLoadingConvs(false); }
    }
    load();
  }, []);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const navItemBase: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "7px 10px", borderRadius: "8px",
    fontSize: "13px", textDecoration: "none",
    transition: "background 0.12s, color 0.12s",
    cursor: "pointer", border: "none", width: "100%", textAlign: "left",
  };

  function navStyle(active: boolean): React.CSSProperties {
    return {
      ...navItemBase,
      background: active ? "var(--color-surface-3)" : "transparent",
      color: active ? "var(--color-text)" : "var(--color-text-secondary)",
      fontWeight: active ? 500 : 400,
    };
  }

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: "chat",  label: "Chat",  icon: MessageSquare },
    { id: "teams", label: "Teams", icon: Users },
    { id: "brain", label: "Brain", icon: Brain },
  ];

  return (
    <aside
      className="glass-sidebar flex flex-col h-full"
      style={{ width: "260px", minWidth: "260px" }}
    >
      {/* ── Top tab bar ─────────────────────────────── */}
      <div
        className="flex items-center gap-1 px-3 py-2.5"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <Link href="/dashboard" className="mr-1 shrink-0" title="Home">
          <LogoMark size={20} />
        </Link>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); if (id === "chat") router.push("/chat"); else if (id === "teams") router.push("/agent-lab"); else router.push("/files"); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors"
            style={{
              background: activeTab === id ? "var(--color-surface-3)" : "transparent",
              border: "none", cursor: "pointer",
              color: activeTab === id ? "var(--color-text)" : "var(--color-muted)",
              fontSize: "13px", fontWeight: activeTab === id ? 500 : 400,
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── New chat button ──────────────────────────── */}
      <div className="px-2 pt-2.5 pb-1">
        <Link
          href="/chat"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg w-full transition-colors"
          style={{
            background: pathname === "/chat" ? "var(--color-surface-3)" : "transparent",
            color: pathname === "/chat" ? "var(--color-text)" : "var(--color-text-secondary)",
            fontSize: "13px", fontWeight: 500, textDecoration: "none",
          }}
          onMouseEnter={e => { if (pathname !== "/chat") (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; }}
          onMouseLeave={e => { if (pathname !== "/chat") (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <Plus size={14} style={{ opacity: 0.8 }} />
          New chat
        </Link>
      </div>

      {/* ── Main nav (tab-specific) ──────────────────── */}
      <nav className="flex flex-col gap-px px-2 flex-1 overflow-y-auto pb-2">
        {TAB_NAV[activeTab].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            style={navStyle(isActive(href))}
            onMouseEnter={e => { if (!isActive(href)) (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; }}
            onMouseLeave={e => { if (!isActive(href)) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <Icon size={14} style={{ opacity: 0.75, flexShrink: 0 }} />
            <span>{label}</span>
          </Link>
        ))}

        {/* Recents — show in chat tab */}
        {activeTab === "chat" && (
          <div className="mt-3">
            <p className="px-2 pb-1 pt-1 text-[10px] font-semibold tracking-[0.08em] uppercase" style={{ color: "var(--color-muted)" }}>
              Recents
            </p>
            {loadingConvs ? (
              <p className="px-2 py-1 text-[12px]" style={{ color: "var(--color-muted)" }}>Loading…</p>
            ) : conversations.length === 0 ? (
              <p className="px-2 py-1 text-[12px]" style={{ color: "var(--color-muted)" }}>No recent chats</p>
            ) : (
              conversations.map(c => (
                <Link
                  key={c.id}
                  href={`/chat?conversation=${c.id}`}
                  style={{ ...navItemBase, color: isActive(`/chat?conversation=${c.id}`) ? "var(--color-text)" : "var(--color-text-secondary)", fontSize: "12px" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  <Clock size={12} style={{ opacity: 0.6, flexShrink: 0 }} />
                  <span className="truncate">{c.title || "Untitled"}</span>
                </Link>
              ))
            )}
          </div>
        )}
      </nav>

      {/* ── Bottom ──────────────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--color-border)" }}>
        {/* Utility row */}
        <div className="px-2 pt-1.5 pb-0.5 flex flex-col gap-px">
          <Link key="/billing" href="/billing" style={navStyle(isActive("/billing"))}
            onMouseEnter={e => { if (!isActive("/billing")) (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; }}
            onMouseLeave={e => { if (!isActive("/billing")) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            <CreditCard size={14} style={{ opacity: 0.75 }} /><span>Billing</span>
          </Link>
          {isAdmin && (
            <Link href="/users" style={navStyle(isActive("/users"))}
              onMouseEnter={e => { if (!isActive("/users")) (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; }}
              onMouseLeave={e => { if (!isActive("/users")) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <Users size={14} style={{ opacity: 0.75 }} /><span>Users</span>
            </Link>
          )}
          <Link href="/settings" style={navStyle(isActive("/settings"))}
            onMouseEnter={e => { if (!isActive("/settings")) (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; }}
            onMouseLeave={e => { if (!isActive("/settings")) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            <Settings size={14} style={{ opacity: 0.75 }} /><span>Settings</span>
          </Link>
        </div>

        {/* Language + theme toggles */}
        <div className="px-2 pb-1 flex items-center gap-0.5">
          <button
            onClick={toggleLocale}
            title={locale === "en" ? "Español" : "English"}
            style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", color: "var(--color-muted)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-muted)"; }}
          >
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em" }}>{locale === "en" ? "ES" : "EN"}</span>
          </button>
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7, border: "none", background: "transparent", cursor: "pointer", color: "var(--color-muted)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-muted)"; }}
          >
            {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>

        {/* User profile chip */}
        <div className="px-2 pb-2.5" style={{ borderTop: "1px solid var(--color-border)", paddingTop: "6px" }}>
          <UserMenu collapsed={false} />
        </div>
      </div>
    </aside>
  );
}
