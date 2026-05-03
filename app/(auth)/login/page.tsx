"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bot, Loader2, AlertCircle } from "lucide-react";
import { Suspense } from "react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Check if setup is needed, redirect if so
  useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then((data) => { if (data.needsSetup) router.replace("/setup"); })
      .catch(() => {});
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--color-background)" }}
    >
      <div className="w-full max-w-sm px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex items-center justify-center mb-3"
            style={{
              background: "linear-gradient(135deg, var(--color-accent), var(--color-text-secondary))",
              borderRadius: "16px",
              width: "52px",
              height: "52px",
            }}
          >
            <Bot size={24} color="white" />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
            Playground
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="glass-card p-6 flex flex-col gap-4">
          {error && (
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg animate-fade-in"
              style={{ background: "var(--color-red-dim)", border: "1px solid rgba(248,113,113,0.2)" }}
            >
              <AlertCircle size={14} style={{ color: "var(--color-red)", flexShrink: 0 }} />
              <p className="text-[13px]" style={{ color: "var(--color-red)" }}>{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
              className="glass-input px-3 py-2.5 text-sm w-full"
              style={{ color: "var(--color-text)" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="glass-input px-3 py-2.5 text-sm w-full"
              style={{ color: "var(--color-text)" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="btn-primary flex items-center justify-center gap-2 py-2.5 mt-1"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-[11px] mt-4" style={{ color: "var(--color-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color: "var(--color-accent)" }}>Create one →</Link>
        </p>
      </div>
    </div>
  );
}

// Suspense wrapper required for useSearchParams
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
