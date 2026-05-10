"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, ShieldCheck, ChevronUp } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

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

  const menuItemStyle: React.CSSProperties = {
    color: "var(--color-muted)",
    fontSize: "13px",
    textDecoration: "none",
    display: "flex",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
  };

  return (
    <div className="relative">
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
          {isAdmin && (
            <Link
              href="/users"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2"
              style={{ ...menuItemStyle, color: "var(--color-text)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <ShieldCheck size={13} style={{ color: "var(--color-text-secondary)" }} />
              Manage Users
            </Link>
          )}

          {isAdmin && <div style={{ height: "1px", background: "var(--color-border)", margin: "2px 0" }} />}

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2.5 px-3 py-2"
            style={{ ...menuItemStyle, color: "var(--color-red)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center w-full rounded-lg transition-colors",
          collapsed ? "justify-center p-1.5" : "gap-2.5 px-2.5 py-1.5"
        )}
        style={{ background: "transparent", border: "none", cursor: "pointer" }}
        title={collapsed ? `${name ?? email} (${role})` : undefined}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
      >
        <div
          className="flex items-center justify-center shrink-0 text-[10px] font-bold"
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "7px",
            background: "var(--color-brand-dim)",
            color: "var(--color-brand-hover)",
            border: "1px solid rgba(99,102,241,0.25)",
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
                    background: role === "admin" ? "var(--color-brand-dim)" : "var(--color-green-dim)",
                    color: role === "admin" ? "var(--color-brand-hover)" : "var(--color-green)",
                  }}
                >
                  {role}
                </span>
                <span className="text-[9px]" style={{ color: "var(--color-muted)" }}>{plan}</span>
              </div>
            </div>
            <ChevronUp
              size={12}
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
