"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Settings, Users, Plus, MessageSquare,
  LayoutGrid, Loader2, X,
  ChevronLeft, ChevronRight, Search, Menu,
  PanelLeftClose, Sun, Moon, Shield, Send,
  ArrowRight, Check,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/UserMenu";
import { LogoMark } from "@/components/Logo";
import { useLanguage } from "@/components/LanguageProvider";
import { useTheme } from "@/components/ThemeProvider";

type PlaygroundItem = { id: string; name: string; icon: string | null; color: string | null };

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
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

const ICON_BTN: React.CSSProperties = {
  width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: 7, border: "none", background: "transparent", cursor: "pointer",
  color: "var(--color-muted)", flexShrink: 0,
};

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
  const menuRef = useRef<HTMLDivElement>(null);

  const [playgrounds, setPlaygrounds] = useState<PlaygroundItem[]>([]);
  const [showPlaygrounds, setShowPlaygrounds] = useState(true);

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
      setPanelMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
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
      setPanelMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
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

            {/* Hamburger ⋯ — Settings, Admin, Users, language, theme */}
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

      {/* ── New chat button ──────────────────────────────── */}
      <div style={{ padding: collapsed ? "0 6px 6px" : "0 8px 6px" }}>
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
        {/* SECTION: Main */}
        {!collapsed && <p style={SECTION_LABEL}>Main</p>}

        <NavItem href="/chat" label="Chat" icon={MessageSquare} collapsed={collapsed} active={isActive("/chat")} />
        <NavItem href="/overview" label="Overview" icon={LayoutGrid} collapsed={collapsed} active={isActive("/overview")} />

        {/* SECTION: Playgrounds */}
        {!collapsed && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "2px 10px 4px" }}>
              <button
                onClick={() => setShowPlaygrounds(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
              >
                <span style={{ ...SECTION_LABEL, padding: 0 }}>Playgrounds</span>
                <ChevronRight
                  size={10}
                  style={{
                    color: "var(--color-muted)",
                    transform: showPlaygrounds ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.15s",
                  }}
                />
              </button>
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

            {showPlaygrounds && (
              playgrounds.length === 0 ? (
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
                playgrounds.map(pg => {
                  const active = isActive(`/playground/${pg.id}`);
                  return (
                    <Link
                      key={pg.id}
                      href={`/playground/${pg.id}`}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "5px 10px", borderRadius: "8px", textDecoration: "none",
                        background: active ? "var(--color-surface-3)" : "transparent",
                        color: active ? "var(--color-text)" : "var(--color-text-secondary)",
                        fontSize: "12px", fontWeight: active ? 500 : 400,
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      {pg.icon ? (
                        <span style={{ fontSize: "13px", lineHeight: 1, flexShrink: 0 }}>{pg.icon}</span>
                      ) : (
                        <LayoutGrid size={12} style={{ opacity: 0.6, flexShrink: 0 }} />
                      )}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {pg.name}
                      </span>
                    </Link>
                  );
                })
              )
            )}
          </div>
        )}

        {/* Collapsed — show playground icons */}
        {collapsed && playgrounds.length > 0 && (
          <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {playgrounds.slice(0, 5).map(pg => {
              const active = isActive(`/playground/${pg.id}`);
              return (
                <Link
                  key={pg.id}
                  href={`/playground/${pg.id}`}
                  title={pg.name}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "7px 0", borderRadius: "8px", textDecoration: "none",
                    background: active ? "var(--color-surface-3)" : "transparent",
                    fontSize: "13px",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)"; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {pg.icon ? pg.icon : <LayoutGrid size={14} style={{ opacity: 0.6 }} />}
                </Link>
              );
            })}
          </div>
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>✨</span>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                  Create a Playground
                </h2>
              </div>
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
                    color: msg.role === "user" ? "#fff" : "var(--color-text)",
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{proposedConfig.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>{proposedConfig.name}</div>
                      <div style={{ fontSize: 12, color: "var(--color-muted)" }}>{proposedConfig.description}</div>
                    </div>
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
                  background: "rgba(212,113,90,0.08)",
                  border: "1px solid rgba(212,113,90,0.25)",
                  borderRadius: 12, padding: "14px 16px",
                  display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start",
                }}>
                  <div style={{ fontSize: 13, color: "var(--color-text)", fontWeight: 500 }}>
                    ✅ <strong>{createdPgName}</strong> is ready!
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

      {/* ── Bottom — user menu only ───────────────────────── */}
      <div style={{ borderTop: "1px solid var(--color-border)", padding: collapsed ? "6px 6px 10px" : "6px 8px 10px" }}>
        <UserMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
