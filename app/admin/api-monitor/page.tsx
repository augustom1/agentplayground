"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Copy, Check, X, RotateCcw, Trash2, Activity,
  AlertCircle, Clock, Zap, Power, ChevronRight,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type ApiClient = {
  id: string;
  name: string;
  type: "CLAUDE_MOBILE" | "EXTERNAL_APP" | "AGENT" | "WEBHOOK";
  apiKeyPrefix: string;
  isActive: boolean;
  rateLimit: number;
  lastSeenAt: string | null;
  createdAt: string;
  _count: { requests: number };
};

type ClientStats = {
  total: number;
  errorRate: number;
  avgLatency: number;
  statusBreakdown: { "2xx": number; "4xx": number; "5xx": number };
  topEndpoints: { endpoint: string; count: number; avgMs: number; errors: number }[];
  recentErrors: { path: string; statusCode: number; errorMessage: string | null; createdAt: string }[];
  timeseries: { hour: string; count: number }[];
};

type GlobalStats = {
  total: number;
  errorRate: number;
  avgLatency: number;
  activeClients: number;
};

const TYPE_COLORS: Record<string, string> = {
  CLAUDE_MOBILE: "var(--color-brand)",
  EXTERNAL_APP:  "var(--color-green)",
  AGENT:         "var(--color-yellow)",
  WEBHOOK:       "var(--color-red)",
};

const CLIENT_TYPES = ["CLAUDE_MOBILE", "EXTERNAL_APP", "AGENT", "WEBHOOK"] as const;

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide"
      style={{ background: `${TYPE_COLORS[type]}20`, color: TYPE_COLORS[type] }}
    >
      {type.replace("_", " ")}
    </span>
  );
}

function AddClientModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (key: string) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<typeof CLIENT_TYPES[number]>("EXTERNAL_APP");
  const [rateLimit, setRateLimit] = useState(100);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/api-monitor/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, rateLimit }),
      });
      const data = await res.json();
      if (data.plaintextKey) onCreated(data.plaintextKey);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-96 rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: "var(--color-text)" }}>Add API Client</h3>
          <button onClick={onClose} style={{ color: "var(--color-muted)" }}><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium" style={{ color: "var(--color-muted)" }}>NAME</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Claude Desktop"
            className="rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium" style={{ color: "var(--color-muted)" }}>TYPE</label>
          <select value={type} onChange={(e) => setType(e.target.value as typeof CLIENT_TYPES[number])}
            className="rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
            {CLIENT_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium" style={{ color: "var(--color-muted)" }}>RATE LIMIT (req/min)</label>
          <input type="number" value={rateLimit} onChange={(e) => setRateLimit(Number(e.target.value))}
            className="rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px]"
            style={{ color: "var(--color-muted)", background: "var(--color-surface-2)" }}>Cancel</button>
          <button onClick={submit} disabled={loading || !name.trim()}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold disabled:opacity-50"
            style={{ background: "var(--color-brand)", color: "#fff" }}>
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function KeyRevealModal({ rawKey, onClose }: { rawKey: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(rawKey); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
      <div className="w-[480px] rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-yellow)" }}>
        <div className="flex items-center gap-2">
          <AlertCircle size={16} style={{ color: "var(--color-yellow)" }} />
          <h3 className="font-semibold" style={{ color: "var(--color-text)" }}>Copy your API key — shown once</h3>
        </div>
        <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>
          This key will not be shown again. Copy it now and store it securely.
        </p>
        <div className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
          <code className="flex-1 text-[11px] font-mono break-all" style={{ color: "var(--color-green)" }}>{rawKey}</code>
          <button onClick={copy} style={{ color: "var(--color-muted)", flexShrink: 0 }}>
            {copied ? <Check size={14} style={{ color: "var(--color-green)" }} /> : <Copy size={14} />}
          </button>
        </div>
        <button onClick={onClose}
          className="self-end px-4 py-2 rounded-lg text-[13px] font-semibold"
          style={{ background: "var(--color-brand)", color: "#fff" }}>
          I&apos;ve copied it
        </button>
      </div>
    </div>
  );
}

export default function ApiMonitorPage() {
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [global, setGlobal] = useState<GlobalStats | null>(null);
  const [selected, setSelected] = useState<ApiClient | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [cRes, gRes] = await Promise.all([
        fetch("/api/admin/api-monitor/clients"),
        fetch("/api/admin/api-monitor/global"),
      ]);
      if (cRes.ok) setClients(await cRes.json());
      if (gRes.ok) setGlobal(await gRes.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadStats = useCallback(async (clientId: string) => {
    try {
      const res = await fetch(`/api/admin/api-monitor/clients/${clientId}/stats`);
      if (res.ok) setStats(await res.json());
    } catch {}
  }, []);

  useEffect(() => { if (selected) loadStats(selected.id); }, [selected, loadStats]);

  const toggleActive = async (c: ApiClient) => {
    await fetch(`/api/admin/api-monitor/clients/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    load();
  };

  const rotateKey = async (c: ApiClient) => {
    const res = await fetch(`/api/admin/api-monitor/clients/${c.id}/rotate`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setRevealKey(data.plaintextKey);
      load();
    }
  };

  const deleteClient = async (c: ApiClient) => {
    if (!confirm(`Delete "${c.name}"?`)) return;
    await fetch(`/api/admin/api-monitor/clients/${c.id}`, { method: "DELETE" });
    if (selected?.id === c.id) setSelected(null);
    load();
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>API Monitor</h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>Manage and track all API client connections</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold"
          style={{ background: "var(--color-brand)", color: "#fff" }}
        >
          <Plus size={14} /> Add Client
        </button>
      </div>

      {/* Global stats */}
      {global && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Requests / 24h", value: global.total.toLocaleString(), icon: Activity },
            { label: "Error Rate",           value: `${global.errorRate}%`,           icon: AlertCircle },
            { label: "Avg Latency",          value: `${global.avgLatency}ms`,          icon: Clock },
            { label: "Active Clients",       value: global.activeClients,              icon: Zap },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="glass-card rounded-xl p-4 flex flex-col gap-2"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
              <div className="flex items-center gap-2">
                <Icon size={13} style={{ color: "var(--color-brand)" }} />
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>{label}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4">
        {/* Client list */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-2">
          {loading ? (
            <p className="text-[13px] py-4 text-center" style={{ color: "var(--color-muted)" }}>Loading…</p>
          ) : clients.length === 0 ? (
            <div className="glass-card rounded-xl p-6 text-center"
              style={{ border: "1px solid var(--color-border)" }}>
              <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>No clients yet</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 text-[12px]" style={{ color: "var(--color-brand)" }}>
                + Add your first client
              </button>
            </div>
          ) : (
            clients.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                className="glass-card rounded-xl p-4 cursor-pointer transition-all"
                style={{
                  background: selected?.id === c.id ? "var(--color-surface-3)" : "var(--color-surface-2)",
                  border: `1px solid ${selected?.id === c.id ? "var(--color-brand)" : "var(--color-border)"}`,
                }}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: c.isActive ? "var(--color-green)" : "var(--color-muted)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-text)" }}>{c.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <TypeBadge type={c.type} />
                      <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>{c.apiKeyPrefix}…</span>
                    </div>
                  </div>
                  <ChevronRight size={13} style={{ color: "var(--color-muted)", flexShrink: 0, marginTop: 2 }} />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                    {c.lastSeenAt ? timeAgo(c.lastSeenAt) : "never seen"}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                    {c._count.requests} reqs
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Client detail */}
        {selected ? (
          <div className="flex-1 flex flex-col gap-4">
            {/* Client header */}
            <div className="glass-card rounded-xl p-5"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-[15px] font-bold" style={{ color: "var(--color-text)" }}>{selected.name}</h2>
                    <TypeBadge type={selected.type} />
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                    Prefix: <code style={{ color: "var(--color-text-secondary)" }}>{selected.apiKeyPrefix}…</code>
                    {" · "}Rate limit: {selected.rateLimit} req/min
                    {selected.lastSeenAt && ` · Last seen: ${timeAgo(selected.lastSeenAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(selected)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]"
                    style={{
                      background: selected.isActive ? "var(--color-green-dim)" : "var(--color-surface-3)",
                      color: selected.isActive ? "var(--color-green)" : "var(--color-muted)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <Power size={11} />
                    {selected.isActive ? "Active" : "Inactive"}
                  </button>
                  <button onClick={() => rotateKey(selected)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px]"
                    style={{ background: "var(--color-surface-3)", border: "1px solid var(--color-border)", color: "var(--color-muted)" }}>
                    <RotateCcw size={11} /> Rotate Key
                  </button>
                  <button onClick={() => deleteClient(selected)}
                    className="p-2 rounded-lg hover:opacity-70"
                    style={{ background: "var(--color-red-dim)", color: "var(--color-red)", border: "1px solid var(--color-border)" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>

            {stats ? (
              <>
                {/* Stats cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Total Requests", value: stats.total },
                    { label: "Error Rate",     value: `${stats.errorRate}%` },
                    { label: "Avg Latency",    value: `${stats.avgLatency}ms` },
                  ].map(({ label, value }) => (
                    <div key={label} className="glass-card rounded-xl p-4"
                      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--color-muted)" }}>{label}</p>
                      <p className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Timeseries */}
                {stats.timeseries.length > 0 && (
                  <div className="glass-card rounded-xl p-5"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                    <p className="text-[12px] font-semibold mb-3" style={{ color: "var(--color-text)" }}>Requests / Hour</p>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={stats.timeseries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "var(--color-muted)" }} />
                        <YAxis tick={{ fontSize: 9, fill: "var(--color-muted)" }} />
                        <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }} />
                        <Line type="monotone" dataKey="count" stroke="var(--color-brand)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Status breakdown */}
                <div className="glass-card rounded-xl p-5"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                  <p className="text-[12px] font-semibold mb-3" style={{ color: "var(--color-text)" }}>Status Breakdown</p>
                  <div className="flex gap-4">
                    {Object.entries(stats.statusBreakdown).map(([code, count]) => (
                      <div key={code} className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold" style={{
                          color: code === "2xx" ? "var(--color-green)" : code === "4xx" ? "var(--color-yellow)" : "var(--color-red)"
                        }}>{code}</span>
                        <span className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top endpoints */}
                {stats.topEndpoints.length > 0 && (
                  <div className="glass-card rounded-xl p-5"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                    <p className="text-[12px] font-semibold mb-3" style={{ color: "var(--color-text)" }}>Top Endpoints</p>
                    <div className="flex flex-col gap-1.5">
                      {stats.topEndpoints.map((e) => (
                        <div key={e.endpoint} className="flex items-center gap-2 text-[11px]">
                          <code className="flex-1 truncate" style={{ color: "var(--color-text-secondary)" }}>{e.endpoint}</code>
                          <span style={{ color: "var(--color-text)" }}>{e.count}</span>
                          <span style={{ color: "var(--color-muted)" }}>{e.avgMs}ms</span>
                          {e.errors > 0 && <span style={{ color: "var(--color-red)" }}>{e.errors} err</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent errors */}
                {stats.recentErrors.length > 0 && (
                  <div className="glass-card rounded-xl p-5"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                    <p className="text-[12px] font-semibold mb-3" style={{ color: "var(--color-red)" }}>Recent Errors</p>
                    <div className="flex flex-col gap-2">
                      {stats.recentErrors.slice(0, 10).map((e, i) => (
                        <div key={i} className="flex items-start gap-2 text-[11px]">
                          <span className="font-semibold px-1.5 py-0.5 rounded" style={{ background: "var(--color-red-dim)", color: "var(--color-red)" }}>{e.statusCode}</span>
                          <code className="truncate" style={{ color: "var(--color-text-secondary)" }}>{e.path}</code>
                          {e.errorMessage && <span className="truncate flex-1" style={{ color: "var(--color-muted)" }}>{e.errorMessage}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center py-8" style={{ color: "var(--color-muted)" }}>Loading stats…</p>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: "var(--color-muted)" }}>
            <p className="text-[13px]">Select a client to view details</p>
          </div>
        )}
      </div>

      {showAdd && (
        <AddClientModal
          onClose={() => setShowAdd(false)}
          onCreated={(key) => { setShowAdd(false); setRevealKey(key); load(); }}
        />
      )}
      {revealKey && <KeyRevealModal rawKey={revealKey} onClose={() => setRevealKey(null)} />}
    </div>
  );
}
