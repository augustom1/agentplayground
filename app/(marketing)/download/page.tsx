import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Download",
  description: "Download AgentPlayground for free. No account. No subscription. Just Docker.",
  openGraph: {
    title: "Download AgentPlayground",
    description: "Free. No account. No subscription. Just Docker.",
    url: "https://agentplayground.net/download",
    siteName: "AgentPlayground",
    type: "website",
  },
};

const BRAND = "var(--color-brand)";

async function getVersion(): Promise<{ version: string; downloadUrl: string }> {
  try {
    const res = await fetch("http://localhost:3000/api/version", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { version: "0.1.0", downloadUrl: "#" };
    const data = await res.json() as { version: string; downloadUrl: string };
    return { version: data.version, downloadUrl: data.downloadUrl || "#" };
  } catch {
    return { version: "0.1.0", downloadUrl: "#" };
  }
}

export default async function DownloadPage() {
  const { version, downloadUrl } = await getVersion();

  return (
    <div style={{ padding: "4rem 1.5rem 5rem" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "3rem" }}>
          <div
            style={{
              display: "inline-block",
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: "9999px",
              padding: "0.25rem 0.875rem",
              fontSize: "0.8125rem",
              color: BRAND,
              fontWeight: "500",
              marginBottom: "1rem",
              fontFamily: "var(--font-mono)",
            }}
          >
            v{version}
          </div>
          <h1
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: "700",
              letterSpacing: "-0.03em",
              marginBottom: "0.75rem",
            }}
          >
            Download AgentPlayground
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "1.0625rem", lineHeight: "1.65" }}>
            Free. No account. No subscription. Just Docker.
          </p>
        </div>

        {/* Download card */}
        <div
          style={{
            marginBottom: "3rem",
            padding: "1.5rem",
            background: "var(--color-surface)",
            borderRadius: "12px",
            border: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>
              AgentPlayground v{version}
            </div>
            <div style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
              Docker Compose package
            </div>
          </div>
          <a
            href={downloadUrl !== "#" ? downloadUrl : "#"}
            style={{
              background: BRAND,
              color: "#0a1628",
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "0.9375rem",
              whiteSpace: "nowrap",
            }}
          >
            Download v{version}
          </a>
        </div>

        {/* Requirements */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2
            style={{ fontSize: "1.0625rem", fontWeight: "600", marginBottom: "1rem", color: "var(--color-text)" }}
          >
            Requirements
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", color: "var(--color-text-secondary)", fontSize: "0.9375rem" }}>
              <span style={{ color: "var(--color-muted)", flexShrink: 0, paddingTop: "1px" }}>—</span>
              <span>
                <a
                  href="https://www.docker.com/products/docker-desktop/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: BRAND, textDecoration: "none" }}
                >
                  Docker Desktop
                </a>{" "}
                4.x+
              </span>
            </li>
            <li style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", color: "var(--color-text-secondary)", fontSize: "0.9375rem" }}>
              <span style={{ color: "var(--color-muted)", flexShrink: 0, paddingTop: "1px" }}>—</span>
              <span>Windows 10+ / macOS 12+ / Ubuntu 20.04+</span>
            </li>
            <li style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", color: "var(--color-text-secondary)", fontSize: "0.9375rem" }}>
              <span style={{ color: "var(--color-muted)", flexShrink: 0, paddingTop: "1px" }}>—</span>
              <span>4 GB RAM minimum</span>
            </li>
          </ul>
        </section>

        {/* Install steps */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2
            style={{ fontSize: "1.0625rem", fontWeight: "600", marginBottom: "1.25rem", color: "var(--color-text)" }}
          >
            Install
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Step n={1}>
              Install{" "}
              <a
                href="https://www.docker.com/products/docker-desktop/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: BRAND, textDecoration: "none" }}
              >
                Docker Desktop
              </a>
            </Step>
            <Step n={2}>Extract the ZIP</Step>
            <Step n={3}>
              Open{" "}
              <Code>.env.local</Code>, add your API key (get one free at{" "}
              <a
                href="https://platform.openai.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: BRAND, textDecoration: "none" }}
              >
                platform.openai.com
              </a>
              )
            </Step>
            <Step n={4}>
              Run <Code>start.bat</Code> (Windows) or <Code>./start.sh</Code> (Mac/Linux)
            </Step>
            <Step n={5}>
              Open{" "}
              <a href="http://localhost:3000" style={{ color: BRAND, textDecoration: "none" }}>
                http://localhost:3000
              </a>
            </Step>
          </div>
        </section>

        {/* API key info */}
        <section
          style={{
            padding: "1.5rem",
            background: "var(--color-surface)",
            borderRadius: "12px",
            border: "1px solid var(--color-border)",
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem" }}>
            Getting your API key
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ fontSize: "0.9375rem" }}>
              <span style={{ fontWeight: "500" }}>OpenAI</span>{" "}
              <span style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
                (recommended) —{" "}
              </span>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: BRAND, textDecoration: "none", fontSize: "0.875rem" }}
              >
                platform.openai.com/api-keys
              </a>
              <span style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
                {" "}— free to sign up, pay per use
              </span>
            </div>
            <div style={{ fontSize: "0.9375rem" }}>
              <span style={{ fontWeight: "500" }}>Anthropic</span>{" "}
              <span style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>—{" "}</span>
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: BRAND, textDecoration: "none", fontSize: "0.875rem" }}
              >
                console.anthropic.com
              </a>
              <span style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
                {" "}— same model
              </span>
            </div>
          </div>
        </section>

        <div style={{ marginTop: "2.5rem", textAlign: "center" }}>
          <Link href="/" style={{ color: "var(--color-text-secondary)", textDecoration: "none", fontSize: "0.875rem" }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
      <div
        style={{
          flexShrink: 0,
          width: "26px",
          height: "26px",
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
        {n}
      </div>
      <p
        style={{
          color: "var(--color-text-secondary)",
          lineHeight: "1.65",
          paddingTop: "3px",
          fontSize: "0.9375rem",
          margin: 0,
        }}
      >
        {children}
      </p>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <code
      style={{
        background: "var(--color-surface-2)",
        padding: "0.125rem 0.375rem",
        borderRadius: "4px",
        fontFamily: "var(--font-mono)",
        fontSize: "0.85em",
      }}
    >
      {children}
    </code>
  );
}
