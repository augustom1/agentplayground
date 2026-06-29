"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { BookOpen, Upload, Loader2, FileText, Tag } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

type PlaygroundData = {
  id: string;
  name: string;
  icon: string | null;
  brainTags: string[];
};

type VaultNote = {
  path: string;
  title: string;
  tags: string[];
  updatedAt: string;
  content: string;
};

type UploadState = { title: string; content: string; uploading: boolean; open: boolean };

export default function PlaygroundBrainPage() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();

  const [playground, setPlayground] = useState<PlaygroundData | null>(null);
  const [notes, setNotes] = useState<VaultNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [upload, setUpload] = useState<UploadState>({
    title: "", content: "", uploading: false, open: false,
  });

  useEffect(() => {
    if (!id) return;
    fetch(`/api/playgrounds/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(async (pg: PlaygroundData | null) => {
        if (!pg) return;
        setPlayground(pg);

        if (pg.brainTags.length === 0) {
          setNotes([]);
          setLoading(false);
          return;
        }

        const results = await Promise.all(
          pg.brainTags.map(tag =>
            fetch(`/api/brain/notes?tag=${encodeURIComponent(tag)}&limit=50`)
              .then(r => r.ok ? r.json() : { notes: [] })
              .then((data: { notes: VaultNote[] }) => data.notes)
          )
        );

        const seen = new Set<string>();
        const merged: VaultNote[] = [];
        for (const batch of results) {
          for (const note of batch) {
            if (!seen.has(note.path)) {
              seen.add(note.path);
              merged.push(note);
            }
          }
        }
        merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setNotes(merged);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function ingestNote() {
    if (!upload.title.trim() || !upload.content.trim() || !playground) return;
    setUpload(u => ({ ...u, uploading: true }));
    try {
      const res = await fetch("/api/brain/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: upload.title.trim(),
          text: upload.content.trim(),
          tags: playground.brainTags,
        }),
      });
      if (!res.ok) throw new Error();
      addToast("Document added to playground Brain", "success");
      setUpload({ title: "", content: "", uploading: false, open: false });
      // Reload notes
      setLoading(true);
      const results = await Promise.all(
        playground.brainTags.map(tag =>
          fetch(`/api/brain/notes?tag=${encodeURIComponent(tag)}&limit=50`)
            .then(r => r.ok ? r.json() : { notes: [] })
            .then((data: { notes: VaultNote[] }) => data.notes)
        )
      );
      const seen = new Set<string>();
      const merged: VaultNote[] = [];
      for (const batch of results) {
        for (const note of batch) {
          if (!seen.has(note.path)) { seen.add(note.path); merged.push(note); }
        }
      }
      merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setNotes(merged);
      setLoading(false);
    } catch {
      addToast("Failed to add document", "error");
      setUpload(u => ({ ...u, uploading: false }));
    }
  }

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
    <div style={{ padding: "24px", maxWidth: 880 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", margin: "0 0 4px" }}>
            <BookOpen size={16} style={{ display: "inline", marginRight: 8, verticalAlign: "middle", opacity: 0.7 }} />
            Brain
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
            Knowledge scoped to {playground.icon ? `${playground.icon} ` : ""}{playground.name}
            {playground.brainTags.length > 0 && (
              <span style={{ marginLeft: 6 }}>
                · tags: {playground.brainTags.map(t => (
                  <span
                    key={t}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      fontSize: 11, padding: "1px 6px", borderRadius: 4,
                      background: "var(--color-surface-2)", color: "var(--color-text-secondary)",
                      margin: "0 2px",
                    }}
                  >
                    <Tag size={9} />{t}
                  </span>
                ))}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setUpload(u => ({ ...u, open: true }))}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8, border: "none",
            background: "var(--color-brand)", color: "#0a1628",
            cursor: "pointer", fontSize: 13, fontWeight: 600,
            flexShrink: 0,
          }}
        >
          <Upload size={13} /> Add to Brain
        </button>
      </div>

      {/* Notes */}
      {playground.brainTags.length === 0 ? (
        <div
          style={{
            padding: 32, borderRadius: 12, textAlign: "center",
            border: "1px dashed var(--color-border)", background: "var(--color-surface-2)",
          }}
        >
          <BookOpen size={28} style={{ color: "var(--color-muted)", marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", margin: "0 0 6px" }}>
            No Brain tags configured
          </p>
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "0 0 12px" }}>
            Add Brain tags in playground Settings to scope knowledge to {playground.name}.
          </p>
        </div>
      ) : notes.length === 0 ? (
        <div
          style={{
            padding: 32, borderRadius: 12, textAlign: "center",
            border: "1px dashed var(--color-border)", background: "var(--color-surface-2)",
          }}
        >
          <BookOpen size={28} style={{ color: "var(--color-muted)", marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", margin: "0 0 6px" }}>
            No knowledge added to this playground yet
          </p>
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "0 0 12px" }}>
            Upload files to give your agents context specific to {playground.name}.
          </p>
          <button
            onClick={() => setUpload(u => ({ ...u, open: true }))}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, border: "none",
              background: "var(--color-brand)", color: "#0a1628",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            <Upload size={13} /> Add first document
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notes.map(note => (
            <div
              key={note.path}
              style={{
                padding: "14px 16px", borderRadius: 10,
                background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                display: "flex", alignItems: "flex-start", gap: 12,
              }}
            >
              <FileText size={15} style={{ color: "var(--color-muted)", marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", margin: "0 0 3px" }}>
                  {note.title}
                </p>
                <p
                  style={{
                    fontSize: 12, color: "var(--color-muted)", margin: "0 0 6px",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {note.content.slice(0, 120)}…
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {note.tags.map(t => (
                    <span
                      key={t}
                      style={{
                        fontSize: 10, padding: "1px 6px", borderRadius: 4,
                        background: "var(--color-surface-3)", color: "var(--color-muted)",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <span style={{ fontSize: 11, color: "var(--color-muted)", flexShrink: 0 }}>
                {new Date(note.updatedAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {upload.open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16, background: "rgba(0,0,0,0.65)",
          }}
          onClick={e => { if (e.target === e.currentTarget) setUpload(u => ({ ...u, open: false })); }}
        >
          <div
            style={{
              width: "100%", maxWidth: 480, borderRadius: 16, padding: 24,
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              display: "flex", flexDirection: "column", gap: 14,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
              Add to {playground.name}&apos;s Brain
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: "var(--color-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Title</label>
              <input
                value={upload.title}
                onChange={e => setUpload(u => ({ ...u, title: e.target.value }))}
                placeholder="Document title"
                autoFocus
                style={{
                  padding: "7px 10px", borderRadius: 8, fontSize: 13,
                  background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                  color: "var(--color-text)", outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: "var(--color-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Content</label>
              <textarea
                value={upload.content}
                onChange={e => setUpload(u => ({ ...u, content: e.target.value }))}
                placeholder="Paste content, notes, or knowledge here…"
                rows={8}
                style={{
                  padding: "8px 10px", borderRadius: 8, fontSize: 13,
                  background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                  color: "var(--color-text)", outline: "none", resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {playground.brainTags.length > 0 && (
              <p style={{ fontSize: 11, color: "var(--color-muted)", margin: 0 }}>
                Will be tagged: {playground.brainTags.join(", ")}
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setUpload(u => ({ ...u, open: false }))}
                style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}
              >
                Cancel
              </button>
              <button
                onClick={ingestNote}
                disabled={!upload.title.trim() || !upload.content.trim() || upload.uploading}
                style={{
                  padding: "7px 16px", borderRadius: 8, border: "none",
                  background: "var(--color-brand)", color: "#0a1628",
                  cursor: "pointer", fontSize: 13, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6,
                  opacity: !upload.title.trim() || !upload.content.trim() ? 0.5 : 1,
                }}
              >
                {upload.uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                Add to Brain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
