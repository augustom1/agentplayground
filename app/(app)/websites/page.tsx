"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe, Plus, X, RefreshCw, ExternalLink, CheckCircle2,
  XCircle, Clock, Loader2, AlertCircle, Pencil, Check,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface Site {
  id: string;
  name: string;
  url: string;
  description?: string;
}

interface SiteStatus {
  ok: boolean;
  status: number | null;
  latencyMs: number | null;
  checkedAt: string;
}

const DEFAULT_SITES: Site[] = [
  { id: "main", name: "agentplayground.net", url: "https://agentplayground.net", description: "Main landing page" },
  { id: "app", name: "app.agentplayground.net", url: "https://app.agentplayground.net", description: "Agent Dashboard" },
  { id: "ar", name: "ar.agentplayground.net", url: "https://ar.agentplayground.net", description: "AR sales page" },
  { id: "n8n", name: "n8n.agentplayground.net", url: "https://n8n.agentplayground.net", description: "n8n automation" },
  { id: "files", name: "files.agentplayground.net", url: "https://files.agentplayground.net", description: "FileBrowser" },
  { id: "manage", name: "manage.agentplayground.net", url: "https://manage.agentplayground.net", description: "Portainer" },
];

const STORAGE_KEY = "ap_custom_sites";

function loadCustomSites(): Site[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCustomSites(sites: Site[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
}

function StatusDot({ status }: { status: SiteStatus | null | "loading" }) {
  if (status === "loading") {
    return <Loader2 size={13} className="animate-spin" style={{ color: "var(--color-muted)" }} />;
  }
  if (!status) {
    return <Clock size={13} style={{ color: "var(--color-muted)" }} />;
  }
  if (status.ok) {
    return <CheckCircle2 size={13} style={{ color: "var(--color-green)" }} />;
  }
  return <XCircle size={13} style={{ color: "var(--color-red)" }} />;
}

export default function WebsitesPage() {
  const { addToast } = useToast();
  const [customSites, setCustomSites] = useState<Site[]>([]);
  const [statuses, setStatuses] = useState<Record<string, SiteStatus | "loading">>({});
  const [checking, setChecking] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url: "", description: "" });
  const [editForm, setEditForm] = useState({ name: "", url: "", description: "" });

  useEffect(() => {
    setCustomSites(loadCustomSites());
  }, []);

  const allSites = [...DEFAULT_SITES, ...customSites];

  const checkSite = useCallback(async (site: Site) => {
    setStatuses((prev) => ({ ...prev, [site.id]: "loading" }));
    try {
      const res = await fetch(`/api/websites/check?url=${encodeURIComponent(site.url)}`, { cache: "no-store" });
      const data = await res.json();
      setStatuses((prev) => ({ ...prev, [site.id]: data }));
    } catch {
      setStatuses((prev) => ({
        ...prev,
        [site.id]: { ok: false, status: null, latencyMs: null, checkedAt: new Date().toISOString() },
      }));
    }
  }, []);

  const checkAll = useCallback(async () => {
    setChecking(true);
    await Promise.all(allSites.map((s) => checkSite(s)));
    setChecking(false);
  }, [allSites, checkSite]);

  // Auto-check on mount
  useEffect(() => {
    checkAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addSite() {
    const url = form.url.trim();
    if (!url || !form.name.trim()) return;
    const site: Site = {
      id: `custom-${Date.now()}`,
      name: form.name.trim(),
      url: url.startsWith("http") ? url : `https://${url}`,
      description: form.description.trim() || undefined,
    };
    const next = [...customSites, site];
    setCustomSites(next);
    saveCustomSites(next);
    setForm({ name: "", url: "", description: "" });
    setShowAdd(false);
    checkSite(site);
    addToast(`${site.name} added`, "success");
  }

  function removeSite(id: string) {
    const next = customSites.filter((s) => s.id !== id);
    setCustomSites(next);
    saveCustomSites(next);
  }

  function saveEdit(id: string) {
    const next = customSites.map((s) =>
      s.id === id
        ? { ...s, name: editForm.name.trim(), url: editForm.url.trim(), description: editForm.description.trim() || undefined }
        : s
    );
    setCustomSites(next);
    saveCustomSites(next);
    setEditId(null);
  }

  const lastChecked = Object.values(statuses).filter((s) => s !== "loading").length;

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 max-w-4xl mx-auto w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>Websites</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            Monitor and manage your web properties — agents can work on them too
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={checkAll}
            disabled={checking}
            className="btn-ghost flex items-center gap-2 px-3 py-2"
            style={{ fontSize: "13px" }}
          >
            <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
            Check All
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2"
          >
            <Plus size={14} />
            Add Site
          </button>
        </div>
      </div>

      {/* Status summary */}
      {lastChecked > 0 && (
        <div className="flex items-center gap-4 text-xs" style={{ color: "var(--color-muted)" }}>
          <span className="flex items-center gap-1">
            <CheckCircle2 size={11} style={{ color: "var(--color-green)" }} />
            {Object.values(statuses).filter((s) => s !== "loading" && (s as SiteStatus).ok).length} up
          </span>
          <span className="flex items-center gap-1">
            <XCircle size={11} style={{ color: "var(--color-red)" }} />
            {Object.values(statuses).filter((s) => s !== "loading" && !(s as SiteStatus).ok).length} down
          </span>
          <span style={{ color: "var(--color-muted)" }}>· {lastChecked}/{allSites.length} checked</span>
        </div>
      )}

      {/* Site list */}
      <div className="glass-card overflow-hidden">
        <div
          className="grid text-[11px] font-semibold uppercase tracking-wider px-4 py-2.5"
          style={{
            color: "var(--color-muted)",
            borderBottom: "1px solid var(--color-border)",
            gridTemplateColumns: "auto 1fr 140px 90px 80px",
            gap: "12px",
          }}
        >
          <span className="w-5" />
          <span>Site</span>
          <span>URL</span>
          <span className="text-right">Latency</span>
          <span className="text-right">Actions</span>
        </div>

        {allSites.map((site, i) => {
          const status = statuses[site.id];
          const isDefault = DEFAULT_SITES.some((d) => d.id === site.id);
          const isEditing = editId === site.id;
          const statusData = status && status !== "loading" ? (status as SiteStatus) : null;

          return (
            <div
              key={site.id}
              className="grid items-center px-4 py-3"
              style={{
                gridTemplateColumns: "auto 1fr 140px 90px 80px",
                gap: "12px",
                borderBottom: i < allSites.length - 1 ? "1px solid var(--color-border)" : undefined,
              }}
            >
              {/* Status icon */}
              <StatusDot status={status ?? null} />

              {/* Name / Description */}
              <div className="min-w-0">
                {isEditing ? (
                  <div className="flex flex-col gap-1.5">
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Name"
                      className="glass-input px-2 py-1 text-xs w-full"
                    />
                    <input
                      value={editForm.url}
                      onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
                      placeholder="URL"
                      className="glass-input px-2 py-1 text-xs w-full"
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
                      {site.name}
                    </p>
                    {site.description && (
                      <p className="text-[11px] truncate" style={{ color: "var(--color-muted)" }}>
                        {site.description}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* URL */}
              <div className="truncate text-[11px]" style={{ color: "var(--color-muted)" }}>
                {site.url.replace(/^https?:\/\//, "")}
              </div>

              {/* Latency */}
              <div className="text-right text-[11px]" style={{ color: statusData?.ok ? "var(--color-green)" : "var(--color-muted)" }}>
                {status === "loading"
                  ? "…"
                  : statusData?.latencyMs != null
                  ? `${statusData.latencyMs}ms`
                  : statusData
                  ? "—"
                  : "—"}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => saveEdit(site.id)}
                      className="p-1.5 rounded hover:bg-[var(--color-border)] transition-colors"
                      title="Save"
                    >
                      <Check size={12} style={{ color: "var(--color-green)" }} />
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="p-1.5 rounded hover:bg-[var(--color-border)] transition-colors"
                      title="Cancel"
                    >
                      <X size={12} style={{ color: "var(--color-muted)" }} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => checkSite(site)}
                      className="p-1.5 rounded hover:bg-[var(--color-border)] transition-colors"
                      title="Check now"
                    >
                      <RefreshCw size={11} style={{ color: "var(--color-muted)" }} />
                    </button>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-[var(--color-border)] transition-colors"
                      title="Open"
                    >
                      <ExternalLink size={11} style={{ color: "var(--color-muted)" }} />
                    </a>
                    {!isDefault && (
                      <>
                        <button
                          onClick={() => { setEditId(site.id); setEditForm({ name: site.name, url: site.url, description: site.description || "" }); }}
                          className="p-1.5 rounded hover:bg-[var(--color-border)] transition-colors"
                          title="Edit"
                        >
                          <Pencil size={11} style={{ color: "var(--color-muted)" }} />
                        </button>
                        <button
                          onClick={() => removeSite(site.id)}
                          className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                          title="Remove"
                        >
                          <X size={11} className="text-red-400/60 hover:text-red-400" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add site modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowAdd(false)}
        >
          <div
            className="glass-card p-6 animate-fade-in"
            style={{ width: "min(420px, calc(100vw - 2rem))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-base" style={{ color: "var(--color-text)" }}>Add Website</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { label: "Name", key: "name", placeholder: "My Client Site" },
                { label: "URL", key: "url", placeholder: "https://example.com" },
                { label: "Description (optional)", key: "description", placeholder: "What this site is for" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--color-muted)" }}>{label}</label>
                  <input
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    onKeyDown={(e) => e.key === "Enter" && addSite()}
                    className="glass-input w-full px-3 py-2 text-sm"
                    style={{ color: "var(--color-text)" }}
                  />
                </div>
              ))}

              <button
                onClick={addSite}
                disabled={!form.name.trim() || !form.url.trim()}
                className="btn-primary flex items-center justify-center gap-2 py-2.5 mt-1"
              >
                <Globe size={14} />
                Add Site
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info note */}
      <div className="flex items-start gap-2 text-xs" style={{ color: "var(--color-muted)" }}>
        <AlertCircle size={12} className="mt-0.5 shrink-0" />
        <span>
          Health checks are performed via the server. Default sites reflect your VPS stack.
          Custom sites are saved locally in your browser.
        </span>
      </div>
    </div>
  );
}
