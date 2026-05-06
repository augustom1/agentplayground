"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Folder, FolderOpen, FileText, File, Image, Upload, Plus, Trash2, Download,
  RefreshCw, Search, X, Check, AlertCircle, Brain, ChevronRight, ChevronDown,
  BookOpen, Briefcase, GraduationCap, Home, Tag, Pencil, FolderPlus, Sparkles,
  Network,
} from "lucide-react";
import KnowledgeGraph, { type GraphNode, type GraphEdge } from "@/components/KnowledgeGraph";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Setup templates ───────────────────────────────────────────────────────────

const TEMPLATES = {
  personal: {
    label: "Personal",
    icon: Home,
    color: "text-blue-400",
    folders: ["Personal/Ideas", "Personal/Future Projects", "Personal/Journal", "Personal/Goals"],
  },
  business: {
    label: "Business",
    icon: Briefcase,
    color: "text-green-400",
    folders: ["Business/Business Plans", "Business/Clients", "Business/Research", "Business/Finances"],
  },
  education: {
    label: "Education",
    icon: GraduationCap,
    color: "text-yellow-400",
    folders: ["Education/Certifications", "Education/Courses", "Education/Notes", "Education/Resources"],
  },
  complete: {
    label: "Complete (recommended)",
    icon: Sparkles,
    color: "text-violet-400",
    folders: [
      "Personal/Ideas", "Personal/Future Projects", "Personal/Journal", "Personal/Goals",
      "Business/Business Plans", "Business/Clients", "Business/Research", "Business/Finances",
      "Education/Certifications", "Education/Courses", "Education/Notes", "Education/Resources",
      "Resources/References", "Resources/Templates",
    ],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSize(b: number) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}
function fmtDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function FileIcon({ mimeType, isDir }: { mimeType?: string | null; isDir?: boolean }) {
  if (isDir) return <Folder size={14} className="text-yellow-400" />;
  if (!mimeType) return <File size={14} className="text-gray-400" />;
  if (mimeType.startsWith("image/")) return <Image size={14} className="text-blue-400" />;
  if (mimeType === "application/pdf") return <File size={14} className="text-red-400" />;
  return <File size={14} className="text-gray-400" />;
}

// ── FolderTree ────────────────────────────────────────────────────────────────

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
        {hasChildren ? (
          open ? <ChevronDown size={11} className="shrink-0" /> : <ChevronRight size={11} className="shrink-0" />
        ) : <span className="w-[11px]" />}
        {open && hasChildren ? <FolderOpen size={13} className="shrink-0 text-yellow-400" /> : <Folder size={13} className="shrink-0 text-yellow-400/70" />}
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

// ── Setup Wizard ──────────────────────────────────────────────────────────────

function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [selected, setSelected] = useState<keyof typeof TEMPLATES>("complete");
  const [custom, setCustom] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = selected === "complete" ? TEMPLATES.complete.folders :
    [...TEMPLATES[selected].folders, ...custom.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)];

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const folders = [...preview, "inbox"];
      for (const f of folders) {
        await fetch("/api/brain/folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: f }),
        });
      }
      onComplete();
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8 animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl p-8" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
            <Brain size={18} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>Set up your Knowledge Base</h2>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>Choose a structure for your files and brain notes</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6 mb-6">
          {(Object.entries(TEMPLATES) as [keyof typeof TEMPLATES, typeof TEMPLATES[keyof typeof TEMPLATES]][]).map(([key, tpl]) => {
            const Icon = tpl.icon;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`p-4 rounded-xl text-left border transition-all ${selected === key ? "border-violet-500 bg-violet-500/10" : "hover:bg-[var(--color-surface-hover)]"}`}
                style={{ borderColor: selected === key ? undefined : "var(--color-border)" }}
              >
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
          <div className="mb-4">
            <p className="text-xs mb-1.5" style={{ color: "var(--color-muted)" }}>Add custom folders (one per line or comma-separated):</p>
            <textarea
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="e.g. Personal/Recipes, Business/Marketing"
              rows={3}
              className="glass-input w-full px-3 py-2 text-xs resize-none"
              style={{ fontFamily: "inherit" }}
            />
          </div>
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
          {creating ? "Creating your Knowledge Base…" : "Create Knowledge Base"}
        </button>
        <button onClick={onComplete} className="w-full mt-2 text-xs py-1.5" style={{ color: "var(--color-muted)" }}>
          Skip — start empty
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FilesPage() {
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [treeLoaded, setTreeLoaded] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [notes, setNotes] = useState<VaultNote[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [openItem, setOpenItem] = useState<UnifiedItem | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [mode, setMode] = useState<"browse" | "capture" | "search" | "graph">("browse");
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [captureTitle, setCaptureTitle] = useState("");
  const [captureText, setCaptureText] = useState("");
  const [captureTags, setCaptureTags] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<{ path: string; title: string; content: string; score?: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const toast = (msg: string, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(null); setSuccess(null); }, 3500);
  };

  // ── Load tree
  const loadTree = useCallback(async () => {
    try {
      const res = await fetch("/api/brain/tree");
      const data = await res.json();
      const newTree: FolderNode[] = data.tree || [];
      setTree(newTree);
      setTreeLoaded(true);
      if (newTree.length === 0) setShowSetup(true);
    } catch {
      setTreeLoaded(true);
    }
  }, []);

  useEffect(() => { loadTree(); }, [loadTree]);

  // ── Load folder content
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
        ? (filesRes.value.entries || []).filter((e: FileEntry) => !e.isDirectory)
        : []);
    } finally {
      setLoadingContent(false);
    }
  }, []);

  useEffect(() => {
    if (treeLoaded && !showSetup) loadContent(selectedFolder);
  }, [selectedFolder, treeLoaded, showSetup, loadContent]);

  const loadGraph = useCallback(async () => {
    setLoadingGraph(true);
    try {
      const res = await fetch("/api/brain/graph");
      const data = await res.json();
      setGraphNodes(data.nodes || []);
      setGraphEdges(data.edges || []);
    } catch { /* non-fatal */ }
    finally { setLoadingGraph(false); }
  }, []);

  useEffect(() => {
    if (mode === "graph") loadGraph();
  }, [mode, loadGraph]);

  // ── Unified items (notes + files merged, sorted by date)
  const items: UnifiedItem[] = [
    ...notes.map((n) => ({
      type: "note" as const,
      name: n.title || n.path.split("/").pop() || n.path,
      path: n.path,
      date: n.updatedAt,
      tags: n.tags,
      content: n.content,
    })),
    ...files.map((f) => ({
      type: "file" as const,
      name: f.name,
      path: f.path,
      date: f.modifiedAt,
      mimeType: f.mimeType,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ── Create folder
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
      toast("Folder created");
    } catch (e) {
      toast(String(e), true);
    } finally {
      setCreatingFolder(false);
    }
  };

  // ── Open note
  const openNote = async (item: UnifiedItem) => {
    if (item.type === "note") {
      setOpenItem(item);
      setEditContent(item.content || "");
      setEditing(false);
    }
  };

  // ── Save note
  const saveNote = async () => {
    if (!openItem) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/brain/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: openItem.path, content: editContent }),
      });
      if (!res.ok) throw new Error("Save failed");
      setEditing(false);
      await loadContent(selectedFolder);
      toast("Note saved");
    } catch (e) {
      toast(String(e), true);
    } finally {
      setSavingNote(false);
    }
  };

  // ── Delete note
  const deleteNote = async (notePath: string) => {
    if (!confirm("Delete this note permanently?")) return;
    try {
      await fetch(`/api/brain/note?path=${encodeURIComponent(notePath)}`, { method: "DELETE" });
      if (openItem?.path === notePath) setOpenItem(null);
      await loadContent(selectedFolder);
      toast("Note deleted");
    } catch (e) {
      toast(String(e), true);
    }
  };

  // ── Upload files
  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const mdFiles = Array.from(fileList).filter((f) => f.name.endsWith(".md") || f.name.endsWith(".txt"));
    const regularFiles = Array.from(fileList).filter((f) => !f.name.endsWith(".md") && !f.name.endsWith(".txt"));

    try {
      // .md/.txt → ingest as brain notes
      for (const f of mdFiles) {
        const text = await f.text();
        const title = f.name.replace(/\.(md|txt)$/, "");
        await fetch("/api/brain/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, text, tags: ["#upload"], folder: selectedFolder || "inbox" }),
        });
      }
      // other files → regular file upload
      if (regularFiles.length) {
        const formData = new FormData();
        formData.append("path", selectedFolder);
        regularFiles.forEach((f) => formData.append("files", f));
        await fetch("/api/files/upload", { method: "POST", body: formData });
      }
      await loadContent(selectedFolder);
      toast(`Uploaded ${fileList.length} file(s)`);
    } catch (e) {
      toast(String(e), true);
    }
  };

  // ── Capture
  const capture = async () => {
    if (!captureTitle.trim() || !captureText.trim()) { toast("Title and text are required", true); return; }
    setCapturing(true);
    try {
      const tags = captureTags.split(/[\s,]+/).filter(Boolean).map((t) => t.startsWith("#") ? t : `#${t}`);
      const res = await fetch("/api/brain/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: captureTitle, text: captureText, tags, folder: selectedFolder || "inbox" }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setCaptureTitle(""); setCaptureText(""); setCaptureTags("");
      await loadContent(selectedFolder);
      await loadTree();
      setMode("browse");
      toast("Saved to Knowledge Base");
    } catch (e) {
      toast(String(e), true);
    } finally {
      setCapturing(false);
    }
  };

  // ── Search
  const runSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/brain/search?q=${encodeURIComponent(searchQ)}&topK=10`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  // ── Breadcrumb
  const breadcrumbs = selectedFolder ? selectedFolder.split("/") : [];

  // ── Setup complete
  const onSetupComplete = async () => {
    setShowSetup(false);
    await loadTree();
  };

  // ── Inline new-folder input: focus on show
  useEffect(() => {
    if (newFolderParent !== null) setTimeout(() => newFolderInputRef.current?.focus(), 50);
  }, [newFolderParent]);

  if (showSetup) {
    return (
      <div className="flex h-full animate-fade-in">
        <SetupWizard onComplete={onSetupComplete} />
      </div>
    );
  }

  return (
    <div className="flex h-full animate-fade-in overflow-hidden">

      {/* ── Left: Folder Tree ──────────────────────────────────────────────── */}
      <div
        className="flex flex-col shrink-0"
        style={{ width: "220px", borderRight: "1px solid var(--color-border)", background: "var(--color-surface)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Brain size={14} className="text-violet-400" />
            <span className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Knowledge Base</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={loadTree} className="p-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors" title="Refresh">
              <RefreshCw size={11} style={{ color: "var(--color-muted)" }} />
            </button>
            <button onClick={() => setShowSetup(true)} className="p-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors" title="Setup wizard">
              <Sparkles size={11} style={{ color: "var(--color-muted)" }} />
            </button>
          </div>
        </div>

        {/* Root folder */}
        <button
          onClick={() => setSelectedFolder("")}
          className={`flex items-center gap-2 mx-2 px-2 py-1.5 rounded-lg text-xs transition-colors mb-0.5
            ${selectedFolder === "" ? "bg-violet-500/20 text-violet-300" : "text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"}`}
        >
          <Home size={13} className="text-violet-400/70 shrink-0" />
          All notes
        </button>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto px-1">
          {tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              selectedPath={selectedFolder}
              depth={0}
              onSelect={setSelectedFolder}
              onNewSubfolder={(p) => { setNewFolderParent(p); setNewFolderName(""); }}
            />
          ))}
        </div>

        {/* New folder input */}
        {newFolderParent !== null && (
          <div className="px-2 py-2 border-t" style={{ borderColor: "var(--color-border)" }}>
            <p className="text-[10px] mb-1" style={{ color: "var(--color-muted)" }}>
              New folder in {newFolderParent || "root"}:
            </p>
            <div className="flex gap-1">
              <input
                ref={newFolderInputRef}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createFolder();
                  if (e.key === "Escape") { setNewFolderParent(null); setNewFolderName(""); }
                }}
                placeholder="folder name"
                className="input-field flex-1 text-xs py-1 px-2"
              />
              <button onClick={createFolder} disabled={creatingFolder} className="btn-primary px-2 py-1 text-[10px]">
                {creatingFolder ? <RefreshCw size={10} className="animate-spin" /> : <Check size={10} />}
              </button>
            </div>
          </div>
        )}

        {/* New root folder button */}
        <button
          onClick={() => { setNewFolderParent(""); setNewFolderName(""); }}
          className="flex items-center gap-1.5 px-3 py-2.5 text-xs border-t transition-colors hover:bg-[var(--color-surface-hover)]"
          style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
        >
          <FolderPlus size={12} /> New category folder
        </button>
      </div>

      {/* ── Graph mode: full-width canvas ─────────────────────────────────── */}
      {mode === "graph" && (
        <div className="flex flex-col flex-1 min-w-0">
          {/* Graph header */}
          <div className="flex items-center justify-between px-4 py-2 shrink-0"
            style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
            <div className="flex items-center gap-2">
              <Network size={14} className="text-violet-400" />
              <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>Knowledge Graph</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa" }}>
                {graphNodes.length} notes · {graphEdges.length} connections
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadGraph} className="p-1.5 rounded hover:bg-[var(--color-surface-hover)] transition-colors" title="Refresh graph">
                <RefreshCw size={11} className={loadingGraph ? "animate-spin" : ""} style={{ color: "var(--color-muted)" }} />
              </button>
              {/* Legend */}
              <div className="flex items-center gap-2 mr-2">
                {[["#60a5fa","Personal"],["#4ade80","Business"],["#facc15","Education"],["#f87171","Resources"],["#c084fc","inbox"]].map(([c,l])=>(
                  <div key={l} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
                    <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>{l}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setMode("browse")} className="btn-ghost px-2 py-1 text-xs flex items-center gap-1">
                <BookOpen size={11} /> Browse
              </button>
            </div>
          </div>
          {/* Canvas */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <KnowledgeGraph
              nodes={graphNodes}
              edges={graphEdges}
              loading={loadingGraph}
              onClickNode={(id) => {
                const note = graphNodes.find((n) => n.id === id);
                if (!note) return;
                setOpenItem({ type: "note", name: note.title, path: note.id, date: "", content: "" });
                setEditContent("");
                // Fetch full content
                fetch(`/api/brain/note?path=${encodeURIComponent(id)}`)
                  .then((r) => r.json())
                  .then((d) => { setEditContent(d.content || ""); setOpenItem((prev) => prev ? { ...prev, content: d.content || "" } : prev); });
                setMode("browse");
              }}
            />
          </div>
        </div>
      )}

      {/* ── Middle: Item List ───────────────────────────────────────────────── */}
      {mode !== "graph" && <div
        className="flex flex-col min-w-0"
        style={{ width: openItem ? "300px" : undefined, flex: openItem ? "0 0 300px" : "1 1 0" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-xs" style={{ color: "var(--color-muted)" }}>
              <button onClick={() => setSelectedFolder("")} className="hover:text-[var(--color-text)] transition-colors">All</button>
              {breadcrumbs.map((crumb, i) => {
                const crumbPath = breadcrumbs.slice(0, i + 1).join("/");
                return (
                  <span key={crumbPath} className="flex items-center gap-1">
                    <ChevronRight size={10} />
                    <button onClick={() => setSelectedFolder(crumbPath)} className="hover:text-[var(--color-text)] transition-colors">{crumb}</button>
                  </span>
                );
              })}
            </div>
            <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--color-text)" }}>
              {selectedFolder ? selectedFolder.split("/").pop() : "All Notes & Files"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Mode tabs */}
            {([
              { key: "browse",  icon: <BookOpen size={12} />, title: "Browse" },
              { key: "capture", icon: <Plus size={12} />,     title: "Capture" },
              { key: "search",  icon: <Search size={12} />,   title: "Search" },
              { key: "graph",   icon: <Network size={12} />,  title: "Graph" },
            ] as const).map(({ key, icon, title }) => (
              <button
                key={key}
                onClick={() => { setMode(key); if (key !== "graph") setOpenItem(null); }}
                title={title}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${mode === key ? "bg-violet-500/20 text-violet-400" : "text-[var(--color-muted)] hover:bg-[var(--color-surface-hover)]"}`}
              >
                {icon}
              </button>
            ))}
            <button onClick={() => fileInputRef.current?.click()} className="btn-ghost px-2 py-1 flex items-center gap-1">
              <Upload size={12} /><span className="text-xs">Upload</span>
            </button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
          </div>
        </div>

        {/* Toast */}
        {(error || success) && (
          <div className={`mx-4 mb-2 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 ${error ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"}`}>
            {error ? <AlertCircle size={11} /> : <Check size={11} />}
            <span className="truncate">{error || success}</span>
            <button className="ml-auto shrink-0" onClick={() => { setError(null); setSuccess(null); }}><X size={10} /></button>
          </div>
        )}

        {/* ── Browse mode ── */}
        {mode === "browse" && (
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {loadingContent ? (
              <div className="flex justify-center py-12"><RefreshCw size={16} className="animate-spin" style={{ color: "var(--color-muted)" }} /></div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <Folder size={32} className="mb-3 opacity-20" style={{ color: "var(--color-muted)" }} />
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>This folder is empty</p>
                <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>Use the Capture tab to add a note, or upload files</p>
                <button onClick={() => setMode("capture")} className="btn-primary mt-4 px-4 py-1.5 text-xs flex items-center gap-1.5">
                  <Plus size={12} /> Add first note
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.path}
                  onClick={() => item.type === "note" ? openNote(item) : window.open(`/api/files/download?path=${encodeURIComponent(item.path)}`, "_blank")}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 cursor-pointer transition-colors group
                    ${openItem?.path === item.path ? "bg-violet-500/15" : "hover:bg-[var(--color-surface-hover)]"}`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.type === "note"
                      ? <FileText size={14} className="text-violet-400/70" />
                      : <FileIcon mimeType={item.mimeType} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--color-text)" }}>{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>{fmtDate(item.date)}</span>
                      {item.type === "note" && item.tags && item.tags.slice(0, 2).map((t) => (
                        <span key={t} className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-violet-500/10 text-violet-400">
                          <Tag size={8} />{t.replace(/^#/, "")}
                        </span>
                      ))}
                    </div>
                  </div>
                  {item.type === "note" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNote(item.path); }}
                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-1 rounded hover:bg-red-500/10 transition-all shrink-0"
                    >
                      <Trash2 size={11} className="text-red-400" />
                    </button>
                  )}
                  {item.type === "file" && (
                    <Download size={11} className="opacity-0 group-hover:opacity-60 shrink-0 mt-1" style={{ color: "var(--color-muted)" }} />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Capture mode ── */}
        {mode === "capture" && (
          <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
            <p className="text-xs pt-1" style={{ color: "var(--color-muted)" }}>
              Saving to: <strong className="text-violet-400">{selectedFolder || "inbox"}</strong>
            </p>
            <input
              value={captureTitle}
              onChange={(e) => setCaptureTitle(e.target.value)}
              placeholder="Title"
              className="input-field text-sm py-2 px-3"
            />
            <textarea
              value={captureText}
              onChange={(e) => setCaptureText(e.target.value)}
              placeholder="Write your note, paste content, ideas…"
              rows={8}
              className="glass-input flex-1 px-3 py-2 text-xs resize-none"
              style={{ fontFamily: "inherit", lineHeight: "1.6" }}
            />
            <input
              value={captureTags}
              onChange={(e) => setCaptureTags(e.target.value)}
              placeholder="Tags: idea project (space or comma)"
              className="input-field text-xs py-2 px-3"
            />
            <button onClick={capture} disabled={capturing} className="btn-primary flex items-center justify-center gap-2 py-2">
              {capturing ? <RefreshCw size={13} className="animate-spin" /> : <Brain size={13} />}
              {capturing ? "Saving…" : "Save Note"}
            </button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" style={{ borderColor: "var(--color-border)" }} /></div>
              <div className="relative flex justify-center"><span className="px-2 text-[10px]" style={{ color: "var(--color-muted)", background: "var(--color-bg)" }}>or drop a file</span></div>
            </div>
            <label className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed text-xs cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors"
              style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}>
              <Upload size={12} /> Upload file to this folder
              <input type="file" multiple className="hidden" onChange={(e) => { handleUpload(e.target.files); setMode("browse"); }} />
            </label>
          </div>
        )}

        {/* ── Search mode ── */}
        {mode === "search" && (
          <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
            <div className="flex gap-2 pt-1">
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Search all notes…"
                className="input-field flex-1 text-sm py-2 px-3"
              />
              <button onClick={runSearch} disabled={searching} className="btn-primary px-3 py-2">
                {searching ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
              </button>
            </div>
            {searchResults.length === 0 && searchQ && !searching && (
              <p className="text-xs text-center py-4" style={{ color: "var(--color-muted)" }}>No results — notes must be indexed after saving.</p>
            )}
            {searchResults.map((r) => (
              <button
                key={r.path}
                onClick={() => { setOpenItem({ type: "note", name: r.title, path: r.path, date: "", content: r.content }); setEditContent(r.content); setEditing(false); setMode("browse"); }}
                className="w-full text-left p-3 rounded-xl border hover:bg-[var(--color-surface-hover)] transition-colors"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{r.title}</p>
                  {r.score !== undefined && <span className="text-[10px] text-violet-400">{(r.score * 100).toFixed(0)}%</span>}
                </div>
                <p className="text-[11px] line-clamp-2" style={{ color: "var(--color-muted)" }}>{r.content}</p>
              </button>
            ))}
          </div>
        )}
      </div>}

      {/* ── Right: Note Viewer ─────────────────────────────────────────────── */}
      {openItem && (
        <div
          className="flex flex-col flex-1 min-w-0 animate-fade-in"
          style={{ borderLeft: "1px solid var(--color-border)" }}
        >
          {/* Viewer header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>{openItem.name}</h2>
              <p className="text-[10px] font-mono opacity-50 truncate mt-0.5" style={{ color: "var(--color-muted)" }}>{openItem.path}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {openItem.tags?.map((t) => (
                <span key={t} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400">
                  <Tag size={9} />{t.replace(/^#/, "")}
                </span>
              ))}
              {editing ? (
                <>
                  <button onClick={() => setEditing(false)} className="btn-ghost px-2.5 py-1 text-xs">Cancel</button>
                  <button onClick={saveNote} disabled={savingNote} className="btn-primary px-2.5 py-1 text-xs flex items-center gap-1">
                    {savingNote ? <RefreshCw size={10} className="animate-spin" /> : <Check size={10} />}
                    Save
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="btn-ghost px-2.5 py-1 text-xs flex items-center gap-1">
                  <Pencil size={10} /> Edit
                </button>
              )}
              <button onClick={() => setOpenItem(null)} className="p-1.5 rounded hover:bg-[var(--color-surface-hover)] transition-colors">
                <X size={13} style={{ color: "var(--color-muted)" }} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {editing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="glass-input w-full min-h-full h-full px-4 py-3 text-sm resize-none font-mono"
                style={{ lineHeight: "1.7" }}
              />
            ) : (
              <pre className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--color-text)", fontFamily: "inherit" }}>
                {editContent}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
