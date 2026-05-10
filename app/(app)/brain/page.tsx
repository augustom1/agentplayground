"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Brain, Search, Plus, FileText, Upload, X,
  Save, Trash2, RotateCcw, Loader2, FolderOpen,
  ChevronDown, ChevronRight as ChevronRightIcon, Network,
  Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { GraphNode, GraphEdge } from "@/components/KnowledgeGraph";

const KnowledgeGraph = dynamic(() => import("@/components/KnowledgeGraph"), { ssr: false });

interface Note { path: string; title: string; tags: string[]; updatedAt: string; content?: string; }
interface SearchResult { path: string; title: string; content: string; score?: number; }

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "now";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

function folderOf(p: string) {
  const parts = p.split("/");
  return parts.length > 1 ? parts[0] : "root";
}

const FOLDER_ICONS: Record<string, string> = {
  inbox: "📥", Business: "💼", Personal: "👤",
  Education: "📚", Resources: "🔗", plans: "📋",
  Teams: "👥", Projects: "🚀", root: "📄",
};

// ── Capture Form ──────────────────────────────────────────────────────────────
function CaptureForm({ onSaved }: { onSaved: () => void }) {
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
    if (t && !tags.includes(t)) setTags((p) => [...p, t]);
    setTagInput("");
  }

  async function handleFile(file: File) {
    const text = await file.text();
    setTitle((p) => p || file.name.replace(/\.(md|txt|json)$/, ""));
    setContent((p) => p + (p ? "\n\n" : "") + text);
  }

  async function submit() {
    if (!title.trim() || !content.trim()) { setError("Title and content required."); return; }
    setSaving(true); setError(null);
    try {
      const r = await fetch("/api/brain/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), text: content.trim(), tags, folder }),
      });
      if (!r.ok) throw new Error("Failed to save");
      setSaved(true);
      setTitle(""); setContent(""); setTags([]); setTagInput(""); setFolder("inbox");
      setTimeout(() => setSaved(false), 2500);
      onSaved();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5 p-3">
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title…"
          className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-transparent outline-none"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}
        />
        <select
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          className="px-2 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-surface)" }}
        >
          {["inbox", "Personal", "Business", "Education", "Resources", "Projects"].map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Content (markdown)…"
        rows={5}
        className="w-full px-2.5 py-2 rounded-lg text-xs font-mono bg-transparent resize-none outline-none"
        style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}
      />

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>
              #{t}
              <button onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:opacity-70 ml-0.5">
                <X size={8} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
        placeholder="Add tag, press Enter…"
        className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-transparent outline-none"
        style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}
      />

      {/* File + error + save row */}
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept=".md,.txt,.json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] hover:opacity-80"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-muted)" }}
        >
          <Upload size={10} /> File
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50"
          style={{ background: saved ? "var(--color-green)" : "var(--color-accent)", color: "#000" }}
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save to Brain"}
        </button>
      </div>

      {error && (
        <p className="text-[10px] px-2 py-1.5 rounded-lg" style={{ background: "var(--color-red-dim)", color: "var(--color-red)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Note Viewer ───────────────────────────────────────────────────────────────
function NoteViewer({ note, onBack, onUpdate }: { note: Note; onBack: () => void; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/brain/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: note.path, content: editContent }),
      });
      setEditing(false);
      onUpdate();
    } finally { setSaving(false); }
  }

  async function deleteNote() {
    setDeleting(true);
    try {
      await fetch(`/api/brain/note?path=${encodeURIComponent(note.path)}`, { method: "DELETE" });
      onBack();
      onUpdate();
    } finally { setDeleting(false); }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Note header */}
      <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={onBack} className="text-[11px] flex items-center gap-1 hover:opacity-70"
          style={{ color: "var(--color-muted)" }}>
          ← Back
        </button>
        <div className="w-px h-3 mx-1" style={{ background: "var(--color-border)" }} />
        <span className="text-xs font-semibold flex-1 truncate" style={{ color: "var(--color-text)" }}>
          {note.title}
        </span>
        <div className="flex gap-1.5 shrink-0">
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setEditContent(note.content || ""); }}
                className="px-2 py-1 rounded-md text-[10px] hover:opacity-80"
                style={{ color: "var(--color-muted)", background: "var(--color-surface)" }}>
                <RotateCcw size={10} className="inline mr-0.5" />Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="px-2 py-1 rounded-md text-[10px] font-medium hover:opacity-80 disabled:opacity-50"
                style={{ background: "var(--color-accent)", color: "#000" }}>
                {saving ? <Loader2 size={10} className="animate-spin inline" /> : <Save size={10} className="inline mr-0.5" />}
                Save
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)}
                className="px-2 py-1 rounded-md text-[10px] hover:opacity-80"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                Edit
              </button>
              <button onClick={deleteNote} disabled={deleting}
                className="px-2 py-1 rounded-md text-[10px] hover:opacity-80 disabled:opacity-50"
                style={{ color: "var(--color-red)", background: "var(--color-red-dim)" }}>
                {deleting ? <Loader2 size={10} className="animate-spin inline" /> : <Trash2 size={10} className="inline mr-0.5" />}
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-0 shrink-0">
          {note.tags.map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto p-4">
        {editing ? (
          <textarea
            autoFocus
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-full min-h-[300px] bg-transparent resize-none outline-none text-sm leading-relaxed font-mono"
            style={{ color: "var(--color-text)" }}
          />
        ) : (
          <pre className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--color-text)", fontFamily: "inherit" }}>
            {note.content}
          </pre>
        )}
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onCapture }: { onCapture: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4" style={{ color: "var(--color-muted)" }}>
      <div className="flex flex-col items-center gap-3 text-center max-w-xs">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
          <Brain size={22} style={{ color: "#a78bfa" }} />
        </div>
        <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Select a note to read it</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
          Or capture something new — ideas, research, meeting notes — and your agents will remember it.
        </p>
        <button onClick={onCapture}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium mt-1 hover:opacity-90"
          style={{ background: "var(--color-accent)", color: "#000" }}>
          <Plus size={12} /> Capture note
        </button>
      </div>
    </div>
  );
}

// ── Search Results ────────────────────────────────────────────────────────────
function SearchResults({
  query, results, loading, onSelect,
}: {
  query: string; results: SearchResult[]; loading: boolean; onSelect: (r: SearchResult) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 shrink-0 flex items-center gap-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Search size={12} style={{ color: "var(--color-muted)" }} />
        <span className="text-xs" style={{ color: "var(--color-text)" }}>
          {loading ? "Searching…" : `${results.length} results for "${query}"`}
        </span>
        {loading && <Loader2 size={11} className="animate-spin ml-auto" style={{ color: "var(--color-muted)" }} />}
      </div>
      <div className="flex-1 overflow-auto">
        {results.length === 0 && !loading ? (
          <div className="flex items-center justify-center h-24">
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>No results found</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {results.map((r) => (
              <button key={r.path} onClick={() => onSelect(r)}
                className="w-full text-left px-4 py-3 hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-2 mb-0.5">
                  <FileText size={11} style={{ color: "var(--color-muted)" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{r.title}</span>
                  {r.score !== undefined && (
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-mono shrink-0"
                      style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>
                      {(r.score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="text-[10px] leading-relaxed line-clamp-2 ml-[19px]"
                  style={{ color: "var(--color-muted)" }}>
                  {r.content}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BrainPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [selected, setSelected] = useState<Note | null>(null);
  const [filterFolder, setFilterFolder] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(["inbox", "Business"]));

  // Graph state
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [loadingGraph, setLoadingGraph] = useState(true);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const loadNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const r = await fetch(`/api/brain/notes?limit=200${filterFolder ? `&folder=${filterFolder}` : ""}`);
      const d = await r.json();
      setNotes(d.notes || []);
    } finally { setLoadingNotes(false); }
  }, [filterFolder]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  useEffect(() => {
    fetch("/api/brain/graph")
      .then((r) => r.json())
      .then((d) => { setGraphNodes(d.nodes || []); setGraphEdges(d.edges || []); })
      .catch(() => {})
      .finally(() => setLoadingGraph(false));
  }, []);

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/brain/search?q=${encodeURIComponent(searchQuery)}&topK=10`);
        const d = await r.json();
        setSearchResults(d.results || []);
      } finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  async function openNote(note: Note) {
    const r = await fetch(`/api/brain/note?path=${encodeURIComponent(note.path)}`);
    if (r.ok) {
      const d = await r.json();
      setSelected({ ...note, content: d.content });
      setSearchQuery("");
      setShowCapture(false);
    }
  }

  async function openSearchResult(result: SearchResult) {
    const r = await fetch(`/api/brain/note?path=${encodeURIComponent(result.path)}`);
    if (r.ok) {
      const d = await r.json();
      setSelected({ path: result.path, title: result.title, tags: [], updatedAt: new Date().toISOString(), content: d.content });
      setSearchQuery("");
    }
  }

  function handleGraphNodeClick(id: string) {
    const note = notes.find((n) => n.path === id || n.title === id);
    if (note) openNote(note);
  }

  // Group notes by folder
  const byFolder = notes.reduce<Record<string, Note[]>>((acc, n) => {
    const f = folderOf(n.path);
    (acc[f] ??= []).push(n);
    return acc;
  }, {});
  const folders = Object.keys(byFolder).sort();
  const totalNotes = notes.length;

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(167,139,250,0.15)" }}>
            <Brain size={13} style={{ color: "#a78bfa" }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>2nd Brain</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
            style={{ background: "var(--color-surface)", color: "var(--color-muted)", border: "1px solid var(--color-border)" }}>
            {totalNotes}
          </span>
        </div>

        {/* Search bar */}
        <div className="relative flex-1 max-w-sm">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--color-muted)" }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Semantic search…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-transparent outline-none"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}
          />
          {(searching) && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin" style={{ color: "var(--color-muted)" }} />}
          {searchQuery && !searching && (
            <button onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 hover:opacity-70">
              <X size={11} style={{ color: "var(--color-muted)" }} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => { setShowCapture((p) => !p); setSelected(null); setSearchQuery(""); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
            style={{
              background: showCapture ? "var(--color-accent)" : "var(--color-surface)",
              color: showCapture ? "#000" : "var(--color-text)",
              border: showCapture ? "none" : "1px solid var(--color-border)",
            }}
          >
            <Plus size={12} /> Capture
          </button>
        </div>
      </div>

      {/* ── Body: 3 panes ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT: Notes sidebar ── */}
        <div className="flex flex-col shrink-0 overflow-hidden" style={{ width: 240, borderRight: "1px solid var(--color-border)" }}>
          {loadingNotes ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 size={16} className="animate-spin" style={{ color: "var(--color-border)" }} />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-2 px-4 text-center">
              <FileText size={20} style={{ color: "var(--color-border)" }} />
              <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>No notes yet</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto py-1">
              {folders.map((folder) => {
                const isOpen = openFolders.has(folder);
                const folderNotes = byFolder[folder];
                const icon = FOLDER_ICONS[folder] || "📁";
                return (
                  <div key={folder}>
                    {/* Folder header */}
                    <button
                      onClick={() => setOpenFolders((prev) => {
                        const next = new Set(prev);
                        isOpen ? next.delete(folder) : next.add(folder);
                        return next;
                      })}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:opacity-70 transition-opacity"
                    >
                      <span className="text-[11px]">{icon}</span>
                      <span className="text-[11px] font-medium flex-1 text-left" style={{ color: "var(--color-muted)" }}>
                        {folder}
                      </span>
                      <span className="text-[9px] font-mono" style={{ color: "var(--color-border)" }}>
                        {folderNotes.length}
                      </span>
                      {isOpen
                        ? <ChevronDown size={10} style={{ color: "var(--color-border)" }} />
                        : <ChevronRightIcon size={10} style={{ color: "var(--color-border)" }} />
                      }
                    </button>

                    {/* Notes in folder */}
                    {isOpen && folderNotes.map((note) => {
                      const isActive = selected?.path === note.path;
                      return (
                        <button
                          key={note.path}
                          onClick={() => openNote(note)}
                          className="w-full text-left flex items-start gap-2 px-4 py-2 transition-all"
                          style={{
                            background: isActive ? "rgba(167,139,250,0.12)" : "transparent",
                            borderLeft: isActive ? "2px solid #a78bfa" : "2px solid transparent",
                          }}
                        >
                          <FileText size={10} className="mt-0.5 shrink-0" style={{ color: isActive ? "#a78bfa" : "var(--color-muted)" }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium truncate leading-snug"
                              style={{ color: isActive ? "#a78bfa" : "var(--color-text)" }}>
                              {note.title}
                            </p>
                            {note.tags.length > 0 && (
                              <p className="text-[9px] truncate mt-0.5" style={{ color: "var(--color-border)" }}>
                                {note.tags.slice(0, 3).map(t => `#${t}`).join(" ")}
                              </p>
                            )}
                          </div>
                          <span className="text-[9px] shrink-0 mt-0.5" style={{ color: "var(--color-border)" }}>
                            {timeAgo(note.updatedAt)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── CENTER: Content area ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ borderRight: "1px solid var(--color-border)" }}>
          {showCapture ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <Sparkles size={13} style={{ color: "#a78bfa" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Capture to Brain</span>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <div className="max-w-xl mx-auto">
                  <CaptureForm onSaved={() => { loadNotes(); setShowCapture(false); }} />
                </div>
              </div>
            </div>
          ) : isSearching ? (
            <SearchResults
              query={searchQuery}
              results={searchResults}
              loading={searching}
              onSelect={openSearchResult}
            />
          ) : selected ? (
            <NoteViewer
              note={selected}
              onBack={() => setSelected(null)}
              onUpdate={loadNotes}
            />
          ) : (
            <EmptyState onCapture={() => setShowCapture(true)} />
          )}
        </div>

        {/* ── RIGHT: Graph widget ── */}
        <div className="flex flex-col shrink-0 overflow-hidden" style={{ width: 320 }}>
          {/* Graph header */}
          <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <Network size={11} style={{ color: "var(--color-muted)" }} />
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
              Knowledge Graph
            </span>
            <span className="text-[9px] ml-auto font-mono" style={{ color: "var(--color-border)" }}>
              {graphNodes.length} nodes
            </span>
          </div>

          {/* Graph canvas */}
          <div className="flex-1 min-h-0 relative" style={{ minHeight: 0 }}>
            <KnowledgeGraph
              nodes={graphNodes}
              edges={graphEdges}
              loading={loadingGraph}
              onClickNode={handleGraphNodeClick}
              className="absolute inset-0 w-full h-full"
            />
          </div>

          {/* Folder legend */}
          {graphNodes.length > 0 && (
            <div className="px-3 py-2 shrink-0 flex flex-wrap gap-x-3 gap-y-1"
              style={{ borderTop: "1px solid var(--color-border)" }}>
              {Object.entries({
                Business: "#4ade80", Personal: "#60a5fa",
                inbox: "#a78bfa", Education: "#f59e0b",
                Resources: "#f87171",
              }).map(([f, c]) => (
                <div key={f} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm" style={{ background: c }} />
                  <span className="text-[9px]" style={{ color: "var(--color-muted)" }}>{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
