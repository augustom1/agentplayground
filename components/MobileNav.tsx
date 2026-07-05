"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  MessageSquare, LayoutGrid, Layers,
  MoreHorizontal, X, Calendar, Settings, Brain,
  ClipboardList, Users,
} from "lucide-react";
import { useSession } from "next-auth/react";

// Same three tabs as the desktop sidebar pill: Chat | Playgrounds | Overview
const PRIMARY_TABS = [
  { href: "/chat",        label: "Chat",        icon: MessageSquare, subPaths: ["/chat"] },
  { href: "/playgrounds", label: "Playgrounds", icon: LayoutGrid,    subPaths: ["/playgrounds", "/playground"] },
  { href: "/overview",    label: "Overview",    icon: Layers,        subPaths: ["/overview"] },
];

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  useEffect(() => { setMoreOpen(false); }, [pathname]);

  const moreItems = [
    { href: "/files",    label: "Brain",    icon: Brain },
    { href: "/schedule", label: "Schedule", icon: Calendar },
    { href: "/plans",    label: "Plans",    icon: ClipboardList },
    { href: "/settings", label: "Settings", icon: Settings },
    ...(isAdmin ? [{ href: "/users", label: "Users", icon: Users }] : []),
  ];

  return (
    <>
      {/* More bottom-sheet */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-50"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="glass-card absolute bottom-0 left-0 right-0 rounded-t-2xl overflow-y-auto"
            style={{
              border: "1px solid var(--color-border)",
              maxHeight: "80vh",
              paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--color-border)" }} />
            </div>

            <div className="flex items-center justify-between px-4 py-2 mb-1">
              <h3 className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>More</h3>
              <button
                onClick={() => setMoreOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 px-4 pb-2">
              {moreItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all"
                    style={{
                      background: active ? "var(--color-brand-dim)" : "var(--color-surface-2)",
                      border: `1px solid ${active ? "var(--color-brand)" : "transparent"}`,
                      textDecoration: "none",
                      minHeight: 64,
                      justifyContent: "center",
                    }}
                    onClick={() => setMoreOpen(false)}
                  >
                    <item.icon
                      size={20}
                      style={{ color: active ? "var(--color-brand)" : "var(--color-text-secondary)" }}
                    />
                    <span
                      className="text-[9px] text-center leading-tight font-medium"
                      style={{ color: active ? "var(--color-brand)" : "var(--color-text)" }}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav
        className="md:hidden flex items-stretch justify-around shrink-0"
        style={{
          background: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
          height: "calc(56px + env(safe-area-inset-bottom, 0px))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {PRIMARY_TABS.map((tab) => {
          const active = tab.subPaths.some(p => pathname === p || pathname.startsWith(p + "/"));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1"
              style={{ textDecoration: "none" }}
            >
              <tab.icon
                size={20}
                style={{ color: active ? "var(--color-brand)" : "var(--color-muted)" }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? "var(--color-brand)" : "var(--color-muted)" }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 flex-1"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <MoreHorizontal size={20} style={{ color: "var(--color-muted)" }} />
          <span className="text-[10px] font-medium" style={{ color: "var(--color-muted)" }}>More</span>
        </button>
      </nav>
    </>
  );
}
