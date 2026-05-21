"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, MessageSquare, Calendar, Settings,
  Bot, PanelLeftClose, PanelLeft, Users, Wrench, Layers,
  Sparkles, Server, ChevronRight, Clock, Globe, Brain,
  Workflow, Link2, CreditCard, Sun, Moon, FolderOpen, BookOpen,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/UserMenu";
import { LogoMark } from "@/components/Logo";
import { useLanguage } from "@/components/LanguageProvider";
import { useTheme } from "@/components/ThemeProvider";

type Conversation = { id: string; title: string; updatedAt: string };

function SectionDivider({ label, collapsed, action, actionOpen }: {
  label: string;
  collapsed: boolean;
  action?: () => void;
  actionOpen?: boolean;
}) {
  if (collapsed) {
    return (
      <div
        style={{
          height: "1px",
          background: "var(--color-border)",
          margin: "6px 8px",
        }}
      />
    );
  }
  if (action) {
    return (
      <button
        onClick={action}
        className="w-full flex items-center justify-between px-3 pt-3 pb-1 group"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--color-muted)",
          }}
        >
          {label}
        </span>
        <ChevronRight
          size={10}
          style={{
            color: "var(--color-muted)",
            transform: actionOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.18s ease",
          }}
        />
      </button>
    );
  }
  return (
    <div className="px-3 pt-3 pb-1">
      <span
        style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--color-muted)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  const { locale, toggle: toggleLocale } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();

  const playgroundSubPaths = ["/projects", "/schedule", "/pipeline"];
  const isOnPlaygroundSub = playgroundSubPaths.some(p => pathname === p || pathname.startsWith(p + "/"));
  const [playgroundOpen, setPlaygroundOpen] = useState(false);
  useEffect(() => { if (isOnPlaygroundSub) setPlaygroundOpen(true); }, [pathname]);

  const [stackOpen, setStackOpen] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebarStackOpen");
      if (saved !== null) setStackOpen(JSON.parse(saved));
    } catch {}
  }, []);
  function toggleStack() {
    const next = !stackOpen;
    setStackOpen(next);
    try { localStorage.setItem("sidebarStackOpen", JSON.stringify(next)); } catch {}
  }

  const stackPaths = ["/optimize", "/server", "/websites", "/tools", "/connect", "/blog"];
  useEffect(() => {
    if (stackPaths.some(p => pathname === p || pathname.startsWith(p + "/"))) {
      setStackOpen(true);
    }
  }, [pathname]);

  const [chatOpen, setChatOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (chatRef.current && !chatRef.current.contains(e.target as Node)) setChatOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadConversations() {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) setConversations((await res.json() as Conversation[]).slice(0, 6));
    } catch {}
  }

  const isChatActive = pathname.startsWith("/chat");

  function navItemCls(active: boolean) {
    return cn(
      "nav-hover relative flex items-center gap-2.5 text-[13px] font-medium transition-all duration-[160ms] rounded-lg",
      collapsed ? "px-0 py-2 justify-center" : "px-3 py-[7px]"
    );
  }

  function navItemStyle(active: boolean): React.CSSProperties {
    return {
      color: active ? "var(--color-brand-hover)" : "var(--color-muted)",
      background: active ? "var(--color-brand-dim)" : "transparent",
      textDecoration: "none",
    };
  }

  const activeBar = (
    <span
      className="absolute left-0 gradient-bar"
      style={{ width: "3px", height: "16px", top: "50%", transform: "translateY(-50%)" }}
    />
  );

  const quickBtnStyle: React.CSSProperties = {
    width: 28, height: 28,
    display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 7, border: "none", background: "transparent", cursor: "pointer",
    color: "var(--color-muted)", flexShrink: 0, transition: "background 0.15s, color 0.15s",
  };

  function renderNavLink(
    href: string,
    label: string,
    Icon: React.ComponentType<{ size?: number; className?: string }>
  ) {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        key={href}
        href={href}
        title={collapsed ? label : undefined}
        className={navItemCls(active)}
        style={navItemStyle(active)}
      >
        {active && activeBar}
        <Icon size={14} className="shrink-0" />
        {!collapsed && <span className="animate-fade-in">{label}</span>}
      </Link>
    );
  }

  const playgroundSubItems = [
    { href: "/projects",  label: "Projects",   icon: FolderOpen },
    { href: "/schedule",  label: "Schedule",   icon: Calendar },
    { href: "/pipeline",  label: "Work Queue", icon: Workflow },
  ];

  const stackItems = [
    { href: "/optimize", label: "AI Efficiency", icon: Sparkles },
    { href: "/server",   label: "Server",        icon: Server },
    { href: "/websites", label: "Websites",      icon: Globe },
    { href: "/tools",    label: "Apps & Tools",  icon: Wrench },
    { href: "/connect",  label: "Integrations",  icon: Link2 },
    { href: "/blog",     label: "Blog",          icon: BookOpen },
  ];

  return (
    <aside
      className={cn(
        "glass-sidebar flex flex-col min-h-screen shrink-0 transition-all duration-[240ms] ease-in-out",
        collapsed ? "w-[52px]" : "w-[216px]"
      )}
    >
      {/* Logo + collapse */}
      <div
        className="flex items-center justify-between px-2.5 py-3"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <LogoMark size={28} />
          {!collapsed && (
            <div className="animate-fade-in flex flex-col leading-none">
              <span
                className="font-semibold text-[13px] tracking-tight"
                style={{ color: "var(--color-text)", letterSpacing: "-0.01em" }}
              >
                agent playground
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="nav-hover flex items-center justify-center rounded-lg shrink-0"
          style={{
            color: "var(--color-muted)", background: "transparent", border: "none",
            cursor: "pointer", width: "24px", height: "24px",
          }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft size={13} /> : <PanelLeftClose size={13} />}
        </button>
      </div>

      {/* Scrollable nav */}
      <nav className="flex flex-col gap-px p-1.5 flex-1 mt-1 overflow-y-auto">

        {renderNavLink("/dashboard", "Home", LayoutDashboard)}

        {/* Chat with recent conversations */}
        <div ref={chatRef} className="relative">
          <div className="flex items-center">
            <Link
              href="/chat"
              onClick={(e) => {
                if (pathname.startsWith("/chat")) {
                  e.preventDefault();
                  setChatOpen(v => !v);
                  if (!chatOpen) loadConversations();
                }
              }}
              className={cn(navItemCls(isChatActive), "flex-1")}
              style={navItemStyle(isChatActive)}
            >
              {isChatActive && activeBar}
              <MessageSquare size={14} className="shrink-0" />
              {!collapsed && <span className="animate-fade-in flex-1">Chat</span>}
            </Link>
            {!collapsed && (
              <button
                onClick={() => { setChatOpen(v => !v); if (!chatOpen) loadConversations(); }}
                className="nav-hover flex items-center justify-center rounded mr-0.5"
                style={{ width: "20px", height: "20px", border: "none", background: "transparent", cursor: "pointer", color: "var(--color-muted)", flexShrink: 0 }}
              >
                <ChevronRight size={11} style={{ transform: chatOpen ? "rotate(90deg)" : "none", transition: "transform 0.18s" }} />
              </button>
            )}
          </div>
          {chatOpen && !collapsed && (
            <div className="animate-fade-in ml-3 mt-px mb-0.5 flex flex-col gap-px">
              <Link href="/chat" className="nav-hover flex items-center gap-2 px-2 py-1.5 rounded-lg" onClick={() => setChatOpen(false)}>
                <Bot size={11} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
                <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>New Chat</span>
              </Link>
              {conversations.length === 0 ? (
                <p className="px-2 py-1 text-[11px]" style={{ color: "var(--color-muted)" }}>No chats yet</p>
              ) : (
                conversations.map(c => (
                  <Link
                    key={c.id}
                    href={`/chat?conversation=${c.id}`}
                    className="nav-hover flex items-center gap-2 px-2 py-1.5 rounded-lg min-w-0"
                    onClick={() => setChatOpen(false)}
                  >
                    <Clock size={11} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
                    <span className="text-[11px] truncate" style={{ color: "var(--color-text-secondary)" }}>{c.title || "Untitled"}</span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── WORK ── */}
        <SectionDivider label="Work" collapsed={collapsed} />

        {renderNavLink("/plans", "Plans", ClipboardList)}
        {renderNavLink("/agent-lab", "Teams", Users)}

        {/* Playground with sub-items */}
        <div>
          <div className="flex items-center">
            <Link
              href="/playground"
              className={cn(navItemCls(pathname === "/playground" || isOnPlaygroundSub), "flex-1")}
              style={navItemStyle(pathname === "/playground" || isOnPlaygroundSub)}
            >
              {(pathname === "/playground" || isOnPlaygroundSub) && activeBar}
              <Layers size={14} className="shrink-0" />
              {!collapsed && <span className="animate-fade-in flex-1">Playground</span>}
            </Link>
            {!collapsed && (
              <button
                onClick={() => setPlaygroundOpen(v => !v)}
                className="nav-hover flex items-center justify-center rounded mr-0.5"
                style={{ width: "20px", height: "20px", border: "none", background: "transparent", cursor: "pointer", color: "var(--color-muted)", flexShrink: 0 }}
              >
                <ChevronRight size={11} style={{ transform: playgroundOpen ? "rotate(90deg)" : "none", transition: "transform 0.18s" }} />
              </button>
            )}
          </div>
          {playgroundOpen && !collapsed && (
            <div className="animate-fade-in ml-3 mt-px mb-0.5 flex flex-col gap-px">
              {playgroundSubItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className="nav-hover flex items-center gap-2 px-2 py-1.5 rounded-lg"
                    style={{
                      color: active ? "var(--color-brand-hover)" : "var(--color-text-secondary)",
                      background: active ? "var(--color-brand-dim)" : "transparent",
                      textDecoration: "none",
                    }}
                  >
                    <Icon size={11} style={{ flexShrink: 0 }} />
                    <span className="text-[11px]">{label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── KNOWLEDGE ── */}
        <SectionDivider label="Knowledge" collapsed={collapsed} />
        {renderNavLink("/files", "Brain & Files", Brain)}

        {/* ── STACK ── */}
        <SectionDivider label="Stack" collapsed={collapsed} action={toggleStack} actionOpen={stackOpen} />
        {(stackOpen || collapsed) && stackItems.map(({ href, label, icon }) => renderNavLink(href, label, icon))}

      </nav>

      {/* Bottom: Billing, Settings, user */}
      <div className="flex flex-col" style={{ borderTop: "1px solid var(--color-border)" }}>
        <div className="px-1.5 pt-1.5 pb-0.5 flex flex-col gap-px">
          {renderNavLink("/billing", "Billing", CreditCard)}
          {isAdmin && renderNavLink("/users", "Users", Users)}
          {renderNavLink("/settings", "App Settings", Settings)}
        </div>

        {/* Quick: language + theme */}
        <div
          className={cn("px-1.5 pb-1", collapsed ? "flex flex-col items-center gap-0.5" : "flex items-center gap-0.5")}
        >
          <button
            onClick={toggleLocale}
            title={locale === "en" ? "Español" : "English"}
            className="nav-hover"
            style={quickBtnStyle}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)";
              (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--color-muted)";
            }}
          >
            <span style={{ fontSize: "10px", fontWeight: 700, lineHeight: 1, letterSpacing: "0.04em" }}>
              {locale === "en" ? "ES" : "EN"}
            </span>
          </button>
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            className="nav-hover"
            style={quickBtnStyle}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)";
              (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--color-muted)";
            }}
          >
            {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>

        {/* User menu */}
        <div className="px-1.5 pb-2" style={{ borderTop: "1px solid var(--color-border)", paddingTop: "6px" }}>
          <UserMenu collapsed={collapsed} />
        </div>
      </div>
    </aside>
  );
}
