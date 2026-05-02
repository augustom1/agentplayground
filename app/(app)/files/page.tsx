"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Folder, File, Upload, FolderPlus, Trash2, Download,
  RefreshCw, ChevronRight, Home, Brain, Search, X,
  FileText, Image, Code, Database, AlertCircle, Check,
  MessageSquare, Send, Bot, User2, ChevronLeft,
} from "lucide-react";

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
  mimeType: string | null;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

function FileIcon({ mimeType, isDirectory }: { mimeType: string | null; isDirectory: boolean }) {
  if (isDirectory) return <Folder size={16} className="text-yellow-400" />;
  if (!mimeType) return <File size={16} className="text-gray-400" />;
  if (mimeType.startsWith("image/")) return <Image size={16} className="text-blue-400" />;
  if (mimeType.startsWith("text/") || mimeType === "application/json") return <FileText size={16} className="text-green-400" />;
  if (mimeType === "application/pdf") return <File size={16} className="text-red-400" />;
  if (mimeType.includes("python") || mimeType.includes("javascript") || mimeType.includes("typescript")) return <Code size={16} className="text-purple-400" />;
  if (mimeType.includes("csv") || mimeType.includes("sql")) return <Database size={16} className="text-cyan-400" />;
  return <File size={16} className="text-gray-400" />;
}

export default function FilesPage() {
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [embedding, setEmbedding] = useState<string | null>(null);
  const [embeddedPaths, setEmbeddedPaths] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newFolderRef = useRef<HTMLInputElement>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string; id: string }>>([
    { id: "init", role: "assistant", content: "Hi! I'm the File Keeper. I can help you find, organize, and understand your files. What are you looking for?" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function sendChatMessage() {
    if (!chatInput.trim() || chatStreaming) return;
    const text = chatInput.trim();
    setChatInput("");

    const userMsg = { id: Date.now().toString(), role: "user" as const, content: text };
    setChatMessages((prev) => [...prev, userMsg]);

    const assistantId = (Date.now() + 1).toString();
    setChatMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
    setChatStreaming(true);
    chatAbortRef.current = new AbortController();

    // Build context from current file listing
    const fileContext = entries.length > 0
      ? `\n\nCurrent directory: "${currentPath || "root"}"\nFiles and folders:\n${entries.map((e) => `- ${e.isDirectory ? "[DIR]" : "[FILE]"} ${e.name}${e.size ? ` (${formatSize(e.size)})` : ""}`).join("\n")}`
      : "\n\nThe current directory is empty or not loaded yet.";

    const systemContext = `You are the File Keeper, a helpful librarian agent managing the user's shared file storage. You help users find files, organize them, create new ones, and understand their contents.${fileContext}\n\nYou can suggest using the UI buttons to upload files, create folders, download, or delete. For complex organization tasks, tell the user what to do step by step.`;

    try {
      const apiMessages = chatMessages
        .filter((m) => m.id !== "init")
        .concat(userMsg)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          provider: "ollama",
          model: "qwen2.5:7b",
          systemContext,
        }),
        signal: chatAbortRef.current.signal,
      });

      if (!res.ok) throw new Error(await res.text());

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setChatMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m)
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setChatMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: "Sorry, I couldn't connect. Make sure Ollama is running." } : m)
        );
      }
    } finally {
      setChatStreaming(false);
    }
  }

  const loadDir = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    setSelected(new Set());
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(p)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEntries(data.entries ?? []);
      setCurrentPath(p);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load root on mount
  useEffect(() => { loadDir(""); }, [loadDir]);

  const navigate = (p: string) => loadDir(p);

  const breadcrumbs = currentPath ? currentPath.split("/") : [];

  const handleUpload = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    const formData = new FormData();
    formData.append("path", currentPath);
    list.forEach((f) => formData.append("files", f));

    setLoading(true);
    try {
      const res = await fetch("/api/files/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`Uploaded ${data.uploaded.length} file(s)`);
      await loadDir(currentPath);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
  };

  const handleDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} item(s)?`)) return;
    setLoading(true);
    try {
      for (const p of selected) {
        await fetch(`/api/files?path=${encodeURIComponent(p)}`, { method: "DELETE" });
      }
      await loadDir(currentPath);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (entry: FileEntry) => {
    window.open(`/api/files/download?path=${encodeURIComponent(entry.path)}`, "_blank");
  };

  const handleEmbed = async (entry: FileEntry) => {
    setEmbedding(entry.path);
    setError(null);
    try {
      const res = await fetch("/api/files/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: entry.path }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmbeddedPaths((prev) => new Set([...prev, entry.path]));
      setSuccess(`Embedded ${data.embeddedChunks} chunk(s) from ${entry.name}`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (e) {
      setError(String(e));
    } finally {
      setEmbedding(null);
    }
  };

  const handleNewFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    const rel = currentPath ? `${currentPath}/${name}` : name;
    setLoading(true);
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: rel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowNewFolder(false);
      setNewFolderName("");
      await loadDir(currentPath);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (p: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const filteredEntries = search
    ? entries.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : entries;

  const isEmbeddable = (e: FileEntry) => !e.isDirectory && e.mimeType &&
    (e.mimeType.startsWith("text/") || e.mimeType === "application/json" ||
     e.mimeType.includes("csv") || e.mimeType.includes("sql") || e.mimeType.includes("yaml"));

  return (
    <div
      className="flex h-full animate-fade-in"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Main file browser column */}
      <div className="flex flex-col flex-1 min-w-0">

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-3">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>Files</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            Shared file storage — agents can read, write, and embed files
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary flex items-center gap-1.5 px-3 py-2 text-xs"
          >
            <Upload size={13} /> Upload
          </button>
          <button
            onClick={() => { setShowNewFolder(true); setTimeout(() => newFolderRef.current?.focus(), 50); }}
            className="btn-ghost flex items-center gap-1.5 px-3 py-2"
          >
            <FolderPlus size={13} /> New Folder
          </button>
          {selected.size > 0 && (
            <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-400/10 transition-colors">
              <Trash2 size={13} /> Delete ({selected.size})
            </button>
          )}
          <button onClick={() => loadDir(currentPath)} className="btn-ghost flex items-center gap-1.5 px-3 py-2">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setChatOpen((v) => !v)}
            className="btn-ghost flex items-center gap-1.5 px-3 py-2"
            title="File Keeper — AI assistant"
            style={{ color: chatOpen ? "var(--color-text)" : "var(--color-muted)" }}
          >
            <MessageSquare size={13} />
            {!chatOpen && <span className="text-xs">Ask AI</span>}
          </button>
        </div>
      </div>

      {/* Toast messages */}
      {(error || success) && (
        <div className={`mx-6 mb-2 px-4 py-2 rounded-lg text-xs flex items-center gap-2 ${error ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"}`}>
          {error ? <AlertCircle size={13} /> : <Check size={13} />}
          {error || success}
          <button className="ml-auto" onClick={() => { setError(null); setSuccess(null); }}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* New Folder Input */}
      {showNewFolder && (
        <div className="mx-6 mb-2 flex items-center gap-2">
          <input
            ref={newFolderRef}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleNewFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
            placeholder="Folder name"
            className="input-field flex-1 text-sm py-1.5 px-3"
          />
          <button onClick={handleNewFolder} className="btn-primary px-3 py-1.5 text-xs">Create</button>
          <button onClick={() => setShowNewFolder(false)} className="btn-ghost px-3 py-1.5 text-xs">Cancel</button>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="px-6 pb-2 flex items-center gap-1 text-xs" style={{ color: "var(--color-muted)" }}>
        <button onClick={() => navigate("")} className="hover:text-[var(--color-text)] flex items-center gap-1 transition-colors">
          <Home size={12} /> Root
        </button>
        {breadcrumbs.map((crumb, i) => {
          const crumbPath = breadcrumbs.slice(0, i + 1).join("/");
          return (
            <span key={crumbPath} className="flex items-center gap-1">
              <ChevronRight size={12} />
              <button onClick={() => navigate(crumbPath)} className="hover:text-[var(--color-text)] transition-colors">
                {crumb}
              </button>
            </span>
          );
        })}
      </div>

      {/* Search */}
      <div className="px-6 pb-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter files…"
            className="input-field w-full pl-8 pr-3 py-1.5 text-xs"
          />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
              <X size={12} style={{ color: "var(--color-muted)" }} />
            </button>
          )}
        </div>
      </div>

      {/* File list */}
      <div
        className={`flex-1 mx-6 mb-6 rounded-2xl overflow-hidden transition-all ${dragging ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-[var(--color-bg)]" : ""}`}
        style={{ border: "1px solid var(--color-border)" }}
      >
        {dragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-violet-500/10 rounded-2xl pointer-events-none">
            <div className="text-center">
              <Upload size={32} className="mx-auto mb-2 text-violet-400" />
              <p className="text-sm text-violet-400 font-medium">Drop to upload</p>
            </div>
          </div>
        )}

        {/* Table header */}
        <div
          className="grid grid-cols-[auto_1fr_120px_100px_160px] gap-3 px-4 py-2 text-xs font-medium border-b"
          style={{ color: "var(--color-muted)", borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <div className="w-4" />
          <div>Name</div>
          <div className="text-right">Size</div>
          <div className="text-right">Modified</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Entries */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
          {loading && !entries.length ? (
            <div className="flex items-center justify-center py-16 text-xs" style={{ color: "var(--color-muted)" }}>
              <RefreshCw size={16} className="animate-spin mr-2" /> Loading…
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Folder size={32} className="mb-3 opacity-20" style={{ color: "var(--color-muted)" }} />
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                {search ? "No files match your search" : "This folder is empty"}
              </p>
              {!search && (
                <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                  Drop files here or click Upload
                </p>
              )}
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isEmbedded = embeddedPaths.has(entry.path);
              const isEmbedding = embedding === entry.path;
              return (
                <div
                  key={entry.path}
                  className={`grid grid-cols-[auto_1fr_120px_100px_160px] gap-3 px-4 py-2.5 text-xs border-b items-center transition-colors cursor-default
                    ${selected.has(entry.path) ? "bg-violet-500/10" : "hover:bg-[var(--color-surface-hover)]"}`}
                  style={{ borderColor: "var(--color-border)" }}
                  onDoubleClick={() => entry.isDirectory && navigate(entry.path)}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selected.has(entry.path)}
                    onChange={() => toggleSelect(entry.path)}
                    className="w-3.5 h-3.5 rounded accent-violet-500"
                    onClick={(e) => e.stopPropagation()}
                  />

                  {/* Name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <FileIcon mimeType={entry.mimeType} isDirectory={entry.isDirectory} />
                    <button
                      className="truncate font-medium hover:underline text-left"
                      style={{ color: "var(--color-text)" }}
                      onClick={() => entry.isDirectory ? navigate(entry.path) : undefined}
                    >
                      {entry.name}
                    </button>
                    {isEmbedded && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-violet-500/15 text-violet-400 whitespace-nowrap">
                        <Brain size={10} /> Embedded
                      </span>
                    )}
                  </div>

                  {/* Size */}
                  <div className="text-right tabular-nums" style={{ color: "var(--color-muted)" }}>
                    {formatSize(entry.size)}
                  </div>

                  {/* Modified */}
                  <div className="text-right" style={{ color: "var(--color-muted)" }}>
                    {formatDate(entry.modifiedAt)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    {!entry.isDirectory && (
                      <button
                        onClick={() => handleDownload(entry)}
                        className="p-1.5 rounded hover:bg-[var(--color-border)] transition-colors"
                        title="Download"
                      >
                        <Download size={12} style={{ color: "var(--color-muted)" }} />
                      </button>
                    )}
                    {isEmbeddable(entry) && !isEmbedded && (
                      <button
                        onClick={() => handleEmbed(entry)}
                        disabled={isEmbedding}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-colors disabled:opacity-50"
                        title="Embed into vector DB for AI search"
                      >
                        {isEmbedding ? <RefreshCw size={10} className="animate-spin" /> : <Brain size={10} />}
                        {isEmbedding ? "Embedding…" : "Embed"}
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete "${entry.name}"?`)) return;
                        await fetch(`/api/files?path=${encodeURIComponent(entry.path)}`, { method: "DELETE" });
                        await loadDir(currentPath);
                      }}
                      className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={12} className="text-red-400/60 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleUpload(e.target.files)}
      />

      {/* Info bar */}
      <div className="px-6 pb-4 flex items-center gap-4 text-xs" style={{ color: "var(--color-muted)" }}>
        <span>{filteredEntries.length} item(s)</span>
        {selected.size > 0 && <span>· {selected.size} selected</span>}
        <span className="ml-auto flex items-center gap-1">
          <Brain size={11} /> Files with <span className="text-violet-400">Embed</span> button can be searched by AI agents
        </span>
      </div>

      </div>{/* end main column */}

      {/* FileKeeper Chat Panel */}
      {chatOpen && (
        <div
          className="flex flex-col shrink-0 animate-fade-in"
          style={{
            width: "340px",
            borderLeft: "1px solid var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          {/* Chat header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ background: "rgba(99,102,241,0.18)" }}
              >
                <Bot size={13} style={{ color: "rgba(165,180,252,0.9)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>File Keeper</p>
                <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>Ollama · qwen2.5:7b</p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="p-1.5 rounded hover:bg-[var(--color-border)] transition-colors"
              style={{ color: "var(--color-muted)" }}
            >
              <ChevronLeft size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3" style={{ minHeight: 0 }}>
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div
                  className="w-6 h-6 shrink-0 flex items-center justify-center rounded-md mt-0.5"
                  style={{
                    background: msg.role === "user" ? "var(--color-surface-3)" : "rgba(99,102,241,0.18)",
                  }}
                >
                  {msg.role === "user"
                    ? <User2 size={11} style={{ color: "var(--color-text-secondary)" }} />
                    : <Bot size={11} style={{ color: "rgba(165,180,252,0.9)" }} />
                  }
                </div>
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "8px 11px",
                    borderRadius: msg.role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                    background: msg.role === "user" ? "var(--color-surface-3)" : "var(--color-surface-2)",
                    color: "var(--color-text)",
                    fontSize: "12.5px",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.content === "" && chatStreaming ? <span style={{ opacity: 0.45 }}>▊</span> : msg.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid var(--color-border)" }}>
            <div className="flex gap-2 items-end">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
                }}
                placeholder="Ask about your files..."
                rows={2}
                className="glass-input flex-1 px-3 py-2 text-xs resize-none"
                style={{ fontFamily: "inherit", lineHeight: "1.5" }}
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || chatStreaming}
                className="btn-primary px-3 py-2 flex items-center justify-center shrink-0"
              >
                {chatStreaming
                  ? <RefreshCw size={13} className="animate-spin" />
                  : <Send size={13} />
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
