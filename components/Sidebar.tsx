"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FlaskConical,
  MessageSquare,
  Calendar,
  FolderOpen,
  Settings,
  Bot,
  PanelLeftClose,
  PanelLeft,
  Users,
  Wrench,
  CreditCard,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/UserMenu";

const navItems = [
  { href: "/dashboard",  label: "Dashboard", icon: LayoutDashboard },
  { href: "/agent-lab",  label: "Agent Lab",  icon: FlaskConical    },
  { href: "/chat",       label: "Chat",       icon: MessageSquare   },
  { href: "/projects",   label: "Projects",   icon: Layers          },
  { href: "/tools",      label: "Tools",      icon: Wrench          },
  { href: "/schedule",   label: "Schedule",   icon: Calendar        },
  { href: "/files",      label: "Files",      icon: FolderOpen      },
  { href: "/billing",   label: "Billing",    icon: CreditCard      },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  return (
    <aside
      className={cn(
        "glass-sidebar flex flex-col min-h-screen shrink-0 transition-all duration-300 ease-in-out",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo + Collapse toggle */}
      <div
        className="flex items-center justify-between px-4 py-4"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              background: "var(--color-surface-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              width: "32px",
              height: "32px",
            }}
          >
            <Bot size={16} color="var(--color-text)" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm animate-fade-in" style={{ color: "var(--color-text)" }}>
              Playground
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors"
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
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "relative flex items-center gap-3 text-sm font-medium transition-all duration-200",
                collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5",
                "rounded-lg hover:bg-white/[0.04]"
              )}
              style={{ color: active ? "var(--color-text)" : "var(--color-muted)" }}
            >
              {active && (
                <span
                  className="absolute left-0 gradient-bar"
                  style={{
                    width: "3px", height: "20px",
                    top: "50%", transform: "translateY(-50%)",
                    borderRadius: "0 3px 3px 0",
                  }}
                />
              )}
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span className="animate-fade-in">{label}</span>}
            </Link>
          );
        })}

        {/* Admin-only: Users */}
        {isAdmin && (
          <Link
            href="/users"
            title={collapsed ? "Users" : undefined}
            className={cn(
              "relative flex items-center gap-3 text-sm font-medium transition-all duration-200",
              collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5",
              "rounded-lg hover:bg-white/[0.04]"
            )}
            style={{ color: pathname.startsWith("/users") ? "var(--color-text)" : "var(--color-muted)" }}
          >
            {pathname.startsWith("/users") && (
              <span
                className="absolute left-0 gradient-bar"
                style={{
                  width: "3px", height: "20px",
                  top: "50%", transform: "translateY(-50%)",
                  borderRadius: "0 3px 3px 0",
                }}
              />
            )}
            <Users size={16} className="shrink-0" />
            {!collapsed && <span className="animate-fade-in">Users</span>}
          </Link>
        )}
      </nav>

      {/* Bottom — Settings + UserMenu */}
      <div className="p-2 flex flex-col gap-1" style={{ borderTop: "1px solid var(--color-border)" }}>
        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          className={cn(
            "flex items-center gap-3 text-sm font-medium rounded-lg hover:bg-white/[0.04] transition-colors",
            collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5"
          )}
          style={{ color: pathname === "/settings" ? "var(--color-text)" : "var(--color-muted)" }}
        >
          <Settings size={16} className="shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>

        <UserMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
