"use client";

import Link from "next/link";
import { Sparkles, Server, Globe, Wrench, Link2, BookOpen, ArrowRight } from "lucide-react";

const STACK_ITEMS = [
  {
    href: "/optimize",
    label: "AI Efficiency",
    desc: "Route tasks to local AI models to reduce costs. Monitor usage and savings.",
    icon: Sparkles,
    color: "var(--color-brand)",
  },
  {
    href: "/server",
    label: "Server",
    desc: "Manage your VPS: run commands, check status, install tools via SSH.",
    icon: Server,
    color: "var(--color-green)",
  },
  {
    href: "/websites",
    label: "Websites",
    desc: "Monitor and manage the websites your agents maintain.",
    icon: Globe,
    color: "var(--color-yellow)",
  },
  {
    href: "/tools",
    label: "Apps & Tools",
    desc: "Browse installed tools and add new capabilities to your agents.",
    icon: Wrench,
    color: "#f97316",
  },
  {
    href: "/connect",
    label: "Integrations",
    desc: "Connect Telegram, n8n, Claude Desktop, ChatGPT, and other services.",
    icon: Link2,
    color: "#8b5cf6",
  },
  {
    href: "/blog",
    label: "Blog Pipeline",
    desc: "Manage your content pipeline. Brief agents to write and publish posts.",
    icon: BookOpen,
    color: "#ec4899",
  },
];

export default function StackPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Your Stack</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
          The infrastructure your agents run on. Power-user controls for your platform.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STACK_ITEMS.map(({ href, label, desc, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="glass-card p-4 rounded-xl flex gap-4 items-start group transition-all hover:shadow-md"
            style={{ border: "1px solid var(--color-border)", textDecoration: "none" }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: `${color}20` }}
            >
              <Icon size={20} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{label}</p>
                <ArrowRight size={13} style={{ color: "var(--color-muted)", flexShrink: 0 }} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: "var(--color-muted)" }}>{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
