"use client";

import { useEffect, useState } from "react";
import { Plus, Copy, Trash2, ExternalLink, Check, Link2 } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

type RedirectLink = {
  id: string; code: string; url: string; label: string | null;
  clicks: number; active: boolean; createdAt: string;
};

export default function RedirectAppPage() {
  const { addToast } = useToast();
  const [links, setLinks] = useState<RedirectLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  useEffect(() => {
    fetch("/api/redirect-links")
      .then(r => r.ok ? r.json() : [])
      .then((d: unknown) => { if (Array.isArray(d)) setLinks(d as RedirectLink[]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function create() {
    if (!url.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/redirect-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), label: label.trim() || undefined, code: code.trim() || undefined }),
      });
      if (!res.ok) { addToast(await res.text() || "Could not create link", "error"); return; }
      const link = await res.json() as RedirectLink;
      setLinks(p => [link, ...p]);
      setLabel(""); setUrl(""); setCode("");
      addToast("Redirect link created", "info");
    } catch { addToast("Could not create link", "error"); }
    finally { setSaving(false); }
  }

  function copy(c: string) {
    const full = `${origin}/r/${c}`;
    navigator.clipboard.writeText(full).then(() => {
      setCopied(c); setTimeout(() => setCopied(null), 1500);
    }).catch(() => {});
  }

  async function toggle(link: RedirectLink) {
    const res = await fetch(`/api/redirect-links/${link.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !link.active }),
    });
    if (res.ok) { const u = await res.json() as RedirectLink; setLinks(p => p.map(l => l.id === u.id ? u : l)); }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/redirect-links/${id}`, { method: "DELETE" });
    if (res.ok) setLinks(p => p.filter(l => l.id !== id));
  }

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 8, fontSize: 14,
    background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
    color: "var(--color-text)", outline: "none", width: "100%",
  };

  return (
    <div className="mx-auto w-full" style={{ maxWidth: 820, padding: "28px 20px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Link2 size={20} style={{ color: "var(--color-brand)" }} />
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--color-text)", margin: 0 }}>Redirect</h1>
      </div>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 24px", lineHeight: 1.6 }}>
        Turn a short code into a jump to anywhere — a Google Meet, a phone call, a video, or another page.
        Share <code style={{ color: "var(--color-text)" }}>{origin || "…"}/r/&lt;code&gt;</code> and anyone who opens it
        lands on the destination. Handy for showing a playground&apos;s apps and features from one launcher.
      </p>

      {/* Create form */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 12, padding: 18, marginBottom: 28,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Name (optional) — e.g. Demo call" style={inputStyle} />
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="Custom code (optional)" style={inputStyle} />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") create(); }}
            placeholder="Destination URL — https://meet.google.com/… , tel:+1… , https://…"
            style={inputStyle}
          />
          <button
            onClick={create}
            disabled={!url.trim() || saving}
            style={{
              display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
              padding: "9px 16px", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 600,
              cursor: url.trim() && !saving ? "pointer" : "not-allowed",
              background: url.trim() && !saving ? "var(--color-brand)" : "var(--color-surface-3)",
              color: url.trim() && !saving ? "#0a1628" : "var(--color-muted)",
            }}
          >
            <Plus size={15} /> Create
          </button>
        </div>
      </div>

      {/* Links list */}
      {loading ? (
        <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Loading…</p>
      ) : links.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--color-muted)" }}>No redirect links yet. Create your first one above.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {links.map(link => (
            <div key={link.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              borderRadius: 10, padding: "12px 14px", opacity: link.active ? 1 : 0.55,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
                    {link.label || link.code}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--color-muted)" }}>/r/{link.code}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                  {link.url}
                </div>
              </div>
              <span style={{ fontSize: 12, color: "var(--color-muted)", flexShrink: 0 }}>{link.clicks} clicks</span>
              <button onClick={() => copy(link.code)} title="Copy link" style={iconBtn}>
                {copied === link.code ? <Check size={15} style={{ color: "var(--color-green)" }} /> : <Copy size={15} />}
              </button>
              <a href={`/r/${link.code}`} target="_blank" rel="noreferrer" title="Open" style={{ ...iconBtn, textDecoration: "none" }}>
                <ExternalLink size={15} />
              </a>
              <button onClick={() => toggle(link)} title={link.active ? "Disable" : "Enable"}
                style={{ ...iconBtn, fontSize: 11, width: "auto", padding: "0 8px", color: "var(--color-text-secondary)" }}>
                {link.active ? "On" : "Off"}
              </button>
              <button onClick={() => remove(link.id)} title="Delete" style={iconBtn}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 30, height: 30, borderRadius: 7, border: "none",
  background: "transparent", cursor: "pointer", color: "var(--color-muted)", flexShrink: 0,
};
