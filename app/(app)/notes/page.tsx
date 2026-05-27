"use client";

import { useState, useEffect } from "react";
import {
  StickyNote, Plus, Trash2, Loader2, Brain, Tag,
  ChevronDown, ChevronUp, Send,
} from "lucide-react";

type NoteCategory = "cv" | "business" | "education" | "finance" | "fitness" | "personal" | "dev";

const CATEGORY_LABELS: Record<NoteCategory, string> = {
  cv:        "CV / Career",
  business:  "Business",
  education: "Education",
  finance:   "Finance",
  fitness:   "Fitness",
  personal:  "Personal",
  dev:       "Dev / Code",
};

const CATEGORY_COLORS: Record<NoteCategory, string> = {
  cv:        "#D4715A",
  business:  "#6b8cff",
  education: "#5cb85c",
  finance:   "#f0ad4e",
  fitness:   "#5bc0de",
  personal:  "#9b59b6",
  dev:       "#95a5a6",
};

type Note = {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  inBrain: boolean;
  createdAt: string;
};

export default function NotesPage() {
  const [notes, setNotes]     = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // New note form
  const [showForm, setShowForm]     = useState(false);
  const [title, setTitle]           = useState("");
  const [content, setContent]       = useState("");
  const [category, setCategory]     = useState<NoteCategory>("personal");
  const [savingNote, setSavingNote] = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  // Brain ingestion
  const [ingesting, setIngesting] = useState<string | null>(null);

  // Expanded notes
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { loadNotes(); }, []);

  async function loadNotes() {
    setLoading(true);
    try {
      const res = await fetch("/api/notes");
      if (res.ok) {
        const data = await res.json() as Note[];
        setNotes(data);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  async function handleSaveNote() {
    if (!title.trim() || !content.trim()) return;
    setSavingNote(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category }),
      });
      const data = await res.json() as Note | { error: string };
      if (!res.ok) throw new Error("error" in data ? data.error : "Save failed");
      setNotes((prev) => [data as Note, ...prev]);
      setTitle("");
      setContent("");
      setCategory("personal");
      setShowForm(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleSendToBrain(note: Note) {
    setIngesting(note.id);
    try {
      await fetch(`/api/notes/${note.id}/brain`, { method: "POST" });
      setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, inBrain: true } : n));
    } catch { /* silent */ }
    finally { setIngesting(null); }
  }

  async function handleDelete(noteId: string) {
    await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>Notes & Context</h1>
        <button
          onClick={() => { setShowForm((p) => !p); setCreating(!showForm); }}
          className="btn-primary flex items-center gap-2 py-1.5 px-3 text-sm"
        >
          <Plus size={14} /> New Note
        </button>
      </div>
      <p className="text-[13px] mb-6" style={{ color: "var(--color-muted)" }}>
        Dump context here — CV info, business goals, study topics, expenses. Notes stored in Brain feed your agent teams.
      </p>

      {/* Create form */}
      {showForm && (
        <div className="glass-card p-5 mb-5">
          <p className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>New Note</p>

          <input
            className="w-full mb-3 px-3 py-2 rounded-lg text-sm"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="flex gap-2 mb-3 flex-wrap">
            {(Object.keys(CATEGORY_LABELS) as NoteCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="px-2.5 py-1 rounded-full text-[12px] transition-all"
                style={{
                  background: category === cat ? CATEGORY_COLORS[cat] + "22" : "var(--color-surface)",
                  border: `1px solid ${category === cat ? CATEGORY_COLORS[cat] : "var(--color-border)"}`,
                  color: category === cat ? CATEGORY_COLORS[cat] : "var(--color-muted)",
                }}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <textarea
            className="w-full px-3 py-2 rounded-lg text-sm mb-3 resize-none"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)", minHeight: 120 }}
            placeholder={`Write your ${CATEGORY_LABELS[category]} note here…\n\nExamples:\n- CV: "I worked at X for 3 years as a senior dev, built Y, reduced Z by 40%"\n- Business: "Target market is SMBs, pricing should be $49/mo, USP is..."\n- Education: "I want to learn TypeScript generics, pgvector, and React Server Components"`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveNote}
              disabled={savingNote || !title.trim() || !content.trim()}
              className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
            >
              {savingNote ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><StickyNote size={14} /> Save Note</>}
            </button>
            <button
              onClick={() => { setShowForm(false); setSaveError(null); }}
              className="text-sm px-3 py-2 rounded-lg"
              style={{ color: "var(--color-muted)", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              Cancel
            </button>
          </div>
          {saveError && <p className="text-[12px] mt-2" style={{ color: "var(--color-red)" }}>{saveError}</p>}
        </div>
      )}

      {/* Notes list */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-muted)" }}>
          <Loader2 size={14} className="animate-spin" /> Loading notes…
        </div>
      ) : notes.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <StickyNote size={32} className="mx-auto mb-3" style={{ color: "var(--color-muted)" }} />
          <p className="text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>No notes yet</p>
          <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>
            Create your first note — dump your CV, business goals, or study topics for your agents to use.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => {
            const isExpanded = expanded.has(note.id);
            return (
              <div key={note.id} className="glass-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Tag size={14} style={{ color: CATEGORY_COLORS[note.category], marginTop: 3, flexShrink: 0 }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>{note.title}</p>
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: CATEGORY_COLORS[note.category] + "22", color: CATEGORY_COLORS[note.category] }}
                        >
                          {CATEGORY_LABELS[note.category]}
                        </span>
                        {note.inBrain && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--color-green)22", color: "var(--color-green)" }}>
                            In Brain
                          </span>
                        )}
                      </div>
                      <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                        {new Date(note.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!note.inBrain && (
                      <button
                        onClick={() => handleSendToBrain(note)}
                        title="Send to Brain"
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: "var(--color-muted)", background: "transparent" }}
                        disabled={ingesting === note.id}
                      >
                        {ingesting === note.id ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
                      </button>
                    )}
                    <button
                      onClick={() => toggleExpand(note.id)}
                      className="p-1.5 rounded-lg"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1.5 rounded-lg"
                      style={{ color: "var(--color-muted)" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div
                    className="mt-3 pt-3 text-[13px] whitespace-pre-wrap"
                    style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                  >
                    {note.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tip */}
      <div className="mt-6 p-4 rounded-lg" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-start gap-2">
          <Send size={14} style={{ color: "var(--color-accent)", marginTop: 2, flexShrink: 0 }} />
          <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>
            <strong style={{ color: "var(--color-text)" }}>Tip:</strong> After saving a note, click the Brain icon to index it for agent context.
            Then go to Chat and ask the coordinator to work on it — e.g.{" "}
            <em>&ldquo;I just added my CV info to the Brain, can the CV Advisory team refine it?&rdquo;</em>
          </p>
        </div>
      </div>
    </div>
  );
}
