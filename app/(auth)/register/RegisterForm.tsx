"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [inviteCode, setInvite]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [done, setDone]           = useState(false);

  const requireInvite = process.env.NEXT_PUBLIC_REQUIRE_INVITE !== "false";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, inviteCode: inviteCode || undefined }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Registration failed");

      setDone(true);
      // Auto sign-in after registration
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.ok) {
        setTimeout(() => router.push("/chat"), 800);
      } else {
        setTimeout(() => router.push("/login"), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-background)" }}>
      <div className="w-full max-w-sm px-4">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-3">
            <LogoMark size={44} />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Create account</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>Start your free Agent Playground</p>
        </div>

        {done ? (
          <div className="glass-card p-6 flex flex-col items-center gap-3" style={{ borderColor: "rgba(52,211,153,0.3)" }}>
            <CheckCircle2 size={32} style={{ color: "var(--color-green)" }} />
            <p className="font-semibold" style={{ color: "var(--color-text)" }}>Account created!</p>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>Taking you to the app…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card p-6 flex flex-col gap-4">
            {error && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg" style={{ background: "var(--color-red-dim)", border: "1px solid rgba(248,113,113,0.2)" }}>
                <AlertCircle size={14} style={{ color: "var(--color-red)", flexShrink: 0 }} />
                <p className="text-[13px]" style={{ color: "var(--color-red)" }}>{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>Name <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="glass-input px-3 py-2.5 text-sm w-full" style={{ color: "var(--color-text)" }} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoFocus className="glass-input px-3 py-2.5 text-sm w-full" style={{ color: "var(--color-text)" }} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required className="glass-input px-3 py-2.5 text-sm w-full" style={{ color: "var(--color-text)" }} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>Confirm password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" required className="glass-input px-3 py-2.5 text-sm w-full" style={{ color: "var(--color-text)" }} />
            </div>

            {requireInvite && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>Invite code</label>
                <input type="text" value={inviteCode} onChange={(e) => setInvite(e.target.value)} placeholder="Required to create an account" required className="glass-input px-3 py-2.5 text-sm w-full" style={{ color: "var(--color-text)" }} />
              </div>
            )}

            <button type="submit" disabled={loading || !email || !password || !confirm} className="btn-primary flex items-center justify-center gap-2 py-2.5 mt-1">
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}

        <p className="text-center text-[11px] mt-4" style={{ color: "var(--color-muted)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--color-accent)" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
