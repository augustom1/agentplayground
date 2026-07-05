"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Check, Trash2, Save, Upload } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

type PlaygroundData = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  teamIds: string[];
  brainTags: string[];
};

type TeamItem = { id: string; name: string };

const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
  textTransform: "uppercase", color: "var(--color-muted)",
  marginBottom: 6, display: "block",
};

export default function PlaygroundSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();

  const [playground, setPlayground] = useState<PlaygroundData | null>(null);
  const [allTeams, setAllTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [importing, setImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [brainTagsInput, setBrainTagsInput] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [pgRes, teamsRes] = await Promise.all([
        fetch(`/api/playgrounds/${id}`),
        fetch("/api/teams"),
      ]);
      if (!pgRes.ok) return;
      const pg = await pgRes.json() as PlaygroundData;
      setPlayground(pg);
      setName(pg.name);
      setIcon(pg.icon ?? "");
      setColor(pg.color ?? "");
      setSelectedTeams(new Set(pg.teamIds));
      setBrainTagsInput(pg.brainTags.join(", "));

      const teams = teamsRes.ok ? await teamsRes.json() as (TeamItem & { isSystemTeam?: boolean })[] : [];
      setAllTeams(teams.filter(t => !t.isSystemTeam).map(t => ({ id: t.id, name: t.name })));
    } catch { /* non-fatal */ } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!name.trim() || !playground) return;
    setSaving(true);
    try {
      const brainTags = brainTagsInput
        .split(",")
        .map(t => t.trim())
        .filter(Boolean);

      const res = await fetch(`/api/playgrounds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          icon: icon.trim() || null,
          color: color.trim() || null,
          teamIds: [...selectedTeams],
          brainTags,
        }),
      });
      if (!res.ok) throw new Error();
      addToast("Playground saved", "success");
    } catch {
      addToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const deletePlayground = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/playgrounds/${id}`, { method: "DELETE" });
      router.push("/chat");
    } catch {
      addToast("Failed to delete", "error");
      setDeleting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".zip")) { addToast("Please select a .zip file", "error"); return; }
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/library/install", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Import failed" })) as { error?: string };
        addToast(err.error ?? "Import failed", "error");
      } else {
        addToast("Playground package imported", "success");
        router.push(`/playground/${id}`);
      }
    } catch {
      addToast("Import failed", "error");
    } finally {
      setImporting(false);
      if (importFileRef.current) importFileRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: 8, color: "var(--color-muted)" }}>
        <Loader2 size={16} className="animate-spin" />
        <span style={{ fontSize: 13 }}>Loading…</span>
      </div>
    );
  }

  if (!playground) {
    return <div style={{ padding: 32, color: "var(--color-muted)", fontSize: 14 }}>Playground not found.</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 560 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", margin: "0 0 24px" }}>
        Playground Settings
      </h2>

      {/* Identity */}
      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 14px" }}>
          Identity
        </h3>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={LABEL}>Icon</label>
            <input
              value={icon}
              onChange={e => setIcon(e.target.value)}
              placeholder="emoji"
              maxLength={2}
              style={{
                width: 52, padding: "7px 6px", borderRadius: 8, fontSize: 20, textAlign: "center",
                background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                color: "var(--color-text)", outline: "none",
              }}
            />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={LABEL}>Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Playground name"
              style={{
                padding: "7px 10px", borderRadius: 8, fontSize: 14,
                background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                color: "var(--color-text)", outline: "none",
              }}
            />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={LABEL}>Accent color (hex, optional)</label>
          <input
            value={color}
            onChange={e => setColor(e.target.value)}
            placeholder="#38BDF8"
            style={{
              padding: "7px 10px", borderRadius: 8, fontSize: 13, width: 160,
              background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
              color: "var(--color-text)", outline: "none",
            }}
          />
        </div>
      </section>

      {/* Teams */}
      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 14px" }}>
          Teams
        </h3>
        {allTeams.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>No teams available.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
            {allTeams.map(team => {
              const sel = selectedTeams.has(team.id);
              return (
                <label
                  key={team.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: 8, cursor: "pointer",
                    background: sel ? "var(--color-surface-3)" : "var(--color-surface-2)",
                    border: `1px solid ${sel ? "var(--color-brand)" : "var(--color-border)"}`,
                    fontSize: 13, color: "var(--color-text)", transition: "background 0.1s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => setSelectedTeams(prev => {
                      const next = new Set(prev);
                      next.has(team.id) ? next.delete(team.id) : next.add(team.id);
                      return next;
                    })}
                    style={{ accentColor: "var(--color-brand)" }}
                  />
                  {team.name}
                  {sel && <Check size={12} style={{ color: "var(--color-brand)", marginLeft: "auto" }} />}
                </label>
              );
            })}
          </div>
        )}
      </section>

      {/* Brain tags */}
      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
          Brain tags
        </h3>
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "0 0 10px" }}>
          Comma-separated tags. Brain documents matching any of these tags will appear in this playground&apos;s Brain view.
        </p>
        <input
          value={brainTagsInput}
          onChange={e => setBrainTagsInput(e.target.value)}
          placeholder="dev, code, backend"
          style={{
            width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13,
            background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
            color: "var(--color-text)", outline: "none", boxSizing: "border-box",
          }}
        />
      </section>

      {/* Import */}
      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--color-muted)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
          Import
        </h3>
        <p style={{ fontSize: 12, color: "var(--color-muted)", margin: "0 0 12px" }}>
          Import a Playground package downloaded from the Library (.zip file).
        </p>
        <input
          ref={importFileRef}
          type="file"
          accept=".zip"
          onChange={handleImport}
          style={{ display: "none" }}
          id="pg-import-file"
        />
        <button
          onClick={() => importFileRef.current?.click()}
          disabled={importing}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "transparent", cursor: importing ? "not-allowed" : "pointer",
            fontSize: 13, color: "var(--color-text-secondary)",
            opacity: importing ? 0.6 : 1,
          }}
        >
          {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {importing ? "Importing…" : "Choose package (.zip)"}
        </button>
      </section>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)",
            background: "transparent", cursor: "pointer", fontSize: 13, color: "#ef4444",
          }}
        >
          <Trash2 size={13} /> Delete playground
        </button>
        <button
          onClick={save}
          disabled={saving || !name.trim()}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 18px", borderRadius: 8, border: "none",
            background: "var(--color-brand)", color: "#0a1628",
            cursor: saving || !name.trim() ? "not-allowed" : "pointer",
            fontSize: 13, fontWeight: 600,
            opacity: !name.trim() ? 0.5 : 1,
          }}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save changes
        </button>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16, background: "rgba(0,0,0,0.65)",
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
        >
          <div
            style={{
              width: "100%", maxWidth: 380, borderRadius: 14, padding: 24,
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              display: "flex", flexDirection: "column", gap: 16,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
              Delete &ldquo;{playground.name}&rdquo;?
            </h3>
            <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
              The playground will be deleted. Teams inside it won&apos;t be affected.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}
              >
                Cancel
              </button>
              <button
                onClick={deletePlayground}
                disabled={deleting}
                style={{
                  padding: "7px 16px", borderRadius: 8, border: "none",
                  background: "#ef4444", color: "#fff",
                  cursor: "pointer", fontSize: 13, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
