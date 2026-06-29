import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export const metadata: Metadata = {
  title: { default: "AgentPlayground", template: "%s — AgentPlayground" },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background)",
        color: "var(--color-text)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "0 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "60px",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              textDecoration: "none",
              color: "var(--color-text)",
            }}
          >
            <LogoMark size={24} />
            <span style={{ fontWeight: "600", fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>
              AgentPlayground
            </span>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <Link
              href="/download"
              style={{ color: "var(--color-text)", textDecoration: "none", fontSize: "0.875rem", fontWeight: "500" }}
            >
              Download
            </Link>
            <a
              href="https://github.com/agentplayground/app"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-text-secondary)", textDecoration: "none", fontSize: "0.875rem" }}
            >
              GitHub ↗
            </a>
            <Link
              href="/login"
              style={{ color: "var(--color-text-secondary)", textDecoration: "none", fontSize: "0.875rem" }}
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main style={{ flex: 1 }}>{children}</main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--color-border)", padding: "2rem 1.5rem", textAlign: "center" }}>
        <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>
          AgentPlayground — Free and open source ·{" "}
          <a
            href="https://github.com/agentplayground/app"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}
          >
            GitHub
          </a>{" "}
          ·{" "}
          <a
            href="mailto:hello@agentplayground.net"
            style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}
          >
            hello@agentplayground.net
          </a>
        </p>
      </footer>
    </div>
  );
}
