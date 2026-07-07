"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutGrid, Loader2, Plus, ArrowRight, Network } from "lucide-react";
import { useRouter } from "next/navigation";
import { TaskRouter } from "@/components/TaskRouter";

type PlaygroundItem = { id: string; name: string; icon: string | null; color: string | null; teamIds: string[] };

// Playgrounds view — the playgrounds and nothing else (VISION §2.1)
export default function PlaygroundsPage() {
  const router = useRouter();
  const [playgrounds, setPlaygrounds] = useState<PlaygroundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTaskRouter, setShowTaskRouter] = useState(false);

  useEffect(() => {
    fetch("/api/playgrounds")
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => { if (Array.isArray(data)) setPlaygrounds(data as PlaygroundItem[]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function createPlayground() {
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/playgrounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const pg = await res.json() as PlaygroundItem;
        router.push(`/playground/${pg.id}`);
        return;
      }
    } catch {}
    setSaving(false);
  }

  return (
    <div style={{ minHeight: "100%", padding: "48px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--color-text)", letterSpacing: "-0.02em", margin: "0 0 4px" }}>
              Playgrounds
            </h1>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 28px" }}>
              Your agent environments. Open one to work inside it.
            </p>
          </div>
          <button
            onClick={() => setShowTaskRouter(true)}
            style={{
              display: "flex", alignItems: "center", gap: 7, flexShrink: 0,
              padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border)",
              background: "transparent", color: "var(--color-text-secondary)",
              cursor: "pointer", fontSize: 13,
            }}
          >
            <Network size={13} style={{ color: "var(--color-brand)" }} />
            Quick task
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <Loader2 size={18} className="animate-spin" style={{ color: "var(--color-muted)" }} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {playgrounds.map(pg => (
              <Link
                key={pg.id}
                href={`/playground/${pg.id}`}
                className="glass-card-interactive"
                style={{ padding: "18px 16px", textDecoration: "none", display: "flex", flexDirection: "column", gap: 10 }}
              >
                <LayoutGrid size={16} style={{ color: "var(--color-brand)", opacity: 0.85 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text)" }}>{pg.name}</div>
                  <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>
                    {pg.teamIds?.length ?? 0} team{(pg.teamIds?.length ?? 0) !== 1 ? "s" : ""}
                  </div>
                </div>
              </Link>
            ))}

            {/* New playground */}
            {creating ? (
              <div className="glass-card" style={{ padding: "18px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") createPlayground();
                    if (e.key === "Escape") { setCreating(false); setNewName(""); }
                  }}
                  placeholder="Playground name"
                  disabled={saving}
                  style={{
                    background: "var(--color-surface-3)", border: "1px solid var(--color-border)",
                    borderRadius: 8, padding: "7px 10px", fontSize: 13,
                    color: "var(--color-text)", outline: "none",
                  }}
                />
                <button
                  onClick={createPlayground}
                  disabled={!newName.trim() || saving}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "7px 12px", borderRadius: 8, border: "none",
                    background: newName.trim() && !saving ? "var(--color-brand)" : "var(--color-surface-3)",
                    color: newName.trim() && !saving ? "#0a1628" : "var(--color-muted)",
                    cursor: newName.trim() && !saving ? "pointer" : "not-allowed",
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                  Create
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="glass-card-interactive"
                style={{
                  padding: "18px 16px", display: "flex", flexDirection: "column",
                  alignItems: "flex-start", gap: 10, background: "transparent",
                }}
              >
                <Plus size={16} style={{ color: "var(--color-muted)" }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)" }}>
                  New playground
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      <TaskRouter open={showTaskRouter} onClose={() => setShowTaskRouter(false)} />
    </div>
  );
}
