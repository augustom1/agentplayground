"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { LogoMark } from "@/components/Logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/chat";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

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

    const result = await signIn("credentials", { email, password, redirect: false });

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
      <div className="w-full max-w-[360px] px-4">

        {/* Logo + wordmark */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <LogoMark size={44} />
          <div className="text-center">
            <h1
              className="text-[17px] font-semibold tracking-tight"
              style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}
            >
              Agent Playground
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--color-muted)" }}>
              Sign in to your workspace
            </p>
          </div>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="glass-card p-6 flex flex-col gap-4"
          style={{ background: "var(--color-surface)" }}
        >
          {error && (
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg animate-fade-in"
              style={{ background: "var(--color-red-dim)", border: "1px solid rgba(224,112,112,0.2)" }}
            >
              <AlertCircle size={13} style={{ color: "var(--color-red)", flexShrink: 0 }} />
              <p className="text-[12px]" style={{ color: "var(--color-red)" }}>{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "var(--color-muted)", letterSpacing: "0.06em" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
              autoComplete="email"
              className="glass-input px-3 py-2.5 text-[14px] w-full"
              style={{ color: "var(--color-text)" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "var(--color-muted)", letterSpacing: "0.06em" }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="glass-input px-3 py-2.5 text-[14px] w-full"
              style={{ color: "var(--color-text)" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="btn-primary flex items-center justify-center gap-2 py-2.5 mt-1"
            style={{ fontSize: "14px" }}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
