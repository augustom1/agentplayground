"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  TrendingDown,
  Package,
  Zap,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { CREDIT_PACKAGES, PLANS, creditsToUsd } from "@/lib/pricing";

/* ─── Types ─── */
interface BillingData {
  balance: number;
  balanceUsd: number;
  lifetimePurchased: number;
  lifetimeUsed: number;
  monthlySpendCredits: number;
  monthlySpendUsd: number;
  recentUsage: Array<{
    id: string;
    service: string;
    endpoint: string | null;
    credits: number;
    createdAt: string;
  }>;
}

/* ─── Helpers ─── */
function formatCredits(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function serviceColor(service: string): string {
  const map: Record<string, string> = {
    claude: "var(--color-green)",
    web_search: "#a78bfa",
    web_browse: "#60a5fa",
    ollama: "var(--color-yellow)",
    compute: "var(--color-muted)",
  };
  return map[service] ?? "var(--color-text)";
}

/* ─── Stat card ─── */
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ background: `${accent ?? "var(--color-green)"}18` }}
        >
          <Icon size={15} style={{ color: accent ?? "var(--color-green)" }} />
        </div>
        <span className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          {label}
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function BillingPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "bitpay">("stripe");

  const plan = (session?.user as { plan?: string })?.plan ?? "free";
  const planConfig = PLANS[plan as keyof typeof PLANS] ?? PLANS.free;

  async function fetchBilling(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load billing data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchBilling(); }, []);

  // Show success banner after Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "1") {
      setSuccessMsg("Payment successful! Credits will appear in your balance shortly.");
      window.history.replaceState({}, "", "/billing");
      fetchBilling();
    }
  }, []);

  async function handleBitPayCheckout(packageId: string) {
    setCheckoutLoading(packageId);
    try {
      const res = await fetch("/api/billing/bitpay/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "BitPay checkout failed");
      if (json.url) window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "BitPay checkout failed");
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleStripeCheckout(packageId: string) {
    setCheckoutLoading(packageId);
    try {
      const res = await fetch("/api/billing/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Checkout failed");
      if (json.url) window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            Billing &amp; Usage
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            Credit balance, monthly spend, and API usage history
          </p>
        </div>
        <button
          onClick={() => fetchBilling(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
          style={{
            color: "var(--color-muted)",
            border: "1px solid var(--color-border)",
            background: "transparent",
            cursor: refreshing || loading ? "default" : "pointer",
            opacity: refreshing || loading ? 0.5 : 1,
          }}
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Current plan badge */}
      <div
        className="glass-card p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ background: "var(--color-green-dim)" }}
          >
            <Zap size={16} style={{ color: "var(--color-green)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              {planConfig.name} Plan
            </p>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              {planConfig.monthlyFreeCredits.toLocaleString()} free credits/month
              {" · "}
              {planConfig.claudeEnabled ? "Claude API enabled" : "Ollama only"}
            </p>
          </div>
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
          style={{
            background: "var(--color-green-dim)",
            color: "var(--color-green)",
          }}
        >
          {planConfig.name}
        </span>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: "var(--color-green-dim)", border: "1px solid rgba(74,222,128,0.2)" }}
        >
          <CheckCircle size={14} style={{ color: "var(--color-green)" }} />
          <p className="text-sm" style={{ color: "var(--color-green)" }}>{successMsg}</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: "var(--color-red-dim)", border: "1px solid rgba(248,113,113,0.2)" }}
        >
          <AlertCircle size={14} style={{ color: "var(--color-red)" }} />
          <p className="text-sm" style={{ color: "var(--color-red)" }}>{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-muted)" }} />
        </div>
      )}

      {data && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              icon={CreditCard}
              label="Credit Balance"
              value={formatCredits(data.balance)}
              sub={formatUsd(data.balanceUsd)}
              accent="var(--color-green)"
            />
            <StatCard
              icon={TrendingDown}
              label="This Month"
              value={formatCredits(data.monthlySpendCredits)}
              sub={formatUsd(data.monthlySpendUsd) + " spent"}
              accent="#60a5fa"
            />
            <StatCard
              icon={Package}
              label="Lifetime Purchased"
              value={formatCredits(data.lifetimePurchased)}
              sub={formatUsd(creditsToUsd(data.lifetimePurchased))}
              accent="#a78bfa"
            />
            <StatCard
              icon={Zap}
              label="Lifetime Used"
              value={formatCredits(data.lifetimeUsed)}
              sub={formatUsd(creditsToUsd(data.lifetimeUsed))}
              accent="var(--color-yellow)"
            />
          </div>

          {/* Recent usage table */}
          <div className="glass-card p-5">
            <h2
              className="font-semibold text-xs uppercase tracking-wider mb-4"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Recent Usage
            </h2>

            {data.recentUsage.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Clock size={24} style={{ color: "var(--color-muted)", opacity: 0.4 }} />
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>No usage recorded yet</p>
                <p className="text-xs" style={{ color: "var(--color-muted)", opacity: 0.6 }}>
                  Usage will appear here once you start using the API
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      {["Service", "Endpoint", "Credits", "Date"].map((col) => (
                        <th
                          key={col}
                          className="pb-2.5 text-left text-[11px] font-medium uppercase tracking-wider pr-4"
                          style={{ color: "var(--color-muted)" }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentUsage.map((row) => (
                      <tr
                        key={row.id}
                        style={{ borderBottom: "1px solid var(--color-border)" }}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              background: `${serviceColor(row.service)}18`,
                              color: serviceColor(row.service),
                            }}
                          >
                            {row.service}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-xs font-mono" style={{ color: "var(--color-muted)" }}>
                            {row.endpoint ?? "—"}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--color-text)" }}>
                            {row.credits.toLocaleString()}
                          </span>
                          <span className="text-[10px] ml-1" style={{ color: "var(--color-muted)" }}>
                            ({formatUsd(creditsToUsd(row.credits))})
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                            {formatDate(row.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Credit packages */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2
                  className="font-semibold text-xs uppercase tracking-wider"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Top Up Credits
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                  Purchase a credit package to keep using Claude and other services
                </p>
              </div>
            </div>

            {/* Payment method selector */}
            <div className="flex gap-2 mb-4">
              {(["stripe", "bitpay"] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: paymentMethod === method ? "var(--color-surface-3)" : "transparent",
                    border: `1px solid ${paymentMethod === method ? "var(--color-border)" : "transparent"}`,
                    color: "var(--color-text)",
                    cursor: "pointer",
                  }}
                >
                  {method === "stripe" ? "💳 Card" : "🪙 Crypto (+10% bonus)"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {CREDIT_PACKAGES.map((pkg) => {
                const isPopular = pkg.id === "standard";
                return (
                  <div
                    key={pkg.id}
                    className="glass-card-interactive p-4 flex flex-col gap-3 relative"
                    style={{
                      border: isPopular ? "1px solid rgba(74,222,128,0.3)" : undefined,
                    }}
                  >
                    {isPopular && (
                      <span
                        className="absolute -top-2.5 left-3 text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
                        style={{
                          background: "var(--color-green-dim)",
                          color: "var(--color-green)",
                          border: "1px solid rgba(74,222,128,0.2)",
                        }}
                      >
                        Popular
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                        {pkg.label}
                      </p>
                      <p className="text-xl font-bold mt-0.5" style={{ color: "var(--color-text)" }}>
                        ${pkg.usd}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--color-green)" }}>
                        {formatCredits(pkg.credits)} credits
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                        ${(pkg.perCredit * 1000).toFixed(3)} per 1k credits
                      </p>
                    </div>
                    <button
                      onClick={() => paymentMethod === "stripe"
                        ? handleStripeCheckout(pkg.id)
                        : handleBitPayCheckout(pkg.id)
                      }
                      disabled={checkoutLoading === pkg.id}
                      className="w-full text-xs font-medium py-2 rounded-lg mt-auto flex items-center justify-center gap-1.5 transition-opacity"
                      style={{
                        background: isPopular ? "var(--color-green)" : "var(--color-surface-3)",
                        color: isPopular ? "#000" : "var(--color-text)",
                        border: isPopular ? "none" : "1px solid var(--color-border)",
                        cursor: checkoutLoading === pkg.id ? "default" : "pointer",
                        opacity: checkoutLoading === pkg.id ? 0.6 : 1,
                      }}
                    >
                      {checkoutLoading === pkg.id ? (
                        <><Loader2 size={11} className="animate-spin" /> Processing…</>
                      ) : paymentMethod === "bitpay" ? (
                        <>🪙 Pay ${pkg.usd} <span style={{ opacity: 0.7 }}>(+10%)</span></>
                      ) : (
                        <><CreditCard size={11} /> Pay ${pkg.usd}</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] mt-4" style={{ color: "var(--color-muted)", opacity: 0.6 }}>
              Payments via Stripe. Credits never expire and roll over month to month.
              {" "}Requires <code>STRIPE_SECRET_KEY</code> in your environment.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
