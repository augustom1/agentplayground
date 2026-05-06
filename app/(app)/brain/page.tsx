"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Brain, Search, Plus, FileText, Tag, Upload, X,
  ChevronRight, Save, Trash2, RotateCcw, Network,
  Loader2, FolderOpen, ArrowLeft,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { GraphNode, GraphEdge } from "@/components/KnowledgeGraph";

const KnowledgeGraph = dynamic(() => import("@/components/KnowledgeGraph"), { ssr: false });

type Tab = "notes" | "graph" | "capture" | "search";

interface Note {
  path: string;
  title: string;
  tags: string[];
  updatedAt: string;
  content?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function folderOf(p: string) {
  const parts = p.split("/");
  return parts.length > 1 ? parts[0] : "root";
}

// ── Notes Tab ─────────────────────────────────────────────────────────────────

function NotesTab() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Note | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterFolder, setFilterFolder] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/brain/notes?limit=100${filterFolder ? `&folder=${filterFolder}` : ""}`);
      const d = await r.json();
      setNotes(d.notes || []);
    } finally {
      setLoading(false);
    }
  }, [filterFolder]);

  useEffect(() => { load(); }, [load]);

  async function openNote(note: Note) {
    const r = await fetch(`/api/brain/note?path=${encodeURIComponent(note.path)}`);
    if (r.ok) {
      const d = await r.json();
      setSelected({ ...note, content: d.content });
      setEditContent(d.content);
    }
    setEditing(false);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch("/api/brain/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selected.path, content: editContent }),
      });
      setSelected({ ...selected, content: editContent });
      setEditing(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote() {
    if (!selected) return;
    setDeleting(true);
    try {
      await fetch(`/api/brain/note?path=${encodeURIComponent(selected.path)}`, { method: "DELETE" });
      setSelected(null);
      await load();
    } finally {
      setDeleting(false);
    }
  }

  const folders = Array.from(new Set(notes.map((n) => folderOf(n.path)))).sort();

  if (selected) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {/* Note header */}
        <div className="flex items-center gap-3 px-5 py-3 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <button
            onClick={() => { setSelected(null); setEditing(false); }}
            className="flex items-center gap-1.5 text-[12px] hover:opacity-80 transition-opacity"
            style={{ color: "var(--color-muted)" }}
          >
            <ArrowLeft size={13} /> Notes
          </button>
          <span style={{ color: "var(--color-border)" }}>/</span>
          <span className="text-[13px] font-medium truncate flex-1" style={{ color: "var(--color-text)" }}>
            {selected.title}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {editing ? (
              <>
                <button
                  onClick={() => { setEditing(false); setEditContent(selected.content || ""); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] hover:opacity-80"
                  style={{ color: "var(--color-muted)", background: "var(--color-surface)" }}
                >
                  <RotateCcw size={11} /> Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium hover:opacity-80 disabled:opacity-50"
                  style={{ background: "var(--color-accent)", color: "#000" }}
                >
                  {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                  Save
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium hover:opacity-80"
                  style={{ background: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
                >
                  Edit
                </button>
                <button
                  onClick={deleteNote}
                  disabled={deleting}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] hover:opacity-80 disabled:opacity-50"
                  style={{ color: "var(--color-red)", background: "var(--color-red-dim)" }}
                >
                  {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Note body */}
        <div className="flex-1 min-h-0 overflow-auto p-5">
          {selected.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {selected.tags.map((t) => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                  {t}
                </span>
              ))}
            </div>
          )}
          {editing ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-full min-h-[400px] bg-transparent resize-none outline-none text-sm leading-relaxed font-mono"
              style={{ color: "var(--color-text)" }}
            />
          ) : (
            <pre className="text-sm leading-relaxed whitespace-pre-wrap font-mono"
              style={{ color: "var(--color-text)", fontFamily: "inherit" }}>
              {selected.content}
            </pre>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Folder filter */}
      {folders.length > 1 && (
        <div className="flex items-center gap-2 px-5 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <FolderOpen size={12} style={{ color: "var(--color-muted)" }} />
          <button
            onClick={() => setFilterFolder("")}
            className="text-[11px] px-2 py-0.5 rounded-full transition-all"
            style={{
              background: filterFolder === "" ? "var(--color-accent)" : "transparent",
              color: filterFolder === "" ? "#000" : "var(--color-muted)",
            }}
          >
            All
          </button>
          {folders.map((f) => (
            <button
              key={f}
              onClick={() => setFilterFolder(filterFolder === f ? "" : f)}
              className="text-[11px] px-2 py-0.5 rounded-full transition-all"
              style={{
                background: filterFolder === f ? "var(--color-accent)" : "transparent",
                color: filterFolder === f ? "#000" : "var(--color-muted)",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Notes list */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--color-muted)" }} />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <FileText size={28} style={{ color: "var(--color-border)" }} />
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>No notes yet — use Capture to add your first</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {notes.map((note) => (
              <button
                key={note.path}
                onClick={() => openNote(note)}
                className="w-full text-left px-5 py-3 flex items-start gap-3 hover:opacity-80 transition-opacity"
              >
                <FileText size={14} className="mt-0.5 shrink-0" style={{ color: "var(--color-muted)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>{note.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>{folderOf(note.path)}</span>
                    {note.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[10px]" style={{ color: "#a78bfa" }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>{timeAgo(note.updatedAt)}</span>
                  <ChevronRight size={12} style={{ color: "var(--color-border)" }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Graph Tab ─────────────────────────────────────────────────────────────────

function GraphTab() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/brain/graph")
      .then((r) => r.json())
      .then((d) => { setNodes(d.nodes || []); setEdges(d.edges || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col relative">
      {selectedNode && (
        <div
          className="absolute top-3 left-3 z-10 glass-card px-3 py-2 flex items-center gap-2 max-w-xs"
        >
          <FileText size={12} style={{ color: "var(--color-muted)" }} />
          <span className="text-[11px] truncate" style={{ color: "var(--color-text)" }}>{selectedNode}</span>
          <button onClick={() => setSelectedNode(null)} className="shrink-0 hover:opacity-70">
            <X size={12} style={{ color: "var(--color-muted)" }} />
          </button>
        </div>
      )}
      <KnowledgeGraph
        nodes={nodes}
        edges={edges}
        loading={loading}
        onClickNode={(id) => setSelectedNode(id)}
      />
    </div>
  );
}

// ── Capture Tab ───────────────────────────────────────────────────────────────

function CaptureTab() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [folder, setFolder] = useState("inbox");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const t = raw.trim().replace(/^#+/, "").trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function onTagKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
  }

  async function handleFile(file: File) {
    const text = await file.text();
    const name = file.name.replace(/\.(md|txt|json)$/, "");
    setTitle((prev) => prev || name);
    setContent((prev) => prev + (prev ? "\n\n" : "") + text);
  }

  async function submit() {
    if (!title.trim() || !content.trim()) { setError("Title and content are required."); return; }
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/brain/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), text: content.trim(), tags, folder }),
      });
      if (!r.ok) throw new Error("Failed to save");
      setSaved(true);
      setTitle(""); setContent(""); setTags([]); setTagInput(""); setFolder("inbox");
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto p-5 max-w-2xl w-full mx-auto">
      <div className="flex flex-col gap-4">
        {/* Title + Folder row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={{ color: "var(--color-muted)" }}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title…"
              className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={{ color: "var(--color-muted)" }}>Folder</label>
            <select
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm bg-transparent outline-none cursor-pointer"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-surface)" }}
            >
              {["inbox", "Personal", "Business", "Education", "Resources"].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={{ color: "var(--color-muted)" }}>Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write markdown here, paste text, or upload a file below…"
            rows={10}
            className="w-full px-3 py-2 rounded-lg text-sm font-mono bg-transparent resize-y outline-none"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", minHeight: 180 }}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={{ color: "var(--color-muted)" }}>Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                #{t}
                <button onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:opacity-70">
                  <X size={9} />
                </button>
              </span>
            ))}
          </div>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={onTagKey}
            placeholder="Add tag, press Enter…"
            className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}
          />
        </div>

        {/* File upload */}
        <div>
          <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={{ color: "var(--color-muted)" }}>Upload file (.md / .txt / .json)</label>
          <input ref={fileRef} type="file" accept=".md,.txt,.json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] hover:opacity-80 transition-opacity"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-muted)" }}
          >
            <Upload size={13} /> Choose file…
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-[12px] px-3 py-2 rounded-lg" style={{ background: "var(--color-red-dim)", color: "var(--color-red)" }}>
            {error}
          </p>
        )}

        {/* Save */}
        <button
          onClick={submit}
          disabled={saving}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ background: saved ? "var(--color-green)" : "var(--color-accent)", color: "#000" }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving…" : saved ? "Saved to Brain!" : "Save to Brain"}
        </button>
      </div>
    </div>
  );
}

// ── Search Tab ────────────────────────────────────────────────────────────────

interface SearchResult {
  path: string;
  title: string;
  content: string;
  score?: number;
}

function SearchTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); setSearched(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/brain/search?q=${encodeURIComponent(query)}&topK=10`);
        const d = await r.json();
        setResults(d.results || []);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search input */}
      <div className="px-5 py-3 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-muted)" }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Semantic search across your vault…"
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm bg-transparent outline-none"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}
          />
          {loading && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: "var(--color-muted)" }} />}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 min-h-0 overflow-auto">
        {!searched && !loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Search size={24} style={{ color: "var(--color-border)" }} />
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>Type to search your vault semantically</p>
          </div>
        ) : results.length === 0 && searched ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>No matching notes found</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {results.map((r) => (
              <div key={r.path} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={13} style={{ color: "var(--color-muted)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{r.title}</span>
                  {r.score !== undefined && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                      style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                      {(r.score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono leading-relaxed line-clamp-3" style={{ color: "var(--color-muted)" }}>
                  {r.content}
                </p>
                <p className="text-[10px] mt-1" style={{ color: "var(--color-border)" }}>{r.path}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "notes", label: "Notes", icon: FileText },
  { id: "graph", label: "Graph", icon: Network },
  { id: "capture", label: "Capture", icon: Plus },
  { id: "search", label: "Search", icon: Search },
];

export default function BrainPage() {
  const [tab, setTab] = useState<Tab>("notes");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Brain size={16} style={{ color: "#a78bfa" }} />
        <h1 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>2nd Brain</h1>
        <div className="flex items-center gap-1 ml-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: tab === t.id ? "var(--color-accent)" : "transparent",
                color: tab === t.id ? "#000" : "var(--color-muted)",
              }}
            >
              <t.icon size={12} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {tab === "notes" && <NotesTab />}
        {tab === "graph" && <GraphTab />}
        {tab === "capture" && <CaptureTab />}
        {tab === "search" && <SearchTab />}
      </div>
    </div>
  );
}
