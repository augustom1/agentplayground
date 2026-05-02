"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  LayoutDashboard, FlaskConical, MessageSquare, Calendar, FolderOpen, Settings,
  Bot, PanelLeftClose, PanelLeft, Users, Wrench, Layers, Sparkles,
  Server, ChevronRight, Clock, Globe, MoreHorizontal, X, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/UserMenu";
import { LogoMark } from "@/components/Logo";
import { useLanguage } from "@/components/LanguageProvider";

type Conversation = { id: string; title: string; updatedAt: string };
type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const DEFAULT_PINNED = ["/dashboard", "/chat", "/agent-lab", "/schedule", "/files"];

// ── Customize Modal ────────────────────────────────────────────────────────────

function CustomizeModal({
  allItems,
  pinnedHrefs,
  onSave,
  onClose,
}: {
  allItems: NavItem[];
  pinnedHrefs: string[];
  onSave: (hrefs: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(pinnedHrefs));

  function toggle(href: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="glass-card p-5 w-full max-w-xs animate-slide-up"
        style={{ border: "1px solid var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
            Customize Sidebar
          </h2>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "2px" }}
          >
            <X size={15} />
          </button>
        </div>
        <p className="text-[11px] mb-3" style={{ color: "var(--color-muted)", lineHeight: 1.5 }}>
          Choose which items appear in your sidebar. Unchecked items go in the More menu.
        </p>

        {/* Item list */}
        <div className="flex flex-col gap-0.5 mb-4">
          {allItems.map((item) => {
            const pinned = selected.has(item.href);
            return (
              <button
                key={item.href}
                onClick={() => toggle(item.href)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all w-full text-left"
                style={{
                  background: pinned ? "var(--color-surface-3)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!pinned) (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)";
                }}
                onMouseLeave={(e) => {
                  if (!pinned) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <item.icon
                  size={14}
                  style={{ color: pinned ? "var(--color-text)" : "var(--color-muted)", flexShrink: 0 }}
                />
                <span
                  className="text-[13px] flex-1"
                  style={{ color: pinned ? "var(--color-text)" : "var(--color-muted)" }}
                >
                  {item.label}
                </span>
                <div
                  className="w-4 h-4 flex items-center justify-center rounded shrink-0"
                  style={{
                    background: pinned ? "var(--color-accent)" : "var(--color-surface-2)",
                    border: `1px solid ${pinned ? "var(--color-accent)" : "var(--color-border)"}`,
                    transition: "all 0.15s",
                  }}
                >
                  {pinned && <Check size={9} style={{ color: "var(--color-btn-primary-text)" }} />}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onSave([...selected])}
          className="btn-primary w-full py-2 text-sm"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  const { t } = useLanguage();

  // All nav items
  const allNavItems = useMemo<NavItem[]>(
    () => [
      { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
      { href: "/chat",      label: t("chat"),      icon: MessageSquare },
      { href: "/agent-lab", label: t("agentLab"),  icon: FlaskConical },
      { href: "/projects",  label: t("projects"),  icon: Layers },
      { href: "/tools",     label: t("tools"),     icon: Wrench },
      { href: "/schedule",  label: t("schedule"),  icon: Calendar },
      { href: "/files",     label: t("files"),     icon: FolderOpen },
      { href: "/websites",  label: t("websites"),  icon: Globe },
      { href: "/optimize",  label: t("optimize"),  icon: Sparkles },
      { href: "/server",    label: t("server"),    icon: Server },
      ...(isAdmin ? [{ href: "/users", label: t("users"), icon: Users }] : []),
    ],
    [t, isAdmin]
  );

  // Pinned items (loaded from localStorage)
  const [pinnedHrefs, setPinnedHrefs] = useState<string[]>(DEFAULT_PINNED);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebarPinned");
      if (saved) setPinnedHrefs(JSON.parse(saved));
    } catch {}
  }, []);

  function savePinned(hrefs: string[]) {
    setPinnedHrefs(hrefs);
    localStorage.setItem("sidebarPinned", JSON.stringify(hrefs));
  }

  const pinnedItems = allNavItems.filter((item) => pinnedHrefs.includes(item.href));
  const moreItems = allNavItems.filter((item) => !pinnedHrefs.includes(item.href));

  // Chat dropdown
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

  // More popup
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Customize modal
  const [customizeOpen, setCustomizeOpen] = useState(false);

  return (
    <>
      <aside
        className={cn(
          "glass-sidebar flex flex-col min-h-screen shrink-0 transition-all duration-300 ease-in-out",
          collapsed ? "w-[60px]" : "w-[220px]"
        )}
      >
        {/* Logo + Collapse toggle */}
        <div
          className="flex items-center justify-between px-3 py-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <LogoMark size={32} />
            {!collapsed && (
              <span className="font-semibold text-sm animate-fade-in truncate" style={{ color: "var(--color-text)" }}>
                Playground
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="nav-hover flex items-center justify-center rounded-lg transition-colors shrink-0"
            style={{
              color: "var(--color-muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              width: "28px",
              height: "28px",
            }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 p-2 flex-1 mt-1">
          {/* Pinned items */}
          {pinnedItems.map((item) => {
            if (item.href === "/chat") {
              return (
                <div key="/chat" ref={chatRef} className="relative">
                  <div className="flex items-center">
                    <Link
                      href="/chat"
                      onClick={(e) => {
                        if (pathname.startsWith("/chat")) {
                          e.preventDefault();
                          setChatOpen((v) => !v);
                          if (!chatOpen) loadConversations();
                        }
                      }}
                      className={cn(
                        "nav-hover relative flex items-center gap-3 text-sm font-medium transition-all duration-200 flex-1",
                        collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5",
                        "rounded-lg"
                      )}
                      style={{ color: isChatActive ? "var(--color-text)" : "var(--color-muted)" }}
                    >
                      {isChatActive && (
                        <span
                          className="absolute left-0 gradient-bar"
                          style={{ width: "3px", height: "20px", top: "50%", transform: "translateY(-50%)", borderRadius: "0 3px 3px 0" }}
                        />
                      )}
                      <MessageSquare size={16} className="shrink-0" />
                      {!collapsed && <span className="animate-fade-in flex-1">{t("chat")}</span>}
                    </Link>
                    {!collapsed && (
                      <button
                        onClick={() => { setChatOpen((v) => !v); if (!chatOpen) loadConversations(); }}
                        className="nav-hover flex items-center justify-center rounded transition-colors mr-1"
                        style={{ width: "22px", height: "22px", border: "none", background: "transparent", cursor: "pointer", color: "var(--color-muted)", flexShrink: 0 }}
                        title="Recent chats"
                      >
                        <ChevronRight size={12} style={{ transform: chatOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                      </button>
                    )}
                  </div>

                  {chatOpen && !collapsed && (
                    <div className="animate-fade-in ml-3 mt-0.5 mb-1 flex flex-col gap-0.5">
                      <Link
                        href="/chat"
                        className="nav-hover flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
                        onClick={() => setChatOpen(false)}
                      >
                        <Bot size={11} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
                        <span className="text-[11px] truncate" style={{ color: "var(--color-text-secondary)" }}>{t("newChat")}</span>
                      </Link>
                      {conversations.length === 0 ? (
                        <p className="px-2 py-1 text-[11px]" style={{ color: "var(--color-muted)" }}>{t("noChatsYet")}</p>
                      ) : (
                        conversations.map((c) => (
                          <Link
                            key={c.id}
                            href={`/chat?conversation=${c.id}`}
                            className="nav-hover flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors min-w-0"
                            onClick={() => setChatOpen(false)}
                          >
                            <Clock size={11} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
                            <span className="text-[11px] truncate" style={{ color: "var(--color-text-secondary)" }}>
                              {c.title || "Untitled"}
                            </span>
                          </Link>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            }

            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "nav-hover relative flex items-center gap-3 text-sm font-medium transition-all duration-200",
                  collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5",
                  "rounded-lg"
                )}
                style={{ color: active ? "var(--color-text)" : "var(--color-muted)" }}
              >
                {active && (
                  <span
                    className="absolute left-0 gradient-bar"
                    style={{ width: "3px", height: "20px", top: "50%", transform: "translateY(-50%)", borderRadius: "0 3px 3px 0" }}
                  />
                )}
                <item.icon size={16} className="shrink-0" />
                {!collapsed && <span className="animate-fade-in">{item.label}</span>}
              </Link>
            );
          })}

          {/* More button (when unpinned items exist) */}
          {moreItems.length > 0 && (
            <div ref={moreRef} className="relative mt-0.5">
              <button
                onClick={() => setMoreOpen((v) => !v)}
                className={cn(
                  "nav-hover w-full flex items-center gap-3 text-sm font-medium transition-all duration-200 rounded-lg",
                  collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5"
                )}
                style={{ color: "var(--color-muted)", background: "transparent", border: "none", cursor: "pointer" }}
                title="More"
              >
                <MoreHorizontal size={16} className="shrink-0" />
                {!collapsed && <span>More</span>}
              </button>

              {moreOpen && (
                <div
                  className="glass-panel animate-fade-in"
                  style={{
                    position: "absolute",
                    left: collapsed ? "calc(100% + 8px)" : 0,
                    right: collapsed ? "auto" : 0,
                    bottom: "calc(100% + 4px)",
                    zIndex: 60,
                    overflow: "hidden",
                    minWidth: "160px",
                  }}
                >
                  {moreItems.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 transition-colors"
                        style={{
                          color: active ? "var(--color-text)" : "var(--color-muted)",
                          fontSize: "13px",
                          textDecoration: "none",
                          display: "flex",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                      >
                        <item.icon size={14} style={{ flexShrink: 0 }} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Bottom — Settings + UserMenu */}
        <div className="p-2 flex flex-col gap-1" style={{ borderTop: "1px solid var(--color-border)" }}>
          <Link
            href="/settings"
            title={collapsed ? t("settings") : undefined}
            className={cn(
              "nav-hover flex items-center gap-3 text-sm font-medium rounded-lg transition-colors",
              collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5"
            )}
            style={{ color: pathname === "/settings" ? "var(--color-text)" : "var(--color-muted)" }}
          >
            <Settings size={16} className="shrink-0" />
            {!collapsed && <span>{t("settings")}</span>}
          </Link>

          <UserMenu collapsed={collapsed} onCustomize={() => setCustomizeOpen(true)} />
        </div>
      </aside>

      {/* Customize modal — rendered outside <aside> to avoid stacking context */}
      {customizeOpen && (
        <CustomizeModal
          allItems={allNavItems}
          pinnedHrefs={pinnedHrefs}
          onSave={(hrefs) => { savePinned(hrefs); setCustomizeOpen(false); }}
          onClose={() => setCustomizeOpen(false)}
        />
      )}
    </>
  );
}
