"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard, TrendingDown, Package, Zap, Clock,
  AlertCircle, Loader2, RefreshCw, Copy, CheckCircle2,
  Coins,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { CREDIT_PACKAGES, PLANS, creditsToUsd } from "@/lib/pricing";

// ─── Wallet addresses — UPDATE THESE ───────────────────────────────────────
const WALLETS = {
  "USDT (TRC-20)":  { address: "YOUR_USDT_TRC20_WALLET_ADDRESS", network: "TRON", color: "#26a17b" },
  "USDT (ERC-20)":  { address: "YOUR_USDT_ERC20_WALLET_ADDRESS", network: "Ethereum", color: "#26a17b" },
  "USDC (ERC-20)":  { address: "YOUR_USDC_ERC20_WALLET_ADDRESS", network: "Ethereum", color: "#2775ca" },
  "USDC (Polygon)": { address: "YOUR_USDC_POLYGON_WALLET_ADDRESS", network: "Polygon", color: "#8247e5" },
};

const CONTACT_INFO = {
  telegram: "@YOUR_TELEGRAM_HANDLE",
  email: "billing@agentplayground.net",
};
// ─────────────────────────────────────────────────────────────────────────────

interface BillingData {
  balance: number; balanceUsd: number;
  lifetimePurchased: number; lifetimeUsed: number;
  monthlySpendCredits: number; monthlySpendUsd: number;
  recentUsage: Array<{ id: string; service: string; endpoint: string | null; credits: number; createdAt: string; }>;
}

function formatCredits(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}
function formatUsd(n: number) { return `$${n.toFixed(2)}`; }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function serviceColor(s: string) {
  const m: Record<string, string> = { claude: "var(--color-green)", web_search: "#a78bfa", web_browse: "#60a5fa", ollama: "var(--color-yellow)", compute: "var(--color-muted)" };
  return m[s] ?? "var(--color-text)";
}

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>;
  label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ background: `${accent ?? "var(--color-green)"}18` }}>
          <Icon size={15} style={{ color: accent ?? "var(--color-green)" }} />
        </div>
        <span className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>{label}</span>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text)" }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>{sub}</p>}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] hover:opacity-80 transition-all"
      style={{ border: "1px solid var(--color-border)", color: copied ? "var(--color-green)" : "var(--color-muted)" }}>
      {copied ? <CheckCircle2 size={10} /> : <Copy size={10} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function BillingPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string>("standard");
  const [selectedWallet, setSelectedWallet] = useState<keyof typeof WALLETS>("USDT (TRC-20)");

  const plan = (session?.user as { plan?: string })?.plan ?? "free";
  const planConfig = PLANS[plan as keyof typeof PLANS] ?? PLANS.free;
  const pkg = CREDIT_PACKAGES.find((p) => p.id === selectedPkg) ?? CREDIT_PACKAGES[1];

  async function fetchBilling(showRefresh = false) {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load billing data");
    } finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { fetchBilling(); }, []);

  const wallet = WALLETS[selectedWallet];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>Billing &amp; Usage</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>Credit balance, usage history, and top-up via crypto</p>
        </div>
        <button onClick={() => fetchBilling(true)} disabled={refreshing || loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
          style={{ color: "var(--color-muted)", border: "1px solid var(--color-border)", opacity: refreshing || loading ? 0.5 : 1 }}>
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />Refresh
        </button>
      </div>

      {/* Plan badge */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: "var(--color-green-dim)" }}>
            <Zap size={16} style={{ color: "var(--color-green)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{planConfig.name} Plan</p>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              {planConfig.monthlyFreeCredits.toLocaleString()} free credits/month · {planConfig.claudeEnabled ? "Claude API enabled" : "Ollama only"}
            </p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
          style={{ background: "var(--color-green-dim)", color: "var(--color-green)" }}>
          {planConfig.name}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: "var(--color-red-dim)", border: "1px solid rgba(248,113,113,0.2)" }}>
          <AlertCircle size={14} style={{ color: "var(--color-red)" }} />
          <p className="text-sm" style={{ color: "var(--color-red)" }}>{error}</p>
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-muted)" }} />
        </div>
      )}

      {data && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard icon={CreditCard} label="Credit Balance" value={formatCredits(data.balance)} sub={formatUsd(data.balanceUsd)} accent="var(--color-green)" />
            <StatCard icon={TrendingDown} label="This Month" value={formatCredits(data.monthlySpendCredits)} sub={formatUsd(data.monthlySpendUsd) + " spent"} accent="#60a5fa" />
            <StatCard icon={Package} label="Lifetime Purchased" value={formatCredits(data.lifetimePurchased)} sub={formatUsd(creditsToUsd(data.lifetimePurchased))} accent="#a78bfa" />
            <StatCard icon={Zap} label="Lifetime Used" value={formatCredits(data.lifetimeUsed)} sub={formatUsd(creditsToUsd(data.lifetimeUsed))} accent="var(--color-yellow)" />
          </div>

          {/* Top-up with crypto */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: "rgba(38,161,123,0.12)" }}>
                <Coins size={15} style={{ color: "#26a17b" }} />
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Top Up Credits</h2>
                <p className="text-xs" style={{ color: "var(--color-muted)" }}>Pay with USDT or USDC — credits are added manually within 24h</p>
              </div>
            </div>

            {/* Step 1: Pick package */}
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted)" }}>
              1 — Choose a credit package
            </p>
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {CREDIT_PACKAGES.map((p) => {
                const isSelected = selectedPkg === p.id;
                return (
                  <button key={p.id} onClick={() => setSelectedPkg(p.id)}
                    className="relative p-3.5 rounded-xl text-left transition-all"
                    style={{
                      border: isSelected ? "1px solid #26a17b" : "1px solid var(--color-border)",
                      background: isSelected ? "rgba(38,161,123,0.08)" : "transparent",
                    }}>
                    {p.id === "standard" && (
                      <span className="absolute -top-2 left-2.5 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
                        style={{ background: "#26a17b22", color: "#26a17b", border: "1px solid #26a17b44" }}>
                        Popular
                      </span>
                    )}
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text)" }}>{p.label}</p>
                    <p className="text-lg font-bold" style={{ color: isSelected ? "#26a17b" : "var(--color-text)" }}>${p.usd}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>{formatCredits(p.credits)} credits</p>
                  </button>
                );
              })}
            </div>

            {/* Step 2: Pick network */}
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted)" }}>
              2 — Choose network
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {(Object.keys(WALLETS) as Array<keyof typeof WALLETS>).map((key) => {
                const w = WALLETS[key];
                const isSelected = selectedWallet === key;
                return (
                  <button key={key} onClick={() => setSelectedWallet(key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      border: `1px solid ${isSelected ? w.color : "var(--color-border)"}`,
                      background: isSelected ? `${w.color}14` : "transparent",
                      color: isSelected ? w.color : "var(--color-muted)",
                    }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: w.color }} />
                    {key}
                  </button>
                );
              })}
            </div>

            {/* Step 3: Send */}
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted)" }}>
              3 — Send exactly ${pkg.usd} to this address
            </p>
            <div className="rounded-xl p-4 mb-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: wallet.color }} />
                <span className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>{selectedWallet}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${wallet.color}18`, color: wallet.color }}>
                  {wallet.network}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <code className="flex-1 text-xs font-mono truncate py-2 px-3 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.04)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>
                  {wallet.address}
                </code>
                <CopyButton text={wallet.address} />
              </div>
              <p className="text-[10px] mt-2" style={{ color: "var(--color-muted)" }}>
                ⚠️ Send exactly <strong style={{ color: "var(--color-text)" }}>${pkg.usd} {selectedWallet.split(" ")[0]}</strong> on the <strong style={{ color: wallet.color }}>{wallet.network}</strong> network only.
              </p>
            </div>

            {/* Step 4: Confirm */}
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted)" }}>
              4 — Send us your transaction hash
            </p>
            <div className="rounded-xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <p className="text-xs mb-3" style={{ color: "var(--color-muted)" }}>
                After sending, share the transaction hash (txid) with us so we can verify and add <strong style={{ color: "var(--color-text)" }}>{formatCredits(pkg.credits)} credits</strong> to your account within 24 hours.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={`https://t.me/${CONTACT_INFO.telegram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                  style={{ background: "rgba(38,161,123,0.12)", border: "1px solid rgba(38,161,123,0.3)", color: "#26a17b" }}>
                  📱 Telegram {CONTACT_INFO.telegram}
                </a>
                <a href={`mailto:${CONTACT_INFO.email}?subject=Crypto Top-Up — ${pkg.label} — ${selectedWallet}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                  style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.25)", color: "#60a5fa" }}>
                  ✉️ {CONTACT_INFO.email}
                </a>
              </div>
              <p className="text-[10px] mt-3" style={{ color: "var(--color-border)" }}>
                Include your account email ({(session?.user as { email?: string })?.email ?? "your email"}) in the message.
              </p>
            </div>
          </div>

          {/* Recent usage */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-xs uppercase tracking-wider mb-4" style={{ color: "var(--color-text-secondary)" }}>
              Recent Usage
            </h2>
            {data.recentUsage.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Clock size={24} style={{ color: "var(--color-muted)", opacity: 0.4 }} />
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>No usage recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      {["Service", "Endpoint", "Credits", "Date"].map((col) => (
                        <th key={col} className="pb-2.5 text-left text-[11px] font-medium uppercase tracking-wider pr-4"
                          style={{ color: "var(--color-muted)" }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentUsage.map((row) => (
                      <tr key={row.id} style={{ borderBottom: "1px solid var(--color-border)" }}
                        className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-4">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ background: `${serviceColor(row.service)}18`, color: serviceColor(row.service) }}>
                            {row.service}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-xs font-mono" style={{ color: "var(--color-muted)" }}>{row.endpoint ?? "—"}</span>
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
                          <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>{formatDate(row.createdAt)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
