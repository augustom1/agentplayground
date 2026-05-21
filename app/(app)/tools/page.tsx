"use client";

import { useState, useEffect } from "react";
import {
  Wrench,
  Terminal,
  Lightbulb,
  CheckCircle2,
  Clock,
  TrendingUp,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Zap,
  BookOpen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Skill = {
  id: string;
  name: string;
  description: string;
  category: string;
  instructions: string | null;
  team: { id: string; name: string } | null;
  createdAt: string;
};

type CliFunction = {
  id: string;
  name: string;
  command: string;
  description: string | null;
  dangerous: boolean;
  team: { id: string; name: string } | null;
  createdAt: string;
};

type Improvement = {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: string;
  source: string | null;
  applied: boolean;
  createdAt: string;
};

type ToolsData = {
  skills: Skill[];
  skillsByCategory: Record<string, Skill[]>;
  cliFunctions: CliFunction[];
  improvements: Improvement[];
  stats: {
    totalSkills: number;
    totalCliFunctions: number;
    totalImprovements: number;
    appliedImprovements: number;
    highImpact: number;
  };
};

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  general: "var(--color-text-secondary)",
  data: "#60a5fa",
  communication: "#34d399",
  code: "var(--color-brand)",
  research: "#fb923c",
  system: "#f87171",
};

const IMPACT_COLORS: Record<string, string> = {
  low: "var(--color-muted)",
  medium: "var(--color-yellow)",
  high: "var(--color-green)",
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  icon: Icon,
  accent,
}: {
  value: number;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  accent?: string;
}) {
  return (
    <div
      className="glass-card p-4 flex items-center gap-3"
      style={{ borderLeft: accent ? `3px solid ${accent}` : undefined }}
    >
      <div
        className="flex items-center justify-center w-9 h-9 shrink-0"
        style={{ background: "var(--color-surface-3)", borderRadius: "10px" }}
      >
        <Icon size={16} style={{ color: accent || "var(--color-text-secondary)" }} />
      </div>
      <div>
        <p className="text-xl font-bold font-mono" style={{ color: "var(--color-text)" }}>
          {value}
        </p>
        <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] || "var(--color-text-secondary)";
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider"
      style={{ background: `${color}18`, color }}
    >
      {category}
    </span>
  );
}

function ImpactBadge({ impact }: { impact: string }) {
  const color = IMPACT_COLORS[impact] || "var(--color-muted)";
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider"
      style={{ background: `${color}18`, color }}
    >
      {impact} impact
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ToolsPage() {
  const [data, setData] = useState<ToolsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<"skills" | "cli" | "improvements">("skills");
  const [applyingId, setApplyingId] = useState<string | null>(null);

  async function applyImprovement(id: string, currentlyApplied: boolean) {
    setApplyingId(id);
    try {
      await fetch(`/api/improvements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applied: !currentlyApplied }),
      });
      // Optimistic update
      if (data) {
        setData({
          ...data,
          improvements: data.improvements.map((imp) =>
            imp.id === id ? { ...imp, applied: !currentlyApplied } : imp
          ),
          stats: {
            ...data.stats,
            appliedImprovements: currentlyApplied
              ? data.stats.appliedImprovements - 1
              : data.stats.appliedImprovements + 1,
          },
        });
      }
    } catch {
      // Silently fail — data will refresh on next load
    } finally {
      setApplyingId(null);
    }
  }

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/tools");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const tabs = [
    { key: "skills" as const, label: "Skills", icon: BookOpen, count: data?.stats.totalSkills },
    { key: "cli" as const, label: "CLI Functions", icon: Terminal, count: data?.stats.totalCliFunctions },
    { key: "improvements" as const, label: "Improvements", icon: Lightbulb, count: data?.stats.totalImprovements },
  ];

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 max-w-5xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            Tools Catalog
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            Internal tools, skills, and optimizations — the flywheel&apos;s output
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn-ghost flex items-center gap-1.5 px-3 py-1.5"
          style={{ fontSize: "12px" }}
        >
          {loading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: "var(--color-red-dim)", border: "1px solid rgba(248,113,113,0.2)" }}
        >
          <AlertCircle size={14} style={{ color: "var(--color-red)" }} />
          <p className="text-sm" style={{ color: "var(--color-red)" }}>
            Failed to load tools catalog. Make sure the database is connected.
          </p>
          <button onClick={load} className="btn-ghost px-2 py-1 ml-auto text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            value={data.stats.totalSkills}
            label="Skills"
            icon={BookOpen}
            accent="var(--color-brand)"
          />
          <StatCard
            value={data.stats.totalCliFunctions}
            label="CLI Functions"
            icon={Terminal}
            accent="#60a5fa"
          />
          <StatCard
            value={data.stats.appliedImprovements}
            label="Applied"
            icon={CheckCircle2}
            accent="var(--color-green)"
          />
          <StatCard
            value={data.stats.highImpact}
            label="High Impact Pending"
            icon={TrendingUp}
            accent="var(--color-yellow)"
          />
        </div>
      )}

      {/* Flywheel info */}
      {data && data.stats.totalSkills === 0 && data.stats.totalCliFunctions === 0 && (
        <div
          className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
          style={{ background: "var(--color-surface-2)", border: "1px dashed var(--color-border)" }}
        >
          <Zap size={16} style={{ color: "var(--color-text-secondary)", marginTop: "2px", flexShrink: 0 }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              Your tool catalog is empty
            </p>
            <p className="text-[12px] mt-1" style={{ color: "var(--color-muted)" }}>
              The flywheel starts in <strong style={{ color: "var(--color-text)" }}>Chat</strong>. Ask the AI to create agent teams
              — as you solve problems, skills and CLI functions are registered here. Over time, repeated workflows
              become reusable tools, and the system starts optimizing itself.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
      >
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium"
            style={{
              background: activeTab === key ? "var(--color-surface-3)" : "transparent",
              color: activeTab === key ? "var(--color-text)" : "var(--color-muted)",
              border: activeTab === key ? "1px solid var(--color-border)" : "1px solid transparent",
            }}
          >
            <Icon size={13} />
            {label}
            {count !== undefined && (
              <span
                className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                style={{
                  background: activeTab === key ? "var(--color-surface-2)" : "var(--color-surface-3)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse" style={{ height: "80px" }} />
          ))}
        </div>
      )}

      {/* Skills Tab */}
      {!loading && data && activeTab === "skills" && (
        <div className="flex flex-col gap-5">
          {Object.keys(data.skillsByCategory).length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--color-muted)" }}>
              No skills registered yet — use Chat to create agent teams and register skills
            </p>
          ) : (
            Object.entries(data.skillsByCategory).map(([category, skills]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <CategoryBadge category={category} />
                  <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                    {skills.length} skill{skills.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="glass-card px-4 py-3 flex items-start gap-3"
                    >
                      <div
                        className="flex items-center justify-center w-7 h-7 shrink-0 mt-0.5"
                        style={{
                          background: `${CATEGORY_COLORS[skill.category] || "var(--color-text-secondary)"}15`,
                          borderRadius: "7px",
                        }}
                      >
                        <Wrench size={12} style={{ color: CATEGORY_COLORS[skill.category] || "var(--color-text-secondary)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                            {skill.name}
                          </span>
                          {skill.team && (
                            <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                              {skill.team.name}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                          {skill.description}
                        </p>
                        {skill.instructions && (
                          <p className="text-[11px] mt-1.5 line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>
                            {skill.instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CLI Functions Tab */}
      {!loading && data && activeTab === "cli" && (
        <div className="flex flex-col gap-2">
          {data.cliFunctions.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--color-muted)" }}>
              No CLI functions registered yet — use Chat to register commands
            </p>
          ) : (
            data.cliFunctions.map((fn) => (
              <div
                key={fn.id}
                className="glass-card px-4 py-3 flex items-start gap-3"
              >
                <div
                  className="flex items-center justify-center w-7 h-7 shrink-0 mt-0.5"
                  style={{
                    background: fn.dangerous ? "rgba(248,113,113,0.1)" : "rgba(96,165,250,0.1)",
                    borderRadius: "7px",
                  }}
                >
                  <Terminal
                    size={12}
                    style={{ color: fn.dangerous ? "var(--color-red)" : "#60a5fa" }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                      {fn.name}
                    </span>
                    {fn.dangerous && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: "rgba(248,113,113,0.1)", color: "var(--color-red)" }}
                      >
                        dangerous
                      </span>
                    )}
                    {fn.team && (
                      <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                        {fn.team.name}
                      </span>
                    )}
                  </div>
                  {fn.description && (
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                      {fn.description}
                    </p>
                  )}
                  <code
                    className="text-[11px] mt-1.5 block px-2 py-1 rounded"
                    style={{
                      background: "var(--color-surface-3)",
                      color: "var(--color-text-secondary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {fn.command}
                  </code>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Improvements Tab */}
      {!loading && data && activeTab === "improvements" && (
        <div className="flex flex-col gap-2">
          {data.improvements.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <Lightbulb size={28} style={{ color: "var(--color-text-secondary)", opacity: 0.4 }} />
              <p className="text-sm text-center" style={{ color: "var(--color-muted)" }}>
                No improvements logged yet
              </p>
              <p className="text-[12px] text-center max-w-sm" style={{ color: "var(--color-muted)" }}>
                When Claude detects repeated tasks or optimization opportunities, it will log them here.
                You can also ask Claude to &quot;log an improvement&quot; in Chat.
              </p>
            </div>
          ) : (
            data.improvements.map((imp) => (
              <div
                key={imp.id}
                className="glass-card px-4 py-3 flex items-start gap-3"
                style={{ opacity: imp.applied ? 0.65 : 1 }}
              >
                <div
                  className="flex items-center justify-center w-7 h-7 shrink-0 mt-0.5"
                  style={{
                    background: imp.applied ? "rgba(52,211,153,0.1)" : "rgba(251,191,36,0.1)",
                    borderRadius: "7px",
                  }}
                >
                  {imp.applied ? (
                    <CheckCircle2 size={12} style={{ color: "var(--color-green)" }} />
                  ) : (
                    <Clock size={12} style={{ color: "var(--color-yellow)" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                      {imp.title}
                    </span>
                    <ImpactBadge impact={imp.impact} />
                    <CategoryBadge category={imp.category} />
                    {imp.applied && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: "rgba(52,211,153,0.1)", color: "var(--color-green)" }}
                      >
                        applied
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                    {imp.description}
                  </p>
                  {imp.source && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <ChevronRight size={10} style={{ color: "var(--color-muted)" }} />
                      <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                        Source: {imp.source}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => applyImprovement(imp.id, imp.applied)}
                  disabled={applyingId === imp.id}
                  className="shrink-0 text-[10px] px-2 py-1 rounded-md font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{
                    background: imp.applied ? "rgba(248,113,113,0.1)" : "rgba(52,211,153,0.1)",
                    color: imp.applied ? "var(--color-red, #f87171)" : "var(--color-green)",
                    border: "1px solid",
                    borderColor: imp.applied ? "rgba(248,113,113,0.2)" : "rgba(52,211,153,0.2)",
                  }}
                >
                  {applyingId === imp.id ? "…" : imp.applied ? "Undo" : "Apply"}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
