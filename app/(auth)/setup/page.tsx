"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Loader2, AlertCircle, CheckCircle2,
  ChevronRight, ChevronLeft, Eye, EyeOff,
  Cpu, Bot, Layers,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type Provider = "openai" | "anthropic" | "ollama";
type StarterPack = "personal" | "business" | "development" | "blank";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVIDERS: Array<{
  id: Provider;
  name: string;
  label: string;
  description: string;
  keyPlaceholder?: string;
  link?: { label: string; href: string };
}> = [
  {
    id: "openai",
    name: "OpenAI",
    label: "Recommended for most users",
    description: "Works with GPT-4o and GPT-4o mini. Cheap for everyday use.",
    keyPlaceholder: "sk-...",
    link: { label: "Get a free key →", href: "https://platform.openai.com/api-keys" },
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    label: "Best reasoning quality",
    description: "Works with Claude Sonnet and Haiku.",
    keyPlaceholder: "sk-ant-...",
    link: { label: "Get a free key →", href: "https://console.anthropic.com" },
  },
  {
    id: "ollama",
    name: "Ollama",
    label: "Local · Free · Private",
    description: "Runs AI models on your computer. No API costs, but requires more RAM. Detected automatically if running.",
  },
];

const STARTERS: Array<{
  id: StarterPack;
  name: string;
  description: string;
  Icon: React.FC<{ size?: number; className?: string }>;
}> = [
  {
    id: "personal",
    name: "Personal",
    description: "Trainer, nutritionist, finance advisor, schedule manager",
    Icon: ({ size = 16 }) => (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M3 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "business",
    name: "Business",
    description: "Operations, sales, content, and client management agents",
    Icon: ({ size = 16 }) => (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <rect x="2" y="6" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M5 6V4a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "development",
    name: "Development",
    description: "Code review, architecture, and documentation agents",
    Icon: ({ size = 16 }) => (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <path d="M5 5L2 8l3 3M11 5l3 3-3 3M9 3l-2 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: "blank",
    name: "Blank",
    description: "Start with just the coordinator, add teams yourself",
    Icon: ({ size = 16 }) => (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
];

// ─── Shared input style helper ────────────────────────────────────────────────

const inputClass = "glass-input px-3 py-2.5 text-[14px] w-full";

// ─── Component ────────────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();

  // Step: 1=welcome, 2=api-keys, 3=account, 4=starter, 5=done
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 2 — API keys
  const [selectedProviders, setSelectedProviders] = useState<Set<Provider>>(new Set(["openai"]));
  const [openaiKey, setOpenaiKey]         = useState("");
  const [anthropicKey, setAnthropicKey]   = useState("");
  const [showOpenai, setShowOpenai]       = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);

  // Step 3 — Account
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPass, setShowPass] = useState(false);

  // Step 4 — Starter
  const [starterPack, setStarterPack] = useState<StarterPack>("personal");

  function toggleProvider(id: Provider) {
    setSelectedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev; // must keep at least one
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleCreateAccount() {
    setError(null);
    if (!email.trim())         { setError("Email is required."); return; }
    if (!password)             { setError("Password is required."); return; }
    if (password.length < 8)   { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm)  { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/setup/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Account creation failed");

      // Auto sign-in after creating the account
      const result = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (result?.error) throw new Error("Sign-in failed after account creation");

      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKeys: {
            openai:    selectedProviders.has("openai")    ? openaiKey.trim()    : undefined,
            anthropic: selectedProviders.has("anthropic") ? anthropicKey.trim() : undefined,
          },
          starterPack,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Setup failed");

      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Rust accent colour used for selected states on this onboarding screen
  const RUST = "var(--color-brand)";
  const RUST_DIM = "var(--color-brand-dim)";
  const RUST_BORDER = "var(--color-brand-muted)";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "var(--color-background)" }}
    >
      <div className="w-full max-w-[480px]">

        {/* Logo + title */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <LogoMark size={40} />
          <div className="text-center">
            <h1 className="text-[18px] font-semibold tracking-tight" style={{ color: "var(--color-text)", letterSpacing: "-0.02em" }}>
              AgentPlayground
            </h1>
          </div>
        </div>

        {/* Step progress (steps 2–4) */}
        {step >= 2 && step <= 4 && (
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {[2, 3, 4].map((s) => (
              <div
                key={s}
                style={{
                  width: s === step ? "20px" : "6px",
                  height: "6px",
                  borderRadius: "3px",
                  background: s <= step ? RUST : "var(--color-border)",
                  transition: "all 0.25s ease",
                }}
              />
            ))}
          </div>
        )}

        <div className="glass-card p-6 flex flex-col gap-5">

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg" style={{ background: "var(--color-red-dim)", border: "1px solid rgba(224,107,107,0.2)" }}>
              <AlertCircle size={13} style={{ color: "var(--color-red)", flexShrink: 0 }} />
              <p className="text-[12px]" style={{ color: "var(--color-red)" }}>{error}</p>
            </div>
          )}

          {/* ── Step 1: Welcome ── */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <h2 className="text-[17px] font-semibold" style={{ color: "var(--color-text)" }}>
                  Welcome to AgentPlayground
                </h2>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  Your personal AI agent platform. Set up takes about 2 minutes.
                </p>
              </div>
              <div className="flex flex-col gap-3 py-1">
                {[
                  { Icon: Bot,    text: "Coordinate AI agents across teams" },
                  { Icon: Cpu,    text: "Use your own API keys — BYOK" },
                  { Icon: Layers, text: "Local-first: your data stays on your machine" },
                ].map(({ Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0" style={{ background: RUST_DIM, border: `1px solid ${RUST_BORDER}` }}>
                      <Icon size={13} style={{ color: RUST }} />
                    </div>
                    <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>{text}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setError(null); setStep(2); }}
                className="btn-primary flex items-center justify-center gap-2 py-2.5"
                style={{ fontSize: "14px" }}
              >
                Get Started <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* ── Step 2: API Keys ── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-semibold mb-1" style={{ color: "var(--color-text)" }}>Connect your AI provider</h2>
                <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                  AgentPlayground works with Anthropic Claude, OpenAI, or free local models via Ollama. Select all that apply.
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                {PROVIDERS.map(({ id, name: pName, label, description, keyPlaceholder, link }) => {
                  const selected = selectedProviders.has(id);
                  return (
                    <div
                      key={id}
                      onClick={() => toggleProvider(id)}
                      className="flex flex-col gap-3 p-3.5 rounded-lg cursor-pointer transition-all"
                      style={{
                        background: selected ? RUST_DIM : "var(--color-surface-2)",
                        border: `1px solid ${selected ? RUST_BORDER : "var(--color-border)"}`,
                      }}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center"
                          style={{
                            borderColor: selected ? RUST : "var(--color-border)",
                            background:  selected ? RUST : "transparent",
                          }}
                        >
                          {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>{pName}</span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "var(--color-surface-3)", color: "var(--color-muted)" }}>{label}</span>
                          </div>
                          <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>{description}</p>
                        </div>
                      </div>

                      {/* Key input — only for openai/anthropic when selected */}
                      {selected && keyPlaceholder && (
                        <div
                          className="flex flex-col gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="relative">
                            <input
                              type={id === "openai" ? (showOpenai ? "text" : "password") : (showAnthropic ? "text" : "password")}
                              placeholder={keyPlaceholder}
                              value={id === "openai" ? openaiKey : anthropicKey}
                              onChange={(e) => id === "openai" ? setOpenaiKey(e.target.value) : setAnthropicKey(e.target.value)}
                              className={inputClass}
                              style={{ color: "var(--color-text)", paddingRight: "36px" }}
                            />
                            <button
                              type="button"
                              onClick={() => id === "openai" ? setShowOpenai((v) => !v) : setShowAnthropic((v) => !v)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2"
                              style={{ color: "var(--color-muted)" }}
                            >
                              {(id === "openai" ? showOpenai : showAnthropic)
                                ? <EyeOff size={13} />
                                : <Eye size={13} />}
                            </button>
                          </div>
                          {link && (
                            <Link
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px]"
                              style={{ color: "var(--color-brand)" }}
                            >
                              {link.label}
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                Keys are stored locally on your machine, never sent externally. You can update them anytime in Settings.
              </p>

              <div className="flex gap-2">
                <button onClick={() => { setError(null); setStep(1); }} className="btn-secondary flex items-center gap-1.5 py-2.5 flex-1 justify-center">
                  <ChevronLeft size={14} /> Back
                </button>
                <button
                  onClick={() => {
                    const needsKey = [...selectedProviders].some((p) => p !== "ollama");
                    const hasKey =
                      (!selectedProviders.has("openai")    || openaiKey.trim()) &&
                      (!selectedProviders.has("anthropic") || anthropicKey.trim());
                    if (needsKey && !hasKey) {
                      setError("Please enter an API key for each selected provider, or select Ollama only.");
                      return;
                    }
                    setError(null);
                    setStep(3);
                  }}
                  className="btn-primary flex items-center gap-2 py-2.5 flex-1 justify-center"
                >
                  Continue <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Create Account ── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-semibold mb-1" style={{ color: "var(--color-text)" }}>Create your account</h2>
                <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                  This is your local owner account — stored only on your machine.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-muted)", letterSpacing: "0.06em" }}>
                    Name <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    className={inputClass}
                    style={{ color: "var(--color-text)" }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-muted)", letterSpacing: "0.06em" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    autoComplete="email"
                    className={inputClass}
                    style={{ color: "var(--color-text)" }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-muted)", letterSpacing: "0.06em" }}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      autoComplete="new-password"
                      className={inputClass}
                      style={{ color: "var(--color-text)", paddingRight: "36px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-muted)", letterSpacing: "0.06em" }}>
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    required
                    autoComplete="new-password"
                    className={inputClass}
                    style={{ color: "var(--color-text)" }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setError(null); setStep(2); }} className="btn-secondary flex items-center gap-1.5 py-2.5 flex-1 justify-center">
                  <ChevronLeft size={14} /> Back
                </button>
                <button
                  onClick={handleCreateAccount}
                  disabled={loading || !email || !password || !confirm}
                  className="btn-primary flex items-center justify-center gap-2 py-2.5 flex-1"
                >
                  {loading && <Loader2 size={13} className="animate-spin" />}
                  {loading ? "Creating…" : <>Continue <ChevronRight size={14} /></>}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Choose Starter ── */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-semibold mb-1" style={{ color: "var(--color-text)" }}>What will you use AgentPlayground for?</h2>
                <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
                  We&apos;ll seed the right agent teams to get you started. You can add or remove teams later.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {STARTERS.map(({ id, name: sName, description, Icon }) => {
                  const selected = starterPack === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setStarterPack(id)}
                      className="flex items-start gap-3 p-3.5 rounded-lg text-left transition-all"
                      style={{
                        background: selected ? RUST_DIM : "var(--color-surface-2)",
                        border: `1px solid ${selected ? RUST_BORDER : "var(--color-border)"}`,
                      }}
                    >
                      <div
                        className="flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0 mt-0.5"
                        style={{
                          background:  selected ? RUST_DIM : "var(--color-surface-3)",
                          border:      `1px solid ${selected ? RUST_BORDER : "var(--color-border)"}`,
                          color:       selected ? RUST : "var(--color-muted)",
                        }}
                      >
                        <Icon size={14} />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>{sName}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>{description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setError(null); setStep(3); }} className="btn-secondary flex items-center gap-1.5 py-2.5 flex-1 justify-center">
                  <ChevronLeft size={14} /> Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="btn-primary flex items-center justify-center gap-2 py-2.5 flex-1"
                >
                  {loading && <Loader2 size={13} className="animate-spin" />}
                  {loading ? "Setting up…" : <>Finish Setup <ChevronRight size={14} /></>}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 5: Done ── */}
          {step === 5 && (
            <div className="flex flex-col items-center gap-5 py-2">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full"
                style={{ background: "rgba(107,203,139,0.15)", border: "1px solid rgba(107,203,139,0.3)" }}
              >
                <CheckCircle2 size={22} style={{ color: "var(--color-green)" }} />
              </div>

              <div className="text-center flex flex-col gap-1.5">
                <h2 className="font-semibold text-[16px]" style={{ color: "var(--color-text)" }}>
                  You&apos;re all set!
                </h2>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  Your admin account is ready. Agent teams are being seeded in the background — they&apos;ll appear in Teams within a few seconds.
                </p>
              </div>

              {/* Setup summary */}
              <div className="w-full flex flex-col gap-1.5 py-1">
                {[
                  { label: "Account", value: email },
                  { label: "Providers", value: [...selectedProviders].map((p) => ({ openai: "OpenAI", anthropic: "Anthropic", ollama: "Ollama" }[p])).join(", ") },
                  { label: "Starter", value: STARTERS.find((s) => s.id === starterPack)?.name ?? starterPack },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-1.5 px-3 rounded-md" style={{ background: "var(--color-surface-2)" }}>
                    <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>{label}</span>
                    <span className="text-[12px] font-medium" style={{ color: "var(--color-text)" }}>{value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => router.push("/chat")}
                className="btn-primary flex items-center justify-center gap-2 py-2.5 w-full"
                style={{ fontSize: "14px" }}
              >
                Open AgentPlayground <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
