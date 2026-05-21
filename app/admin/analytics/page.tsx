"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Monitor, Smartphone, Tablet, Globe, TrendingUp, Users, Clock, MousePointerClick } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
} from "recharts";

type Overview = {
  totalViews: number;
  uniqueSessions: number;
  uniqueUsers: number;
  avgDuration: number;
  bounceRate: number;
  topPages: { path: string; views: number }[];
  topReferrers: { referrer: string; views: number }[];
  deviceCounts: { desktop: number; mobile: number; tablet: number };
  browsers: { browser: string; count: number }[];
  countries: { country: string; count: number }[];
  timeseries: { date: string; views: number }[];
};

const PRESETS = [
  { label: "Today", days: 1 },
  { label: "7d",    days: 7 },
  { label: "30d",   days: 30 },
  { label: "90d",   days: 90 },
];

const PALETTE = ["var(--color-brand)", "var(--color-green)", "var(--color-yellow)", "var(--color-red)", "#a78bfa", "#f97316"];

function MetricCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon: React.FC<{ size?: number; style?: React.CSSProperties }> }) {
  return (
    <div
      className="glass-card rounded-xl p-4 flex flex-col gap-2"
      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: "var(--color-brand)" }} />
        <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--color-muted)" }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{value}</p>
      {sub && <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>{sub}</p>}
    </div>
  );
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export default function AnalyticsPage() {
  const [preset, setPreset] = useState(7);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(Date.now() - preset * 86400_000).toISOString();
      const to = new Date().toISOString();
      const res = await fetch(`/api/admin/analytics/overview?from=${from}&to=${to}`);
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  }, [preset]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const deviceData = data
    ? [
        { name: "Desktop", value: data.deviceCounts.desktop, icon: Monitor },
        { name: "Mobile",  value: data.deviceCounts.mobile,  icon: Smartphone },
        { name: "Tablet",  value: data.deviceCounts.tablet,  icon: Tablet },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="p-6 flex flex-col gap-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Analytics</h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>Self-hosted traffic and behavior data</p>
        </div>
        <div className="flex items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              onClick={() => setPreset(p.days)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: preset === p.days ? "var(--color-brand)" : "var(--color-surface-2)",
                color: preset === p.days ? "#fff" : "var(--color-muted)",
                border: `1px solid ${preset === p.days ? "var(--color-brand)" : "var(--color-border)"}`,
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={load}
            className="p-2 rounded-lg transition-all hover:opacity-70"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-muted)" }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="text-center py-20" style={{ color: "var(--color-muted)" }}>Loading analytics…</div>
      ) : !data ? (
        <div className="text-center py-20" style={{ color: "var(--color-muted)" }}>No data available</div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard label="Page Views"      value={data.totalViews.toLocaleString()}    icon={TrendingUp} />
            <MetricCard label="Sessions"        value={data.uniqueSessions.toLocaleString()} icon={Users} />
            <MetricCard label="Avg Duration"    value={formatDuration(data.avgDuration)}    icon={Clock} />
            <MetricCard label="Bounce Rate"     value={`${data.bounceRate}%`}               icon={MousePointerClick} />
          </div>

          {/* Timeseries chart */}
          <div
            className="glass-card rounded-xl p-5"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
          >
            <p className="text-[12px] font-semibold mb-4" style={{ color: "var(--color-text)" }}>Page Views Over Time</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.timeseries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-muted)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted)" }} />
                <Tooltip
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "var(--color-text)" }}
                />
                <Line type="monotone" dataKey="views" stroke="var(--color-brand)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top pages */}
            <div
              className="glass-card rounded-xl p-5 col-span-1"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
            >
              <p className="text-[12px] font-semibold mb-3" style={{ color: "var(--color-text)" }}>Top Pages</p>
              <div className="flex flex-col gap-1.5">
                {data.topPages.slice(0, 8).map((p, i) => (
                  <div key={p.path} className="flex items-center gap-2">
                    <span className="text-[10px] w-4 text-right" style={{ color: "var(--color-muted)" }}>{i + 1}</span>
                    <span className="flex-1 text-[11px] truncate" style={{ color: "var(--color-text-secondary)" }}>{p.path}</span>
                    <span className="text-[11px] font-semibold" style={{ color: "var(--color-text)" }}>{p.views}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Device donut */}
            <div
              className="glass-card rounded-xl p-5"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
            >
              <p className="text-[12px] font-semibold mb-3" style={{ color: "var(--color-text)" }}>Devices</p>
              {deviceData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={deviceData} dataKey="value" cx="50%" cy="50%" outerRadius={50} innerRadius={28}>
                        {deviceData.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1 mt-2">
                    {deviceData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                        <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>{d.name}</span>
                        <span className="ml-auto text-[11px] font-semibold" style={{ color: "var(--color-text)" }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-[12px] text-center py-8" style={{ color: "var(--color-muted)" }}>No data</p>
              )}
            </div>

            {/* Countries */}
            <div
              className="glass-card rounded-xl p-5"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
            >
              <p className="text-[12px] font-semibold mb-3 flex items-center gap-1.5" style={{ color: "var(--color-text)" }}>
                <Globe size={13} style={{ color: "var(--color-brand)" }} /> Countries
              </p>
              {data.countries.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data.countries.slice(0, 8)} layout="vertical" margin={{ left: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 9, fill: "var(--color-muted)" }} />
                    <YAxis type="category" dataKey="country" tick={{ fontSize: 10, fill: "var(--color-muted)" }} width={30} />
                    <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="count" fill="var(--color-brand)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-[12px] text-center py-8" style={{ color: "var(--color-muted)" }}>No geo data</p>
              )}
            </div>
          </div>

          {/* Referrers */}
          {data.topReferrers.length > 0 && (
            <div
              className="glass-card rounded-xl p-5"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
            >
              <p className="text-[12px] font-semibold mb-3" style={{ color: "var(--color-text)" }}>Top Referrers</p>
              <div className="flex flex-wrap gap-2">
                {data.topReferrers.map((r) => (
                  <div
                    key={r.referrer}
                    className="px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-2"
                    style={{ background: "var(--color-surface-3)", border: "1px solid var(--color-border)" }}
                  >
                    <span style={{ color: "var(--color-text-secondary)" }} className="truncate max-w-48">{r.referrer}</span>
                    <span className="font-semibold" style={{ color: "var(--color-brand)" }}>{r.views}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
