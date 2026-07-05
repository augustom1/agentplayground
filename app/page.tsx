import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/Logo";

export const metadata: Metadata = {
  title: "AgentPlayground — Run your own AI agent teams",
  description:
    "Free, local, and open-source. AgentPlayground gives you a coordinator, specialized agent teams, a knowledge brain, and organized Playgrounds — running on your computer in minutes.",
  openGraph: {
    title: "AgentPlayground — Run your own AI agent teams",
    description:
      "Free, local, and open-source AI agent platform. Runs on Docker Desktop. Works with OpenAI, Anthropic, or free local models.",
    url: "https://agentplayground.net",
    siteName: "AgentPlayground",
    type: "website",
  },
};

const BRAND = "var(--color-brand)";
const BRAND_TEXT = "#0a1628";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/chat");

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
      {/* ── Header ─────────────────────────────────────────────── */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <LogoMark size={26} />
            <span style={{ fontWeight: "600", fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>
              AgentPlayground
            </span>
          </div>
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

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section style={{ padding: "6rem 1.5rem 5rem", textAlign: "center" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              fontWeight: "700",
              lineHeight: "1.15",
              letterSpacing: "-0.03em",
              marginBottom: "1.5rem",
            }}
          >
            Run your own AI agent teams.
          </h1>
          <p
            style={{
              fontSize: "1.0625rem",
              color: "var(--color-text-secondary)",
              lineHeight: "1.75",
              marginBottom: "2.5rem",
              maxWidth: "560px",
              margin: "0 auto 2.5rem",
            }}
          >
            Free, local, and open-source. AgentPlayground gives you a coordinator, specialized
            agent teams, a knowledge brain, and organized Playgrounds — running on your computer
            in minutes.
          </p>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: "1.25rem",
            }}
          >
            <Link
              href="/download"
              style={{
                background: BRAND,
                color: BRAND_TEXT,
                padding: "0.75rem 1.75rem",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "0.9375rem",
              }}
            >
              Download Free
            </Link>
            <a
              href="https://github.com/agentplayground/app"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "var(--color-surface-2)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
                padding: "0.75rem 1.75rem",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "500",
                fontSize: "0.9375rem",
              }}
            >
              View on GitHub ↗
            </a>
          </div>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
            Runs on Docker Desktop. Works with OpenAI, Anthropic, or free local models.
          </p>
        </div>
      </section>

      {/* ── Three features ─────────────────────────────────────── */}
      <section style={{ padding: "4rem 1.5rem", background: "var(--color-surface)" }}>
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {(
            [
              {
                icon: "⬡",
                title: "Agent teams",
                desc: "Not just prompts. Real teams with skills, memory, and a coordinator.",
              },
              {
                icon: "◰",
                title: "Playgrounds",
                desc: "Organize your agents by context: work, personal, education.",
              },
              {
                icon: "◉",
                title: "Your data",
                desc: "Everything runs locally. No cloud account, no subscriptions.",
              },
            ] as const
          ).map(({ icon, title, desc }) => (
            <div
              key={title}
              style={{
                padding: "1.5rem",
                background: "var(--color-surface-2)",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ fontSize: "1.375rem", marginBottom: "0.75rem" }}>{icon}</div>
              <h3 style={{ fontWeight: "600", fontSize: "1rem", marginBottom: "0.5rem" }}>{title}</h3>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", lineHeight: "1.65" }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section style={{ padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "1.625rem",
              fontWeight: "700",
              letterSpacing: "-0.02em",
              marginBottom: "2.5rem",
              textAlign: "center",
            }}
          >
            How it works
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {(
              [
                "Download and run with Docker",
                "Enter your API key (OpenAI or Anthropic) — takes 2 minutes",
                "Create agent teams and start delegating work",
              ] as const
            ).map((step, i) => (
              <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div
                  style={{
                    flexShrink: 0,
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8125rem",
                    fontWeight: "600",
                    color: BRAND,
                  }}
                >
                  {i + 1}
                </div>
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    lineHeight: "1.7",
                    paddingTop: "3px",
                    fontSize: "0.9375rem",
                  }}
                >
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ─────────────────────────────────────────── */}
      <section style={{ padding: "4rem 1.5rem", textAlign: "center", background: "var(--color-surface)" }}>
        <p style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.25rem" }}>
          Ready to try it?
        </p>
        <Link
          href="/download"
          style={{
            display: "inline-block",
            background: BRAND,
            color: BRAND_TEXT,
            padding: "0.75rem 1.75rem",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "600",
            fontSize: "0.9375rem",
          }}
        >
          Download AgentPlayground →
        </Link>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
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
