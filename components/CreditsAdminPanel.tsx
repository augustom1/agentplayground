"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, CreditCard, Plus, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  plan: string;
  createdAt: string;
  balance: number;
  lifetimePurchased: number;
  lifetimeUsed: number;
};

export function CreditsAdminPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState<string | null>(null);
  const [grantAmount, setGrantAmount] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/credits");
      if (r.ok) setUsers(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function grant(userId: string) {
    const amount = parseFloat(grantAmount[userId] || "0");
    if (!amount || amount <= 0) return;
    setGranting(userId);
    try {
      await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount }),
      });
      setSuccess(userId);
      setGrantAmount((prev) => ({ ...prev, [userId]: "" }));
      setTimeout(() => setSuccess(null), 2000);
      await load();
    } finally {
      setGranting(null);
    }
  }

  const PRESETS = [100, 500, 1000];

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard size={14} style={{ color: "var(--color-brand)" }} />
          <h2 className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
            Credits Admin
          </h2>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px]"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-muted)", cursor: "pointer" }}
        >
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4" style={{ color: "var(--color-muted)" }}>
          <Loader2 size={14} className="animate-spin" />
          <span className="text-[12px]">Loading users…</span>
        </div>
      ) : users.length === 0 ? (
        <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>No users found.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
            >
              {/* User info */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                  style={{ background: u.role === "admin" ? "var(--color-brand-dim)" : "var(--color-surface-3)", color: u.role === "admin" ? "var(--color-brand)" : "var(--color-muted)" }}
                >
                  {(u.name || u.email)?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium truncate" style={{ color: "var(--color-text)" }}>
                    {u.name || u.email}
                    {u.role === "admin" && (
                      <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--color-brand-dim)", color: "var(--color-brand)" }}>admin</span>
                    )}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: "var(--color-muted)" }}>{u.email}</p>
                </div>
              </div>

              {/* Balance */}
              <div className="text-center shrink-0 px-3">
                <p
                  className="text-lg font-bold"
                  style={{ color: u.balance <= 0 ? "var(--color-red)" : u.balance < 50 ? "var(--color-yellow)" : "var(--color-green)" }}
                >
                  {u.balance.toFixed(0)}
                </p>
                <p className="text-[9px]" style={{ color: "var(--color-muted)" }}>credits</p>
              </div>

              {/* Grant form */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Quick presets */}
                <div className="flex gap-1">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setGrantAmount((prev) => ({ ...prev, [u.id]: String(preset) }))}
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: "var(--color-surface-3)", border: "1px solid var(--color-border)", color: "var(--color-muted)", cursor: "pointer" }}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  min="1"
                  value={grantAmount[u.id] || ""}
                  onChange={(e) => setGrantAmount((prev) => ({ ...prev, [u.id]: e.target.value }))}
                  placeholder="amount"
                  className="w-20 px-2 py-1 rounded-lg text-[12px]"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)", outline: "none" }}
                />

                <button
                  onClick={() => grant(u.id)}
                  disabled={granting === u.id || !grantAmount[u.id]}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: success === u.id ? "rgba(34,197,94,0.15)" : "var(--color-brand-dim)",
                    color: success === u.id ? "var(--color-green)" : "var(--color-brand)",
                    border: "none",
                    cursor: granting === u.id || !grantAmount[u.id] ? "not-allowed" : "pointer",
                    opacity: granting === u.id || !grantAmount[u.id] ? 0.5 : 1,
                  }}
                >
                  {granting === u.id ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : success === u.id ? (
                    <CheckCircle2 size={11} />
                  ) : (
                    <Plus size={11} />
                  )}
                  Grant
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] mt-3" style={{ color: "var(--color-muted)" }}>
        1 credit ≈ $0.001. Sonnet: 3 input + 15 output per 1k tokens. Haiku: 0.25 + 1.25. Grant credits manually until Stripe is wired.
      </p>
    </div>
  );
}
