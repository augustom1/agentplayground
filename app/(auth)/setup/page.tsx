"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bot, Loader2, AlertCircle, CheckCircle2,
  User, Target, Users, Settings, ChevronRight, ChevronLeft,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type UseCase = "personal_os" | "business_platform" | "client_hosting" | "ai_lab";
type DataRetention = "full" | "results_only" | "minimal";
type LlmPreference = "ollama" | "claude" | "mixed";

interface TeamOption {
  id: string;
  name: string;
  description: string;
  defaultFor: UseCase[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const USE_CASES: Array<{ id: UseCase; label: string; description: string }> = [
  { id: "personal_os", label: "Personal AI OS", description: "Manage your schedule, career, finances, and learning. Agents that work for you." },
  { id: "business_platform", label: "Business Platform", description: "Run projects, delegate client work, automate operations. Coordinator as your ops hub." },
  { id: "client_hosting", label: "Client Hosting", description: "Host agent teams for multiple clients. Each client gets their own workspace." },
  { id: "ai_lab", label: "AI Research Lab", description: "Experiment with agent architectures, test LLMs, build and deploy apps." },
];

const TEAM_OPTIONS: TeamOption[] = [
  { id: "command_center",   name: "Command Center",         description: "Master coordinator that routes across all teams.", defaultFor: ["personal_os", "business_platform", "client_hosting", "ai_lab"] },
  { id: "dev_core",         name: "Dev Core",               description: "Full-stack development: Next.js, API routes, Prisma, TypeScript.", defaultFor: ["ai_lab", "client_hosting"] },
  { id: "devops",           name: "DevOps & Infrastructure", description: "Docker, VPS deployment, Nginx, server sizing.", defaultFor: ["ai_lab", "client_hosting"] },
  { id: "product_design",   name: "Product & Design",       description: "UX, specs, QA, roadmap management.", defaultFor: ["business_platform", "ai_lab"] },
  { id: "business_growth",  name: "Business & Growth",      description: "Proposals, pricing, client success, marketing.", defaultFor: ["business_platform", "client_hosting"] },
  { id: "cv_advisory",      name: "CV Advisory",            description: "CV writing, interview prep, job application assistance.", defaultFor: ["personal_os"] },
  { id: "education",        name: "Education & Learning",   description: "Research, quiz generation, study tracking.", defaultFor: ["personal_os", "ai_lab"] },
  { id: "financial",        name: "Financial Planner",      description: "Expense tracking, spending summaries, financial reports.", defaultFor: ["personal_os", "business_platform"] },
  { id: "job_search",       name: "Job Search",             description: "Job scouting, cover letters, application tracking.", defaultFor: ["personal_os"] },
  { id: "fitness",          name: "Fitness & Health",       description: "Workout plans, progress tracking, health goals.", defaultFor: ["personal_os"] },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();

  // Wizard state
  const [step, setStep]                   = useState(0); // 0=account, 1=use-case, 2=teams, 3=prefs
  const [checking, setChecking]           = useState(true);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [done, setDone]                   = useState(false);

  // Step 0 — account
  const [name, setName]                   = useState("");
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [confirm, setConfirm]             = useState("");

  // Step 1 — use case
  const [useCase, setUseCase]             = useState<UseCase>("personal_os");

  // Step 2 — teams
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  // Step 3 — preferences
  const [dataRetention, setDataRetention] = useState<DataRetention>("full");
  const [llmPref, setLlmPref]             = useState<LlmPreference>("mixed");

  // Pre-select defaults when use case changes
  useEffect(() => {
    const defaults = TEAM_OPTIONS.filter((t) => t.defaultFor.includes(useCase)).map((t) => t.id);
    setSelectedTeams(defaults);
  }, [useCase]);

  useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then((data) => {
        if (!data.needsSetup) router.replace("/login");
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  function toggleTeam(id: string) {
    setSelectedTeams((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  async function handleFinish() {
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }
    if (!email)               { setError("Email is required."); return; }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, useCase, selectedTeams, dataRetention, llmPref }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Setup failed");
      setDone(true);
      setTimeout(() => router.push("/login"), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-background)" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-text-secondary)" }} />
      </div>
    );
  }

  const steps = [
    { icon: User,     label: "Account" },
    { icon: Target,   label: "Mission" },
    { icon: Users,    label: "Teams" },
    { icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "var(--color-background)" }}>
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center mb-3" style={{
            background: "linear-gradient(135deg, var(--color-accent), var(--color-text-secondary))",
            borderRadius: "16px", width: "52px", height: "52px",
          }}>
            <Bot size={24} color="white" />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
            Welcome to Agent Playground
          </h1>
          <p className="text-sm mt-1 text-center" style={{ color: "var(--color-muted)", maxWidth: "320px" }}>
            Let&apos;s set up your AI operations platform. This screen appears only once.
          </p>
        </div>

        {done ? (
          <div className="glass-card p-8 flex flex-col items-center gap-4 animate-fade-in" style={{ borderColor: "rgba(52,211,153,0.3)" }}>
            <CheckCircle2 size={36} style={{ color: "var(--color-green)" }} />
            <p className="font-semibold text-lg" style={{ color: "var(--color-text)" }}>All set!</p>
            <p className="text-sm text-center" style={{ color: "var(--color-muted)" }}>
              Your admin account is ready, agent teams are being generated, and the Brain is warming up. Redirecting to login&hellip;
            </p>
          </div>
        ) : (
          <>
            {/* Step indicators */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const active = i === step;
                const done_step = i < step;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center justify-center rounded-full" style={{
                        width: "28px", height: "28px",
                        background: done_step ? "var(--color-green)" : active ? "var(--color-accent)" : "var(--color-surface)",
                        border: `1px solid ${done_step ? "var(--color-green)" : active ? "var(--color-accent)" : "var(--color-border)"}`,
                        transition: "all 0.2s",
                      }}>
                        {done_step
                          ? <CheckCircle2 size={14} color="white" />
                          : <Icon size={13} style={{ color: active ? "white" : "var(--color-muted)" }} />
                        }
                      </div>
                      <span className="text-[11px] hidden sm:block" style={{ color: active ? "var(--color-text)" : "var(--color-muted)" }}>
                        {s.label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div style={{ width: "20px", height: "1px", background: "var(--color-border)" }} />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="glass-card p-6">
              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-4" style={{ background: "var(--color-red-dim)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  <AlertCircle size={14} style={{ color: "var(--color-red)" }} />
                  <p className="text-[13px]" style={{ color: "var(--color-red)" }}>{error}</p>
                </div>
              )}

              {/* ── Step 0: Account ── */}
              {step === 0 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="font-semibold mb-1" style={{ color: "var(--color-text)" }}>Create your admin account</h2>
                    <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>You&apos;ll be the only admin. Other users can be added after setup.</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>Name <span style={{ fontWeight: 400 }}>(optional)</span></label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="glass-input px-3 py-2.5 text-sm w-full" style={{ color: "var(--color-text)" }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@company.com" required autoFocus className="glass-input px-3 py-2.5 text-sm w-full" style={{ color: "var(--color-text)" }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required className="glass-input px-3 py-2.5 text-sm w-full" style={{ color: "var(--color-text)" }} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium" style={{ color: "var(--color-muted)" }}>Confirm password</label>
                    <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" required className="glass-input px-3 py-2.5 text-sm w-full" style={{ color: "var(--color-text)" }} />
                  </div>
                  <button
                    onClick={() => {
                      if (!email) { setError("Email is required."); return; }
                      if (password !== confirm) { setError("Passwords do not match."); return; }
                      if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
                      setError(null);
                      setStep(1);
                    }}
                    disabled={!email || !password || !confirm}
                    className="btn-primary flex items-center justify-center gap-2 py-2.5 mt-1"
                  >
                    Continue <ChevronRight size={15} />
                  </button>
                </div>
              )}

              {/* ── Step 1: Use case ── */}
              {step === 1 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="font-semibold mb-1" style={{ color: "var(--color-text)" }}>What are you building?</h2>
                    <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>This sets the default agent team configuration. You can change everything later.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {USE_CASES.map((uc) => (
                      <button
                        key={uc.id}
                        onClick={() => setUseCase(uc.id)}
                        className="text-left p-3 rounded-lg transition-all"
                        style={{
                          background: useCase === uc.id ? "var(--color-accent-dim)" : "var(--color-surface)",
                          border: `1px solid ${useCase === uc.id ? "var(--color-accent)" : "var(--color-border)"}`,
                        }}
                      >
                        <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{uc.label}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>{uc.description}</p>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setStep(0)} className="btn-secondary flex items-center gap-1.5 py-2.5 flex-1 justify-center">
                      <ChevronLeft size={15} /> Back
                    </button>
                    <button onClick={() => setStep(2)} className="btn-primary flex items-center gap-2 py-2.5 flex-1 justify-center">
                      Continue <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Teams ── */}
              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="font-semibold mb-1" style={{ color: "var(--color-text)" }}>Select your agent teams</h2>
                    <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>Pre-selected based on your mission. You can add more teams any time.</p>
                  </div>
                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                    {TEAM_OPTIONS.map((team) => {
                      const selected = selectedTeams.includes(team.id);
                      const isRequired = team.id === "command_center";
                      return (
                        <button
                          key={team.id}
                          onClick={() => !isRequired && toggleTeam(team.id)}
                          disabled={isRequired}
                          className="text-left p-3 rounded-lg transition-all"
                          style={{
                            background: selected ? "var(--color-accent-dim)" : "var(--color-surface)",
                            border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
                            cursor: isRequired ? "default" : "pointer",
                            opacity: isRequired ? 0.8 : 1,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{team.name}</p>
                            {isRequired && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--color-surface-2)", color: "var(--color-muted)" }}>required</span>}
                          </div>
                          <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>{team.description}</p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>{selectedTeams.length} team(s) selected</p>
                  <div className="flex gap-2">
                    <button onClick={() => setStep(1)} className="btn-secondary flex items-center gap-1.5 py-2.5 flex-1 justify-center">
                      <ChevronLeft size={15} /> Back
                    </button>
                    <button onClick={() => setStep(3)} className="btn-primary flex items-center gap-2 py-2.5 flex-1 justify-center">
                      Continue <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Preferences ── */}
              {step === 3 && (
                <div className="flex flex-col gap-5">
                  <div>
                    <h2 className="font-semibold mb-1" style={{ color: "var(--color-text)" }}>Preferences</h2>
                    <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>How should the platform handle data and AI calls?</p>
                  </div>

                  {/* Data retention */}
                  <div>
                    <p className="text-[12px] font-medium mb-2" style={{ color: "var(--color-muted)" }}>Data retention</p>
                    <div className="flex flex-col gap-1.5">
                      {([
                        { id: "full",         label: "Full logs",     desc: "Save everything: research, task results, sessions. Best context for agents." },
                        { id: "results_only", label: "Results only",  desc: "Keep final outputs, skip raw research and intermediate steps. Saves space." },
                        { id: "minimal",      label: "Minimal",       desc: "Session reports and plan results only. Lean footprint for small servers." },
                      ] as Array<{ id: DataRetention; label: string; desc: string }>).map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setDataRetention(opt.id)}
                          className="text-left p-2.5 rounded-lg transition-all"
                          style={{
                            background: dataRetention === opt.id ? "var(--color-accent-dim)" : "var(--color-surface)",
                            border: `1px solid ${dataRetention === opt.id ? "var(--color-accent)" : "var(--color-border)"}`,
                          }}
                        >
                          <p className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>{opt.label}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* LLM preference */}
                  <div>
                    <p className="text-[12px] font-medium mb-2" style={{ color: "var(--color-muted)" }}>AI model preference</p>
                    <div className="flex flex-col gap-1.5">
                      {([
                        { id: "ollama", label: "Prefer Ollama (local)",   desc: "Free, private, runs on your server. Best for routine tasks. Needs GPU for speed." },
                        { id: "claude", label: "Prefer Claude API",        desc: "Best quality, uses Anthropic credits. Ideal for complex reasoning." },
                        { id: "mixed",  label: "Mixed (recommended)",       desc: "Ollama for routine tasks, Claude for complex ones. Optimal cost/quality." },
                      ] as Array<{ id: LlmPreference; label: string; desc: string }>).map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setLlmPref(opt.id)}
                          className="text-left p-2.5 rounded-lg transition-all"
                          style={{
                            background: llmPref === opt.id ? "var(--color-accent-dim)" : "var(--color-surface)",
                            border: `1px solid ${llmPref === opt.id ? "var(--color-accent)" : "var(--color-border)"}`,
                          }}
                        >
                          <p className="text-[13px] font-medium" style={{ color: "var(--color-text)" }}>{opt.label}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setStep(2)} className="btn-secondary flex items-center gap-1.5 py-2.5 flex-1 justify-center">
                      <ChevronLeft size={15} /> Back
                    </button>
                    <button
                      onClick={handleFinish}
                      disabled={loading}
                      className="btn-primary flex items-center justify-center gap-2 py-2.5 flex-1"
                    >
                      {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                      {loading ? "Setting up…" : "Launch"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
