"use client";

import { useState } from "react";
import { BookOpen, Loader2, CheckCircle2, AlertCircle, RefreshCw, Moon, ChevronDown, ChevronUp } from "lucide-react";

type IndexResult = {
  path: string;
  status: "indexed" | "skipped" | "error";
  docId?: string;
  error?: string;
};

type IndexResponse = {
  indexed: number;
  skipped: number;
  errors: number;
  results: IndexResult[];
  message: string;
};

type OvernightTask = { id: string; title: string; group: string; outputDoc: string };
type OvernightResponse = { message: string; tasks: OvernightTask[] };

export default function AdminSystemPage() {
  const [indexing, setIndexing]       = useState(false);
  const [indexResult, setIndexResult] = useState<IndexResponse | null>(null);
  const [indexError, setIndexError]   = useState<string | null>(null);

  const [overnight, setOvernight]       = useState(false);
  const [overnightResult, setOvernightResult] = useState<OvernightResponse | null>(null);
  const [overnightError, setOvernightError]   = useState<string | null>(null);
  const [overnightGroups, setOvernightGroups] = useState<{ dev: boolean; business: boolean }>({ dev: true, business: true });
  const [showOvernightDetail, setShowOvernightDetail] = useState(false);

  async function handleIndexDocs() {
    setIndexing(true);
    setIndexResult(null);
    setIndexError(null);
    try {
      const res = await fetch("/api/admin/index-docs", { method: "POST" });
      const data = await res.json() as IndexResponse;
      if (!res.ok) throw new Error((data as unknown as { error?: string }).error ?? "Index failed");
      setIndexResult(data);
    } catch (err) {
      setIndexError(err instanceof Error ? err.message : "Failed to index docs");
    } finally {
      setIndexing(false);
    }
  }

  async function handleOvernight() {
    setOvernight(true);
    setOvernightResult(null);
    setOvernightError(null);
    const groups = Object.entries(overnightGroups).filter(([, v]) => v).map(([k]) => k);
    try {
      const res = await fetch("/api/admin/overnight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups }),
      });
      const data = await res.json() as OvernightResponse;
      if (!res.ok) throw new Error((data as unknown as { error?: string }).error ?? "Failed to queue");
      setOvernightResult(data);
    } catch (err) {
      setOvernightError(err instanceof Error ? err.message : "Failed to start overnight tasks");
    } finally {
      setOvernight(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-lg font-semibold mb-1" style={{ color: "var(--color-text)" }}>System</h1>
      <p className="text-[13px] mb-6" style={{ color: "var(--color-muted)" }}>
        Platform maintenance and knowledge base management.
      </p>

      {/* Knowledge Base Indexing */}
      <div className="glass-card p-5 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <BookOpen size={18} style={{ color: "var(--color-accent)", marginTop: 2 }} />
          <div>
            <p className="font-medium text-sm" style={{ color: "var(--color-text)" }}>Index Documentation into Brain</p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
              Indexes CLAUDE.md, HANDOFF.md, docs/PLAN.md, docs/PROTOCOLS.md, docs/architecture.md, and all session reports
              into the Brain knowledge base. Run after adding new docs or updating existing ones. Safe to re-run (deduplicates automatically).
            </p>
          </div>
        </div>

        <button
          onClick={handleIndexDocs}
          disabled={indexing}
          className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
        >
          {indexing
            ? <><Loader2 size={14} className="animate-spin" /> Indexing…</>
            : <><RefreshCw size={14} /> Index Docs Now</>
          }
        </button>

        {indexResult && (
          <div className="mt-4 p-3 rounded-lg" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={14} style={{ color: "var(--color-green)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{indexResult.message}</p>
            </div>
            <div className="flex flex-col gap-1">
              {indexResult.results.map((r) => (
                <div key={r.path} className="flex items-center gap-2 text-[12px]" style={{ color: "var(--color-muted)" }}>
                  <span style={{ color: r.status === "indexed" ? "var(--color-green)" : r.status === "error" ? "var(--color-red)" : "var(--color-muted)" }}>
                    {r.status === "indexed" ? "✓" : r.status === "error" ? "✗" : "—"}
                  </span>
                  <span>{r.path}</span>
                  {r.error && <span style={{ color: "var(--color-red)" }}>({r.error})</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {indexError && (
          <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: "var(--color-red)" }}>
            <AlertCircle size={14} />
            {indexError}
          </div>
        )}
      </div>

      {/* Overnight Knowledge Build */}
      <div className="glass-card p-5 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <Moon size={18} style={{ color: "var(--color-accent)", marginTop: 2 }} />
          <div>
            <p className="font-medium text-sm" style={{ color: "var(--color-text)" }}>Overnight Knowledge Build</p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>
              Uses local Ollama (qwen2.5:7b) to analyze codebase + write business docs, then stores results in Brain.
              Runs in background — safe to trigger and leave. Check activity logs for progress.
            </p>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          {(["dev", "business"] as const).map((g) => (
            <label key={g} className="flex items-center gap-2 cursor-pointer text-[13px]" style={{ color: "var(--color-text)" }}>
              <input
                type="checkbox"
                checked={overnightGroups[g]}
                onChange={(e) => setOvernightGroups((prev) => ({ ...prev, [g]: e.target.checked }))}
                className="accent-[var(--color-accent)]"
              />
              {g === "dev" ? "Dev Docs (3 tasks)" : "Business Docs (2 tasks)"}
            </label>
          ))}
        </div>

        <button
          onClick={handleOvernight}
          disabled={overnight || (!overnightGroups.dev && !overnightGroups.business)}
          className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
        >
          {overnight
            ? <><Loader2 size={14} className="animate-spin" /> Queuing…</>
            : <><Moon size={14} /> Run Overnight Tasks</>
          }
        </button>

        {overnightResult && (
          <div className="mt-4 p-3 rounded-lg" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} style={{ color: "var(--color-green)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{overnightResult.message}</p>
              </div>
              <button onClick={() => setShowOvernightDetail((p) => !p)} className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                {showOvernightDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
            {showOvernightDetail && (
              <div className="flex flex-col gap-1 mt-2">
                {overnightResult.tasks.map((t) => (
                  <div key={t.id} className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                    <span style={{ color: "var(--color-accent)" }}>[{t.group}]</span> {t.title} → {t.outputDoc}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {overnightError && (
          <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: "var(--color-red)" }}>
            <AlertCircle size={14} />
            {overnightError}
          </div>
        )}
      </div>

      <div className="glass-card p-5">
        <p className="font-medium text-sm mb-1" style={{ color: "var(--color-text)" }}>More system tools</p>
        <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>
          DB size, SSE connections, error logs, and Ollama model status — coming in next session.
        </p>
      </div>
    </div>
  );
}
