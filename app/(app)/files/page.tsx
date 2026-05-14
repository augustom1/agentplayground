"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Brain, Search, Plus, FileText, File, Image, Upload, Trash2, Download,
  RefreshCw, X, Check, AlertCircle, ChevronRight, ChevronDown,
  Folder, FolderOpen, Home, Tag, Pencil, FolderPlus, Sparkles,
  Network, Save, RotateCcw, Loader2, Briefcase, GraduationCap,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { GraphNode, GraphEdge } from "@/components/KnowledgeGraph";

const KnowledgeGraph = dynamic(() => import("@/components/KnowledgeGraph"), { ssr: false });

// ── Types ──────────────────────────────────────────────────────────────────────

interface FolderNode { name: string; path: string; children: FolderNode[] }
interface VaultNote { path: string; title: string; tags: string[]; updatedAt: string; content: string }
interface FileEntry { name: string; path: string; isDirectory: boolean; size: number; modifiedAt: string; mimeType: string | null }
interface UnifiedItem {
  type: "note" | "file";
  name: string;
  path: string;
  date: string;
  tags?: string[];
  mimeType?: string | null;
  content?: string;
}
interface SearchResult { path: string; title: string; content: string; score?: number }

// ── Templates ──────────────────────────────────────────────────────────────────

const TEMPLATES = {
  personal: {
    label: "Personal", icon: Home, color: "text-blue-400",
    folders: ["Personal/Ideas", "Personal/Future Projects", "Personal/Journal", "Personal/Goals"],
  },
  business: {
    label: "Business", icon: Briefcase, color: "text-green-400",
    folders: ["Business/Business Plans", "Business/Clients", "Business/Research", "Business/Finances"],
  },
  education: {
    label: "Education", icon: GraduationCap, color: "text-yellow-400",
    folders: ["Education/Certifications", "Education/Courses", "Education/Notes", "Education/Resources"],
  },
  complete: {
    label: "Complete (recommended)", icon: Sparkles, color: "text-violet-400",
    folders: [
      "Personal/Ideas", "Personal/Future Projects", "Personal/Journal", "Personal/Goals",
      "Business/Business Plans", "Business/Clients", "Business/Research", "Business/Finances",
      "Education/Certifications", "Education/Courses", "Education/Notes", "Education/Resources",
      "Resources/References", "Resources/Templates",
    ],
  },
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return "";
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function FileTypeIcon({ mimeType }: { mimeType?: string | null }) {
  if (!mimeType) return <File size={14} style={{ color: "var(--color-muted)" }} />;
  if (mimeType.startsWith("image/")) return <Image size={14} className="text-blue-400" />;
  if (mimeType === "application/pdf") return <File size={14} className="text-red-400" />;
  return <File size={14} style={{ color: "var(--color-muted)" }} />;
}

// ── TreeNode ───────────────────────────────────────────────────────────────────

function TreeNode({
  node, selectedPath, depth, onSelect, onNewSubfolder,
}: {
  node: FolderNode; selectedPath: string; depth: number;
  onSelect: (p: string) => void; onNewSubfolder: (p: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2 || selectedPath.startsWith(node.path));
  const hasChildren = node.children.length > 0;
  const isSelected = selectedPath === node.path;
  const isAncestor = selectedPath.startsWith(node.path + "/");

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer group transition-colors text-xs select-none
          ${isSelected ? "bg-violet-500/20 text-violet-300" : isAncestor ? "text-[var(--color-text)]" : "text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => { onSelect(node.path); if (hasChildren) setOpen((v) => !v); }}
      >
        {hasChildren
          ? (open ? <ChevronDown size={11} className="shrink-0" /> : <ChevronRight size={11} className="shrink-0" />)
          : <span className="w-[11px]" />}
        {open && hasChildren
          ? <FolderOpen size={13} className="shrink-0 text-yellow-400" />
          : <Folder size={13} className="shrink-0 text-yellow-400/70" />}
        <span className="truncate flex-1">{node.name}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onNewSubfolder(node.path); }}
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 rounded"
          title="New subfolder"
        >
          <FolderPlus size={10} />
        </button>
      </div>
      {open && hasChildren && node.children.map((child) => (
        <TreeNode key={child.path} node={child} selectedPath={selectedPath} depth={depth + 1}
          onSelect={onSelect} onNewSubfolder={onNewSubfolder} />
      ))}
    </div>
  );
}

// ── SetupWizard ────────────────────────────────────────────────────────────────

function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [selected, setSelected] = useState<keyof typeof TEMPLATES>("complete");
  const [custom, setCustom] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = selected === "complete"
    ? TEMPLATES.complete.folders
    : [...TEMPLATES[selected].folders, ...custom.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)];

  async function create() {
    setCreating(true); setError(null);
    try {
      for (const f of [...preview, "inbox"]) {
        await fetch("/api/brain/folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: f }),
        });
      }
      onComplete();
    } catch (e) { setError(String(e)); }
    finally { setCreating(false); }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-2xl rounded-2xl p-8" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
            <Brain size={18} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>Set up your Knowledge Base</h2>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>Choose a folder structure for notes and files</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {(Object.entries(TEMPLATES) as [keyof typeof TEMPLATES, typeof TEMPLATES[keyof typeof TEMPLATES]][]).map(([key, tpl]) => {
            const Icon = tpl.icon;
            return (
              <button key={key} onClick={() => setSelected(key)}
                className={`p-4 rounded-xl text-left border transition-all ${selected === key ? "border-violet-500 bg-violet-500/10" : "hover:bg-[var(--color-surface-hover)]"}`}
                style={{ borderColor: selected === key ? undefined : "var(--color-border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={15} className={tpl.color} />
                  <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{tpl.label}</span>
                  {selected === key && <Check size={12} className="ml-auto text-violet-400" />}
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
                  {tpl.folders.slice(0, 4).join(" · ")}
                </p>
              </button>
            );
          })}
        </div>

        {selected !== "complete" && (
          <textarea value={custom} onChange={(e) => setCustom(e.target.value)}
            placeholder="Add custom folders (one per line or comma-separated)"
            rows={3} className="glass-input w-full px-3 py-2 text-xs resize-none mb-4"
            style={{ fontFamily: "inherit" }} />
        )}

        <div className="mb-6 p-4 rounded-xl text-xs" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
          <p className="font-medium mb-2" style={{ color: "var(--color-text)" }}>Folders to create:</p>
          <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
            {[...preview, "inbox"].map((f) => (
              <div key={f} className="flex items-center gap-1.5" style={{ color: "var(--color-muted)" }}>
                <Folder size={11} className="text-yellow-400 shrink-0" />
                <span className="truncate">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <button onClick={create} disabled={creating} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
          {creating ? <RefreshCw size={14} className="animate-spin" /> : <Brain size={14} />}
          {creating ? "Creating…" : "Create Knowledge Base"}
        </button>
        <button onClick={onComplete} className="w-full mt-2 text-xs py-1.5" style={{ color: "var(--color-muted)" }}>
          Skip — start empty
        </button>
      </div>
    </div>
  );
}

// ── CapturePanel ───────────────────────────────────────────────────────────────

function CapturePanel({ folder, onSaved }: { folder: string; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
        body: JSON.stringify({ title: title.trim(), text: content.trim(), tags, folder: folder || "inbox" }),
      });
      if (!r.ok) throw new Error("Failed to save");
      setTitle(""); setContent(""); setTags([]); setTagInput("");
      onSaved();
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col gap-3 p-5 h-full overflow-auto">
      <div className="flex items-center gap-2 mb-1 shrink-0">
        <Sparkles size={14} style={{ color: "#a78bfa" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Capture to Brain</span>
        <span className="text-xs ml-1" style={{ color: "var(--color-muted)" }}>
          → <strong className="text-violet-400">{folder || "inbox"}</strong>
        </span>
      </div>

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
        className="input-field text-sm py-2 px-3 shrink-0" />

      <textarea value={content} onChange={(e) => setContent(e.target.value)}
        placeholder="Write your note, paste content, ideas…"
        rows={8} className="glass-input flex-1 px-3 py-2 text-xs resize-none"
        style={{ fontFamily: "inherit", lineHeight: "1.6" }} />

      <div className="flex flex-wrap gap-1.5 shrink-0">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>
            #{t}
            <button onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:opacity-70 ml-0.5">
              <X size={8} />
            </button>
          </span>
        ))}
        <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              const t = tagInput.trim().replace(/^#+/, "").trim();
              if (t && !tags.includes(t)) setTags((p) => [...p, t]);
              setTagInput("");
            }
          }}
          placeholder="Add tag, press Enter…"
          className="input-field text-xs py-1 px-2 flex-1 min-w-[120px]" />
      </div>

      {error && <p className="text-xs text-red-400 shrink-0">{error}</p>}

      <div className="flex gap-2 shrink-0">
        <input ref={fileRef} type="file" accept=".md,.txt,.json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs hover:opacity-80"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-muted)" }}>
          <Upload size={11} /> File
        </button>
        <button onClick={submit} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 py-2">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? "Saving…" : "Save to Knowledge Base"}
        </button>
      </div>
    </div>
  );
}

// ── NoteViewer ─────────────────────────────────────────────────────────────────

function NoteViewer({ item, onBack, onDelete, onSaved }: {
  item: UnifiedItem; onBack: () => void; onDelete: () => void; onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const isTeamConfig = /^Teams\/[^/]+\/config\.json$/.test(item.path);

  async function save() {
    setSaving(true);
    setSyncMsg(null);
    try {
      const r = await fetch("/api/brain/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: item.path, content: editContent }),
      });
      const data = await r.json().catch(() => ({})) as {
        syncResult?: { agents: number; skills: number; cliFunctions: number };
        syncWarning?: string;
      };
      setEditing(false);
      onSaved();
      if (data.syncResult) {
        const { agents, skills, cliFunctions } = data.syncResult;
        setSyncMsg({ text: `✓ Team synced — ${agents} agents, ${skills} skills, ${cliFunctions} CLI functions`, ok: true });
        setTimeout(() => setSyncMsg(null), 5000);
      } else if (data.syncWarning) {
        setSyncMsg({ text: `⚠ ${data.syncWarning}`, ok: false });
        setTimeout(() => setSyncMsg(null), 7000);
      }
    } finally { setSaving(false); }
  }

  async function del() {
    setDeleting(true);
    try {
      await fetch(`/api/brain/note?path=${encodeURIComponent(item.path)}`, { method: "DELETE" });
      onDelete();
    } finally { setDeleting(false); }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={onBack} className="text-[11px] flex items-center gap-1 hover:opacity-70" style={{ color: "var(--color-muted)" }}>
          ← Back
        </button>
        <div className="w-px h-3 mx-1" style={{ background: "var(--color-border)" }} />
        <span className="text-xs font-semibold flex-1 truncate" style={{ color: "var(--color-text)" }}>{item.name}</span>
        {isTeamConfig && (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0"
            style={{ background: "rgba(99,102,241,0.18)", color: "rgba(165,180,252,0.95)", border: "1px solid rgba(99,102,241,0.3)" }}>
            LIVE CONFIG
          </span>
        )}
        <div className="flex gap-1.5 shrink-0">
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setEditContent(item.content || ""); setSyncMsg(null); }}
                className="px-2 py-1 rounded-md text-[10px] hover:opacity-80"
                style={{ color: "var(--color-muted)", background: "var(--color-surface)" }}>
                <RotateCcw size={10} className="inline mr-0.5" />Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="px-2 py-1 rounded-md text-[10px] font-medium hover:opacity-80 disabled:opacity-50"
                style={{ background: "var(--color-accent)", color: "#000" }}>
                {saving ? <Loader2 size={10} className="animate-spin inline" /> : <Check size={10} className="inline mr-0.5" />}
                {isTeamConfig ? "Save & Sync" : "Save"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)}
                className="px-2 py-1 rounded-md text-[10px] hover:opacity-80"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                <Pencil size={10} className="inline mr-0.5" />Edit
              </button>
              <button onClick={del} disabled={deleting}
                className="px-2 py-1 rounded-md text-[10px] hover:opacity-80 disabled:opacity-50"
                style={{ color: "var(--color-red)", background: "var(--color-red-dim)" }}>
                {deleting ? <Loader2 size={10} className="animate-spin inline" /> : <Trash2 size={10} className="inline mr-0.5" />}
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {syncMsg && (
        <div className="px-4 py-2 text-[11px] shrink-0"
          style={{
            background: syncMsg.ok ? "rgba(74,222,128,0.08)" : "rgba(251,191,36,0.08)",
            borderBottom: `1px solid ${syncMsg.ok ? "rgba(74,222,128,0.2)" : "rgba(251,191,36,0.2)"}`,
            color: syncMsg.ok ? "var(--color-green)" : "#fbbf24",
          }}>
          {syncMsg.text}
        </div>
      )}

      {isTeamConfig && !editing && (
        <div className="px-4 py-2 shrink-0" style={{ borderBottom: "1px solid var(--color-border)", background: "rgba(99,102,241,0.04)" }}>
          <p className="text-[10px]" style={{ color: "rgba(165,180,252,0.7)" }}>
            Edit this file and click <strong>Save &amp; Sync</strong> to update the live agent team instantly. Changes to agents, skills, and CLI functions are applied immediately.
          </p>
        </div>
      )}

      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3 shrink-0">
          {item.tags.map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>
              #{t.replace(/^#/, "")}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto p-4">
        {editing ? (
          <textarea autoFocus value={editContent} onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-full min-h-[300px] bg-transparent resize-none outline-none text-sm leading-relaxed font-mono"
            style={{ color: "var(--color-text)" }} />
        ) : (
          <pre className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text)", fontFamily: "inherit" }}>
            {editContent || item.content}
          </pre>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  // Tree
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [treeLoaded, setTreeLoaded] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  // Content
  const [notes, setNotes] = useState<VaultNote[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [openItem, setOpenItem] = useState<UnifiedItem | null>(null);

  // UI modes
  const [showCapture, setShowCapture] = useState(false);
  const [showGraph, setShowGraph] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Graph
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [loadingGraph, setLoadingGraph] = useState(true);

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Load tree ──
  const loadTree = useCallback(async () => {
    try {
      const res = await fetch("/api/brain/tree");
      const data = await res.json();
      const newTree: FolderNode[] = data.tree || [];
      setTree(newTree);
      setTreeLoaded(true);
      if (newTree.length === 0) setShowSetup(true);
    } catch { setTreeLoaded(true); }
  }, []);

  useEffect(() => { loadTree(); }, [loadTree]);

  // ── Load content ──
  const loadContent = useCallback(async (folder: string) => {
    setLoadingContent(true);
    setOpenItem(null);
    try {
      const [notesRes, filesRes] = await Promise.allSettled([
        fetch(`/api/brain/notes?folder=${encodeURIComponent(folder || "_root_")}&limit=100`).then((r) => r.json()),
        fetch(`/api/files?path=${encodeURIComponent(folder)}`).then((r) => r.json()),
      ]);
      setNotes(notesRes.status === "fulfilled" ? notesRes.value.notes || [] : []);
      setFiles(filesRes.status === "fulfilled"
        ? (filesRes.value.entries || []).filter((e: FileEntry) => !e.isDirectory) : []);
    } finally { setLoadingContent(false); }
  }, []);

  useEffect(() => {
    if (treeLoaded && !showSetup) loadContent(selectedFolder);
  }, [selectedFolder, treeLoaded, showSetup, loadContent]);

  // ── Load graph ──
  useEffect(() => {
    fetch("/api/brain/graph")
      .then((r) => r.json())
      .then((d) => { setGraphNodes(d.nodes || []); setGraphEdges(d.edges || []); })
      .catch(() => {})
      .finally(() => setLoadingGraph(false));
  }, []);

  // ── Debounced semantic search ──
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

  // ── Create folder ──
  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name || creatingFolder) return;
    setCreatingFolder(true);
    const folderPath = newFolderParent ? `${newFolderParent}/${name}` : name;
    try {
      const res = await fetch("/api/brain/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: folderPath }),
      });
      if (!res.ok) throw new Error("Failed to create folder");
      setNewFolderParent(null);
      setNewFolderName("");
      await loadTree();
      setSelectedFolder(folderPath);
      showToast("Folder created");
    } catch (e) { showToast(String(e), false); }
    finally { setCreatingFolder(false); }
  };

  useEffect(() => {
    if (newFolderParent !== null) setTimeout(() => newFolderInputRef.current?.focus(), 50);
  }, [newFolderParent]);

  // ── Open note ──
  const openNote = async (item: UnifiedItem) => {
    if (item.content) {
      setOpenItem(item); setShowCapture(false); setSearchQuery(""); return;
    }
    const r = await fetch(`/api/brain/note?path=${encodeURIComponent(item.path)}`);
    if (r.ok) {
      const d = await r.json();
      setOpenItem({ ...item, content: d.content });
      setShowCapture(false);
      setSearchQuery("");
    }
  };

  // ── Delete note ──
  const deleteNote = async (notePath: string) => {
    try {
      await fetch(`/api/brain/note?path=${encodeURIComponent(notePath)}`, { method: "DELETE" });
      setOpenItem(null);
      await loadContent(selectedFolder);
      showToast("Note deleted");
    } catch (e) { showToast(String(e), false); }
  };

  // ── Upload ──
  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const mdFiles = Array.from(fileList).filter((f) => f.name.endsWith(".md") || f.name.endsWith(".txt"));
    const regularFiles = Array.from(fileList).filter((f) => !f.name.endsWith(".md") && !f.name.endsWith(".txt"));
    try {
      for (const f of mdFiles) {
        const text = await f.text();
        const title = f.name.replace(/\.(md|txt)$/, "");
        await fetch("/api/brain/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, text, tags: ["upload"], folder: selectedFolder || "inbox" }),
        });
      }
      if (regularFiles.length) {
        const formData = new FormData();
        formData.append("path", selectedFolder);
        regularFiles.forEach((f) => formData.append("files", f));
        await fetch("/api/files/upload", { method: "POST", body: formData });
      }
      await loadContent(selectedFolder);
      showToast(`Uploaded ${fileList.length} file(s)`);
    } catch (e) { showToast(String(e), false); }
  };

  // ── Unified items list ──
  const items: UnifiedItem[] = [
    ...notes.map((n) => ({
      type: "note" as const,
      name: n.title || n.path.split("/").pop() || n.path,
      path: n.path, date: n.updatedAt, tags: n.tags, content: n.content,
    })),
    ...files.map((f) => ({
      type: "file" as const,
      name: f.name, path: f.path, date: f.modifiedAt, mimeType: f.mimeType,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const breadcrumbs = selectedFolder ? selectedFolder.split("/") : [];
  const isSearching = searchQuery.trim().length > 0;
  const totalItems = notes.length + files.length;

  if (showSetup) {
    return (
      <div className="flex h-full animate-fade-in">
        <SetupWizard onComplete={async () => { setShowSetup(false); await loadTree(); }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(167,139,250,0.15)" }}>
            <Brain size={13} style={{ color: "#a78bfa" }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Knowledge Base</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
            style={{ background: "var(--color-surface)", color: "var(--color-muted)", border: "1px solid var(--color-border)" }}>
            {totalItems}
          </span>
        </div>

        {/* Semantic search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--color-muted)" }} />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Semantic search…"
            className="w-full pl-8 pr-8 py-1.5 rounded-lg text-xs bg-transparent outline-none"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
          {searching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin" style={{ color: "var(--color-muted)" }} />}
          {searchQuery && !searching && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 hover:opacity-70">
              <X size={11} style={{ color: "var(--color-muted)" }} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs hover:opacity-80"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-muted)" }}>
            <Upload size={11} /> Upload
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />

          <button
            onClick={() => { setShowCapture((p) => !p); setOpenItem(null); setSearchQuery(""); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90"
            style={{
              background: showCapture ? "var(--color-accent)" : "var(--color-surface)",
              color: showCapture ? "#000" : "var(--color-text)",
              border: showCapture ? "none" : "1px solid var(--color-border)",
            }}>
            <Plus size={12} /> Capture
          </button>

          <button
            onClick={() => setShowGraph((p) => !p)}
            title={showGraph ? "Hide graph" : "Show graph"}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs hover:opacity-80"
            style={{
              background: showGraph ? "rgba(167,139,250,0.15)" : "transparent",
              color: showGraph ? "#a78bfa" : "var(--color-muted)",
              border: `1px solid ${showGraph ? "rgba(167,139,250,0.3)" : "var(--color-border)"}`,
            }}>
            <Network size={11} />
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT: Folder tree ──────────────────────────────────────────── */}
        <div className="flex flex-col shrink-0"
          style={{ width: 220, borderRight: "1px solid var(--color-border)", background: "var(--color-surface)" }}>

          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Folders</span>
            <div className="flex items-center gap-1">
              <button onClick={loadTree} className="p-1 rounded hover:bg-[var(--color-surface-hover)]" title="Refresh">
                <RefreshCw size={10} style={{ color: "var(--color-muted)" }} />
              </button>
              <button onClick={() => setShowSetup(true)} className="p-1 rounded hover:bg-[var(--color-surface-hover)]" title="Setup wizard">
                <Sparkles size={10} style={{ color: "var(--color-muted)" }} />
              </button>
            </div>
          </div>

          <button
            onClick={() => setSelectedFolder("")}
            className={`flex items-center gap-2 mx-2 px-2 py-1.5 rounded-lg text-xs transition-colors mb-0.5
              ${selectedFolder === "" ? "bg-violet-500/20 text-violet-300" : "text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"}`}>
            <Home size={13} className="text-violet-400/70 shrink-0" /> All notes
          </button>

          <div className="flex-1 overflow-y-auto px-1">
            {tree.map((node) => (
              <TreeNode key={node.path} node={node} selectedPath={selectedFolder} depth={0}
                onSelect={setSelectedFolder}
                onNewSubfolder={(p) => { setNewFolderParent(p); setNewFolderName(""); }} />
            ))}
          </div>

          {newFolderParent !== null && (
            <div className="px-2 py-2 border-t" style={{ borderColor: "var(--color-border)" }}>
              <p className="text-[10px] mb-1" style={{ color: "var(--color-muted)" }}>
                New in {newFolderParent || "root"}:
              </p>
              <div className="flex gap-1">
                <input ref={newFolderInputRef} value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createFolder();
                    if (e.key === "Escape") { setNewFolderParent(null); setNewFolderName(""); }
                  }}
                  placeholder="folder name" className="input-field flex-1 text-xs py-1 px-2" />
                <button onClick={createFolder} disabled={creatingFolder} className="btn-primary px-2 py-1 text-[10px]">
                  {creatingFolder ? <RefreshCw size={10} className="animate-spin" /> : <Check size={10} />}
                </button>
              </div>
            </div>
          )}

          <button onClick={() => { setNewFolderParent(""); setNewFolderName(""); }}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs border-t transition-colors hover:bg-[var(--color-surface-hover)]"
            style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}>
            <FolderPlus size={12} /> New folder
          </button>
        </div>

        {/* ── CENTER: Main content ────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden"
          style={{ borderRight: showGraph ? "1px solid var(--color-border)" : "none" }}>

          {/* Breadcrumbs bar (browse mode only) */}
          {!showCapture && !openItem && !isSearching && (
            <div className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <div className="flex items-center gap-1 text-xs min-w-0 flex-1" style={{ color: "var(--color-muted)" }}>
                <button onClick={() => setSelectedFolder("")} className="hover:text-[var(--color-text)] transition-colors shrink-0">All</button>
                {breadcrumbs.map((crumb, i) => {
                  const crumbPath = breadcrumbs.slice(0, i + 1).join("/");
                  return (
                    <span key={crumbPath} className="flex items-center gap-1 shrink-0">
                      <ChevronRight size={10} />
                      <button onClick={() => setSelectedFolder(crumbPath)} className="hover:text-[var(--color-text)] transition-colors">{crumb}</button>
                    </span>
                  );
                })}
              </div>
              {totalItems > 0 && (
                <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--color-muted)" }}>
                  {totalItems} item{totalItems !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {/* Toast */}
          {toast && (
            <div className={`mx-4 mt-2 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shrink-0
              ${toast.ok ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
              {toast.ok ? <Check size={11} /> : <AlertCircle size={11} />}
              <span>{toast.msg}</span>
              <button className="ml-auto" onClick={() => setToast(null)}><X size={10} /></button>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {showCapture ? (
              <CapturePanel folder={selectedFolder} onSaved={async () => {
                await loadContent(selectedFolder);
                await loadTree();
                setShowCapture(false);
                showToast("Saved to Knowledge Base");
              }} />

            ) : openItem ? (
              <NoteViewer
                item={openItem}
                onBack={() => setOpenItem(null)}
                onDelete={() => deleteNote(openItem.path)}
                onSaved={() => loadContent(selectedFolder)}
              />

            ) : isSearching ? (
              <div className="flex flex-col h-full overflow-auto">
                <div className="px-4 py-3 shrink-0 flex items-center gap-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <Search size={12} style={{ color: "var(--color-muted)" }} />
                  <span className="text-xs" style={{ color: "var(--color-text)" }}>
                    {searching ? "Searching…" : `${searchResults.length} results for "${searchQuery}"`}
                  </span>
                  {searching && <Loader2 size={11} className="animate-spin ml-auto" style={{ color: "var(--color-muted)" }} />}
                </div>
                <div className="flex-1 overflow-auto divide-y" style={{ borderColor: "var(--color-border)" }}>
                  {searchResults.length === 0 && !searching ? (
                    <div className="flex items-center justify-center h-24">
                      <p className="text-xs" style={{ color: "var(--color-muted)" }}>No results</p>
                    </div>
                  ) : searchResults.map((r) => (
                    <button key={r.path}
                      onClick={() => openNote({ type: "note", name: r.title, path: r.path, date: "", content: r.content })}
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
                      <p className="text-[10px] leading-relaxed line-clamp-2 ml-[19px]" style={{ color: "var(--color-muted)" }}>
                        {r.content}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

            ) : (
              /* Browse */
              <div className="flex-1 h-full overflow-y-auto px-2 pb-4">
                {loadingContent ? (
                  <div className="flex justify-center py-12">
                    <RefreshCw size={16} className="animate-spin" style={{ color: "var(--color-muted)" }} />
                  </div>
                ) : items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <Folder size={32} className="mb-3 opacity-20" style={{ color: "var(--color-muted)" }} />
                    <p className="text-sm" style={{ color: "var(--color-muted)" }}>Empty folder</p>
                    <p className="text-xs mt-1 mb-4" style={{ color: "var(--color-muted)" }}>Use Capture to add a note, or upload files</p>
                    <button onClick={() => setShowCapture(true)} className="btn-primary px-4 py-1.5 text-xs flex items-center gap-1.5">
                      <Plus size={12} /> Add first note
                    </button>
                  </div>
                ) : items.map((item) => (
                  <div key={item.path}
                    onClick={() => item.type === "note"
                      ? openNote(item)
                      : window.open(`/api/files/download?path=${encodeURIComponent(item.path)}`, "_blank")}
                    className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 cursor-pointer transition-colors group
                      ${openItem?.path === item.path ? "bg-violet-500/15" : "hover:bg-[var(--color-surface-hover)]"}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {item.type === "note"
                        ? <FileText size={14} className="text-violet-400/70" />
                        : <FileTypeIcon mimeType={item.mimeType} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--color-text)" }}>{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>{fmtDate(item.date)}</span>
                        {item.tags?.slice(0, 2).map((t) => (
                          <span key={t} className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-violet-500/10 text-violet-400">
                            <Tag size={8} />{t.replace(/^#/, "")}
                          </span>
                        ))}
                      </div>
                    </div>
                    {item.type === "note" && (
                      <button onClick={(e) => { e.stopPropagation(); deleteNote(item.path); }}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-1 rounded hover:bg-red-500/10 transition-all shrink-0">
                        <Trash2 size={11} className="text-red-400" />
                      </button>
                    )}
                    {item.type === "file" && (
                      <Download size={11} className="opacity-0 group-hover:opacity-60 shrink-0 mt-1" style={{ color: "var(--color-muted)" }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Knowledge Graph ──────────────────────────────────────── */}
        {showGraph && (
          <div className="flex flex-col shrink-0 overflow-hidden" style={{ width: 300 }}>
            <div className="flex items-center gap-2 px-3 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <Network size={11} style={{ color: "var(--color-muted)" }} />
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>Graph</span>
              <span className="text-[9px] ml-auto font-mono" style={{ color: "var(--color-border)" }}>
                {graphNodes.length} nodes
              </span>
            </div>
            <div className="flex-1 min-h-0 relative">
              <KnowledgeGraph
                nodes={graphNodes}
                edges={graphEdges}
                loading={loadingGraph}
                onClickNode={(id) => {
                  const n = graphNodes.find((x) => x.id === id);
                  if (n) openNote({ type: "note", name: n.title, path: n.id, date: "", content: "" });
                }}
                className="absolute inset-0 w-full h-full"
              />
            </div>
            {graphNodes.length > 0 && (
              <div className="px-3 py-2 shrink-0 flex flex-wrap gap-x-3 gap-y-1" style={{ borderTop: "1px solid var(--color-border)" }}>
                {[["Business", "#4ade80"], ["Personal", "#60a5fa"], ["inbox", "#a78bfa"], ["Education", "#f59e0b"], ["Resources", "#f87171"]].map(([f, c]) => (
                  <div key={f} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm" style={{ background: c }} />
                    <span className="text-[9px]" style={{ color: "var(--color-muted)" }}>{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
