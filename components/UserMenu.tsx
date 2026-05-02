"use client";

import { useSession, signOut } from "next-auth/react";
import {
  LogOut, ShieldCheck, ChevronUp, Languages, Sliders,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";

export function UserMenu({
  collapsed,
  onCustomize,
}: {
  collapsed: boolean;
  onCustomize?: () => void;
}) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const { locale, toggle: toggleLocale, t } = useLanguage();

  if (!session?.user) return null;

  const { name, email, role, plan } = session.user as {
    name?: string | null;
    email?: string | null;
    role: string;
    plan: string;
  };

  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : (email?.[0] ?? "U").toUpperCase();

  const isAdmin = role === "admin";

  return (
    <div className="relative">
      {/* Popup menu */}
      {open && !collapsed && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "0",
            right: "0",
            overflow: "hidden",
            zIndex: 50,
          }}
        >
          {/* Admin: Manage Users */}
          {isAdmin && (
            <Link
              href="/users"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 transition-colors"
              style={{ color: "var(--color-text)", fontSize: "13px", textDecoration: "none" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <ShieldCheck size={13} style={{ color: "var(--color-text-secondary)" }} />
              Manage Users
            </Link>
          )}

          {/* Separator */}
          <div style={{ height: "1px", background: "var(--color-border)", margin: "2px 0" }} />

          {/* Language toggle */}
          <button
            onClick={() => { toggleLocale(); }}
            className="flex items-center gap-2.5 px-3 py-2.5 w-full text-left transition-colors"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "13px" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <Languages size={13} style={{ color: "var(--color-text-secondary)" }} />
            {locale === "en" ? "Español" : "English"}
          </button>

          {/* Customize sidebar */}
          {onCustomize && (
            <button
              onClick={() => { setOpen(false); onCustomize(); }}
              className="flex items-center gap-2.5 px-3 py-2.5 w-full text-left transition-colors"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "13px" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <Sliders size={13} style={{ color: "var(--color-text-secondary)" }} />
              Customize sidebar
            </button>
          )}

          {/* Separator */}
          <div style={{ height: "1px", background: "var(--color-border)", margin: "2px 0" }} />

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2.5 px-3 py-2.5 w-full text-left transition-colors"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-red)", fontSize: "13px" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center w-full rounded-lg transition-colors",
          collapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2"
        )}
        style={{ background: "transparent", border: "none", cursor: "pointer" }}
        title={collapsed ? `${name ?? email} (${role})` : undefined}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
      >
        {/* Avatar */}
        <div
          className="flex items-center justify-center shrink-0 text-[11px] font-bold"
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: "var(--color-surface-3)",
            color: "var(--color-text)",
          }}
        >
          {initials}
        </div>

        {!collapsed && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[12px] font-medium truncate" style={{ color: "var(--color-text)" }}>
                {name ?? email}
              </p>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[9px] px-1.5 py-0 rounded-full font-medium"
                  style={{
                    background: role === "admin" ? "rgba(255,255,255,0.08)" : "var(--color-green-dim)",
                    color: role === "admin" ? "var(--color-text)" : "var(--color-green)",
                  }}
                >
                  {role}
                </span>
                <span className="text-[9px]" style={{ color: "var(--color-muted)" }}>{plan}</span>
              </div>
            </div>
            <ChevronUp
              size={13}
              style={{
                color: "var(--color-muted)",
                transform: open ? "rotate(0deg)" : "rotate(180deg)",
                transition: "transform 0.2s",
                flexShrink: 0,
              }}
            />
          </>
        )}
      </button>
    </div>
  );
}
