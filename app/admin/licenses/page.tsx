"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Copy, CheckCircle2, Loader2 } from "lucide-react";

type License = {
  id: string;
  key: string;
  plan: string;
  userEmail: string;
  expiresAt: string | null;
  createdAt: string;
};

const PLAN_OPTIONS = ["community", "custom-build", "vps-hosted"] as const;

const PLAN_COLORS: Record<string, string> = {
  community: "var(--color-green)",
  "custom-build": "var(--color-brand)",
  "vps-hosted": "var(--color-yellow)",
};

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ plan: "community", userEmail: "", expiresAt: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch("/api/admin/licenses").then((r) => r.json()) as License[];
      setLicenses(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.userEmail.trim()) { setFormError("Email is required"); return; }
    setCreating(true);
    setFormError(null);
    try {
      const res = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: form.plan,
          userEmail: form.userEmail.trim(),
          expiresAt: form.expiresAt || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setForm({ plan: "community", userEmail: "", expiresAt: "" });
      setShowForm(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/admin/licenses/${id}`, { method: "DELETE" });
      setLicenses((prev) => prev.filter((l) => l.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>Licenses</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            {licenses.length} license{licenses.length !== 1 ? "s" : ""} issued
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "7px 14px", borderRadius: "8px", border: "none",
            background: "var(--color-brand)", color: "#fff",
            fontSize: "12px", fontWeight: 500, cursor: "pointer",
          }}
        >
          <Plus size={13} />
          New license
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div
          className="glass-card p-4 mb-5"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>
            Create license
          </h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>
                Plan
              </label>
              <select
                value={form.plan}
                onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
                style={{
                  width: "100%", padding: "7px 10px", borderRadius: "8px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)", color: "var(--color-text)",
                  fontSize: "13px",
                }}
              >
                {PLAN_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>
                User email
              </label>
              <input
                type="email"
                value={form.userEmail}
                onChange={(e) => setForm((f) => ({ ...f, userEmail: e.target.value }))}
                placeholder="user@example.com"
                style={{
                  width: "100%", padding: "7px 10px", borderRadius: "8px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)", color: "var(--color-text)",
                  fontSize: "13px",
                }}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium mb-1 block" style={{ color: "var(--color-text-secondary)" }}>
                Expires at <span style={{ color: "var(--color-muted)" }}>(optional)</span>
              </label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                style={{
                  width: "100%", padding: "7px 10px", borderRadius: "8px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)", color: "var(--color-text)",
                  fontSize: "13px",
                }}
              />
            </div>
            {formError && (
              <p className="text-[12px]" style={{ color: "var(--color-red)" }}>{formError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "7px 14px", borderRadius: "8px", border: "none",
                  background: "var(--color-brand)", color: "#fff",
                  fontSize: "12px", fontWeight: 500,
                  cursor: creating ? "not-allowed" : "pointer",
                  opacity: creating ? 0.7 : 1,
                }}
              >
                {creating ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={12} />}
                Create
              </button>
              <button
                onClick={() => { setShowForm(false); setFormError(null); }}
                style={{
                  padding: "7px 14px", borderRadius: "8px",
                  border: "1px solid var(--color-border)",
                  background: "transparent", color: "var(--color-text-secondary)",
                  fontSize: "12px", cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Licenses list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} style={{ color: "var(--color-muted)", animation: "spin 1s linear infinite" }} />
        </div>
      ) : licenses.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>No licenses issued yet.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {["Key", "Plan", "Email", "Expires", "Created", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px", textAlign: "left",
                      fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em",
                      textTransform: "uppercase", color: "var(--color-muted)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {licenses.map((lic) => {
                const expired = lic.expiresAt && new Date(lic.expiresAt) < new Date();
                return (
                  <tr
                    key={lic.id}
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                  >
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <code style={{ fontSize: "11px", color: "var(--color-text-secondary)", letterSpacing: "0.02em" }}>
                          {lic.key.slice(0, 8)}…{lic.key.slice(-6)}
                        </code>
                        <button
                          onClick={() => copyKey(lic.key)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", display: "flex", alignItems: "center" }}
                          title="Copy full key"
                        >
                          {copiedKey === lic.key
                            ? <CheckCircle2 size={12} style={{ color: "var(--color-green)" }} />
                            : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        fontSize: "11px", fontWeight: 500, padding: "2px 8px",
                        borderRadius: "99px",
                        background: `${PLAN_COLORS[lic.plan] ?? "var(--color-muted)"}20`,
                        color: PLAN_COLORS[lic.plan] ?? "var(--color-muted)",
                      }}>
                        {lic.plan}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: "12px", color: "var(--color-text)" }}>
                      {lic.userEmail}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: "12px", color: expired ? "var(--color-red)" : "var(--color-text-secondary)" }}>
                      {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : "Never"}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: "12px", color: "var(--color-muted)" }}>
                      {new Date(lic.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button
                        onClick={() => handleDelete(lic.id)}
                        disabled={deletingId === lic.id}
                        style={{
                          display: "flex", alignItems: "center", gap: "4px",
                          padding: "4px 8px", borderRadius: "6px",
                          border: "1px solid transparent",
                          background: "transparent",
                          color: "var(--color-red)",
                          fontSize: "11px", cursor: deletingId === lic.id ? "not-allowed" : "pointer",
                          opacity: deletingId === lic.id ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-red-dim)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        {deletingId === lic.id
                          ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                          : <Trash2 size={12} />}
                        Revoke
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
