"use client";

import { useState, useEffect } from "react";
import { CreditCard, Loader2, TrendingDown, ExternalLink } from "lucide-react";
import Link from "next/link";

interface BillingData {
  balance: number;
  balanceUsd: number;
  monthlySpendCredits: number;
  monthlySpendUsd: number;
}

export function BillingSection() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
          Billing &amp; Credits
        </h2>
        <Link
          href="/billing"
          className="flex items-center gap-1 text-[11px] hover:opacity-80 transition-opacity"
          style={{ color: "var(--color-muted)" }}
        >
          <ExternalLink size={11} />
          Full details
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3">
          <Loader2 size={14} className="animate-spin" style={{ color: "var(--color-muted)" }} />
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>Loading balance…</span>
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 gap-3">
          <div
            className="flex flex-col gap-1 p-3 rounded-xl"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center gap-1.5">
              <CreditCard size={12} style={{ color: "var(--color-muted)" }} />
              <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>Balance</span>
            </div>
            <p className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
              {data.balance.toLocaleString()}
            </p>
            <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
              ≈ ${data.balanceUsd.toFixed(2)}
            </p>
          </div>
          <div
            className="flex flex-col gap-1 p-3 rounded-xl"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center gap-1.5">
              <TrendingDown size={12} style={{ color: "var(--color-muted)" }} />
              <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>This month</span>
            </div>
            <p className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
              {data.monthlySpendCredits.toLocaleString()}
            </p>
            <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
              ≈ ${data.monthlySpendUsd.toFixed(2)} spent
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs py-2" style={{ color: "var(--color-muted)" }}>
          Credits not configured — billing is schema-ready, pending payment processor keys.
        </p>
      )}
    </div>
  );
}
