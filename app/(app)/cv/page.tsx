"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Loader2, Brain, Send, User, Briefcase, GraduationCap, Code } from "lucide-react";
import Link from "next/link";

type Note = { id: string; title: string; content: string; category: string; inBrain: boolean; createdAt: string };

const CV_SECTIONS = [
  { key: "cv_summary",    label: "Professional Summary", icon: User,          placeholder: "Your 2–3 sentence professional pitch. Who you are, what you build, what makes you different." },
  { key: "cv_experience", label: "Work Experience",      icon: Briefcase,     placeholder: "Add roles: Company | Role | Dates | Key achievements (STAR format preferred)" },
  { key: "cv_skills",     label: "Technical Skills",     icon: Code,          placeholder: "Add skills: languages, frameworks, tools, platforms. Group by category if helpful." },
  { key: "cv_education",  label: "Education",            icon: GraduationCap, placeholder: "Degree, institution, year. Courses or certifications if relevant." },
];

export default function CVPage() {
  const [notes, setNotes]   = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState<string | null>(null);
  const [ingesting, setIngesting] = useState<string | null>(null);

  const [addingSection, setAddingSection] = useState<string | null>(null);
  const [newContent, setNewContent]       = useState("");

  useEffect(() => { loadNotes(); }, []);

  async function loadNotes() {
    setLoading(true);
    try {
      const res = await fetch("/api/notes");
      if (res.ok) {
        const all = await res.json() as Note[];
        setNotes(all.filter((n) => n.category === "cv"));
      }
    } finally { setLoading(false); }
  }

  async function handleSave(sectionKey: string, sectionLabel: string) {
    if (!newContent.trim()) return;
    setSaving(sectionKey);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: sectionLabel, content: newContent, category: "cv" }),
      });
      if (res.ok) {
        const note = await res.json() as Note;
        setNotes((prev) => [note, ...prev]);
        setNewContent("");
        setAddingSection(null);
      }
    } finally { setSaving(null); }
  }

  async function handleSendToBrain(note: Note) {
    setIngesting(note.id);
    try {
      await fetch(`/api/notes/${note.id}/brain`, { method: "POST" });
      setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, inBrain: true } : n));
    } finally { setIngesting(null); }
  }

  const cvNotesByTitle = (label: string) => notes.filter((n) => n.title === label || n.content.includes(label.toLowerCase()));

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
          <FileText size={18} style={{ color: "var(--color-accent)" }} />
          CV Builder
        </h1>
        <Link
          href="/chat"
          className="btn-primary flex items-center gap-2 py-1.5 px-3 text-sm"
        >
          <Send size={13} /> Ask CV Advisory
        </Link>
      </div>
      <p className="text-[13px] mb-2" style={{ color: "var(--color-muted)" }}>
        Build your CV section by section. Each entry is indexed into Brain so the CV Advisory team can refine it.
      </p>
      <p className="text-[12px] mb-6 p-3 rounded-lg" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-muted)" }}>
        Tip: Add your content here, click Brain to index it, then in Chat say{" "}
        <em>&ldquo;My CV info is in the Brain — CV Writer, please draft a polished CV from it.&rdquo;</em>
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-muted)" }}>
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {CV_SECTIONS.map(({ key, label, icon: Icon, placeholder }) => {
            const sectionNotes = notes.filter((n) => n.title === label);
            const isAdding = addingSection === key;

            return (
              <div key={key} className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon size={15} style={{ color: "var(--color-accent)" }} />
                    <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{label}</p>
                  </div>
                  <button
                    onClick={() => { setAddingSection(isAdding ? null : key); setNewContent(""); }}
                    className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-lg"
                    style={{ color: "var(--color-accent)", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                  >
                    <Plus size={11} /> Add
                  </button>
                </div>

                {isAdding && (
                  <div className="mb-4">
                    <textarea
                      className="w-full px-3 py-2 rounded-lg text-sm resize-none mb-2"
                      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)", minHeight: 100 }}
                      placeholder={placeholder}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(key, label)}
                        disabled={saving === key || !newContent.trim()}
                        className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3"
                      >
                        {saving === key ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                        Save
                      </button>
                      <button
                        onClick={() => { setAddingSection(null); setNewContent(""); }}
                        className="text-sm px-3 py-1.5 rounded-lg"
                        style={{ color: "var(--color-muted)", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {sectionNotes.length === 0 && !isAdding ? (
                  <p className="text-[12px] italic" style={{ color: "var(--color-muted)" }}>
                    No content yet. Click Add to fill in this section.
                  </p>
                ) : (
                  sectionNotes.map((note) => (
                    <div key={note.id} className="p-3 rounded-lg mb-2 text-[13px] whitespace-pre-wrap" style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex-1">{note.content}</p>
                        {!note.inBrain ? (
                          <button
                            onClick={() => handleSendToBrain(note)}
                            disabled={ingesting === note.id}
                            title="Index into Brain"
                            className="p-1 rounded flex-shrink-0"
                            style={{ color: "var(--color-muted)" }}
                          >
                            {ingesting === note.id ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                          </button>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--color-green)22", color: "var(--color-green)" }}>
                            In Brain
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* All CV notes that don't match a specific section */}
      {!loading && notes.filter((n) => !CV_SECTIONS.some((s) => s.label === n.title)).length > 0 && (
        <div className="mt-5 glass-card p-5">
          <p className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>Other CV Notes</p>
          {notes.filter((n) => !CV_SECTIONS.some((s) => s.label === n.title)).map((note) => (
            <div key={note.id} className="p-3 rounded-lg mb-2 text-[13px]" style={{ background: "var(--color-background)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
              <p className="font-medium text-[12px] mb-1" style={{ color: "var(--color-muted)" }}>{note.title}</p>
              <p className="whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
