"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, Activity, Users, Bot, Server, ChevronRight,
} from "lucide-react";

const NAV = [
  { href: "/admin/analytics",  label: "Analytics",   icon: BarChart3, live: true  },
  { href: "/admin/api-monitor", label: "API Monitor", icon: Activity,  live: true  },
  { href: "/admin/users",       label: "Users",       icon: Users,     live: false },
  { href: "/admin/agents",      label: "Agents",      icon: Bot,       live: false },
  { href: "/admin/system",      label: "System",      icon: Server,    live: false },
];

export default function AdminSidebar() {
  const path = usePathname();

  return (
    <aside
      className="w-52 flex-shrink-0 flex flex-col border-r"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
          Admin Panel
        </p>
      </div>
      <nav className="flex-1 p-2">
        {NAV.map(({ href, label, icon: Icon, live }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] mb-0.5 group transition-all"
              style={{
                background: active ? "var(--color-surface-3)" : "transparent",
                color: active ? "var(--color-text)" : "var(--color-text-secondary)",
              }}
            >
              <Icon size={15} style={{ color: active ? "var(--color-brand)" : "var(--color-muted)" }} />
              <span className="flex-1">{label}</span>
              {!live && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{ background: "var(--color-surface-3)", color: "var(--color-muted)" }}
                >
                  soon
                </span>
              )}
              {active && <ChevronRight size={12} style={{ color: "var(--color-muted)" }} />}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t" style={{ borderColor: "var(--color-border)" }}>
        <Link
          href="/"
          className="text-[11px] hover:opacity-70 transition-opacity"
          style={{ color: "var(--color-muted)" }}
        >
          ← Back to App
        </Link>
      </div>
    </aside>
  );
}
