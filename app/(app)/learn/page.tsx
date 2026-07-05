"use client";

import { useState, useEffect } from "react";
import { BookOpen, Plus, Loader2, Brain, Send, CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

type Note = { id: string; title: string; content: string; category: string; inBrain: boolean; createdAt: string };

const CERT_LEVELS = [
  { id: "priority",    label: "Priority",    color: "#e05252" },
  { id: "in_progress", label: "In Progress", color: "var(--color-accent)" },
  { id: "completed",   label: "Completed",   color: "var(--color-green)" },
  { id: "exploring",   label: "Exploring",   color: "var(--color-muted)" },
];

const SUGGESTED_CERTS = [
  { name: "AWS Cloud Practitioner",        area: "Cloud",          link: "https://aws.amazon.com/certification/certified-cloud-practitioner/" },
  { name: "Docker & Kubernetes (KodeKloud)", area: "DevOps",       link: "https://kodekloud.com" },
  { name: "PostgreSQL for Developers",      area: "Database",      link: "https://www.postgresql.org/docs/" },
  { name: "TypeScript Advanced Patterns",   area: "TypeScript",    link: "https://www.typescriptlang.org/docs/" },
  { name: "Next.js App Router Mastery",     area: "Next.js",       link: "https://nextjs.org/learn" },
  { name: "Vector Databases & RAG",         area: "AI/ML",         link: "https://learn.deeplearning.ai" },
];

export default function LearnPage() {
  const [notes, setNotes]   = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [ingesting, setIngesting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [showAddTopic, setShowAddTopic] = useState(false);
  const [newTitle, setNewTitle]   = useState("");
  const [newContent, setNewContent] = useState("");

  useEffect(() => { loadNotes(); }, []);

  async function loadNotes() {
    setLoading(true);
    try {
      const res = await fetch("/api/notes");
      if (res.ok) {
        const all = await res.json() as Note[];
        setNotes(all.filter((n) => n.category === "education"));
      }
    } finally { setLoading(false); }
  }

  async function handleSaveTopic() {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, content: newContent, category: "education" }),
      });
      if (res.ok) {
        const note = await res.json() as Note;
        setNotes((prev) => [note, ...prev]);
        setNewTitle("");
        setNewContent("");
        setShowAddTopic(false);
      }
    } finally { setSaving(false); }
  }

  async function handleSendToBrain(note: Note) {
    setIngesting(note.id);
    try {
      await fetch(`/api/notes/${note.id}/brain`, { method: "POST" });
      setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, inBrain: true } : n));
    } finally { setIngesting(null); }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
          <BookOpen size={18} style={{ color: "var(--color-accent)" }} />
          Learning Tracker
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddTopic((p) => !p)}
            className="btn-primary flex items-center gap-2 py-1.5 px-3 text-sm"
          >
            <Plus size={13} /> Add Topic
          </button>
          <Link href="/chat" className="flex items-center gap-2 py-1.5 px-3 text-sm rounded-lg" style={{ color: "var(--color-accent)", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <Send size={13} /> Ask Education Team
          </Link>
        </div>
      </div>
      <p className="text-[13px] mb-6" style={{ color: "var(--color-muted)" }}>
        Track what you&apos;re learning. Dump study notes, topics, goals. The Education team uses your Brain to suggest resources and quiz you.
      </p>

      {/* Add topic form */}
      {showAddTopic && (
        <div className="glass-card p-5 mb-5">
          <p className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>Add Study Topic</p>
          <input
            className="w-full mb-2 px-3 py-2 rounded-lg text-sm"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
            placeholder="Topic name (e.g. pgvector, AWS Cloud, TypeScript generics)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <textarea
            className="w-full px-3 py-2 rounded-lg text-sm mb-3 resize-none"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)", minHeight: 90 }}
            placeholder="What you want to learn about this topic, why it matters for your work, what you already know..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={handleSaveTopic} disabled={saving || !newTitle.trim() || !newContent.trim()} className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Save
            </button>
            <button onClick={() => setShowAddTopic(false)} className="text-sm px-3 py-1.5 rounded-lg" style={{ color: "var(--color-muted)", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Study topics */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-muted)" }}>Your Study Topics</p>
        {loading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-muted)" }}><Loader2 size={14} className="animate-spin" /> Loading…</div>
        ) : notes.length === 0 ? (
          <div className="glass-card p-6 text-center">
            <BookOpen size={28} className="mx-auto mb-2" style={{ color: "var(--color-muted)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>No topics yet</p>
            <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>
              Add topics you want to study. The Education team will research them and create notes in Brain.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notes.map((note) => (
              <div key={note.id} className="glass-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{note.title}</p>
                      {note.inBrain && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--color-green)22", color: "var(--color-green)" }}>In Brain</span>
                      )}
                    </div>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--color-muted)" }}>{new Date(note.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!note.inBrain && (
                      <button onClick={() => handleSendToBrain(note)} title="Send to Brain" className="p-1.5 rounded-lg" style={{ color: "var(--color-muted)" }}>
                        {ingesting === note.id ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                      </button>
                    )}
                    <button onClick={() => toggleExpand(note.id)} className="p-1.5 rounded-lg" style={{ color: "var(--color-muted)" }}>
                      {expanded.has(note.id) ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>
                {expanded.has(note.id) && (
                  <p className="mt-3 pt-3 text-[13px] whitespace-pre-wrap" style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                    {note.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested certifications */}
      <div className="glass-card p-5">
        <p className="text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>Suggested Certifications</p>
        <p className="text-[12px] mb-4" style={{ color: "var(--color-muted)" }}>
          Based on your stack and target roles. Ask the Education team to research any of these.
        </p>
        <div className="flex flex-col gap-2">
          {SUGGESTED_CERTS.map((cert) => (
            <div key={cert.name} className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <div className="flex items-center gap-2">
                <Circle size={13} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
                <div>
                  <p className="text-[13px]" style={{ color: "var(--color-text)" }}>{cert.name}</p>
                  <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>{cert.area}</p>
                </div>
              </div>
              <a href={cert.link} target="_blank" rel="noopener noreferrer" className="text-[11px] underline" style={{ color: "var(--color-accent)", flexShrink: 0 }}>
                View
              </a>
            </div>
          ))}
        </div>
        <p className="text-[12px] mt-4" style={{ color: "var(--color-muted)" }}>
          In Chat, ask: <em>&ldquo;Education team, research [certification name] and tell me if it&apos;s worth doing for my goals.&rdquo;</em>
        </p>
      </div>
    </div>
  );
}
