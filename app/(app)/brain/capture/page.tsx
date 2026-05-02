"use client";

import { useState } from "react";

export default function BrainCapturePage() {
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedPath, setSavedPath] = useState("");

  async function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) return;

    setStatus("saving");
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith("#") ? t : `#${t}`));

      const title = trimmed.slice(0, 60).replace(/\s+/g, " ");

      const res = await fetch("/api/brain/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, title, tags: tagList }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Failed to save");
      }

      const data = (await res.json()) as { path?: string };
      setSavedPath(data.path || "");
      setStatus("saved");
      setText("");
      setTags("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Quick Capture</h1>
        <p className="text-sm text-gray-500 mt-1">
          Save anything to your second brain instantly.
        </p>
      </div>

      <div className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          placeholder="What's on your mind? Paste a link, write a thought, dump raw notes…"
          rows={8}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags (comma-separated, e.g. research, idea)"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleSave}
          disabled={!text.trim() || status === "saving"}
          className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {status === "saving" ? "Saving…" : "Save to Brain"}
        </button>

        {status === "saved" && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Saved{savedPath ? ` → ${savedPath}` : ""}
          </p>
        )}
        {status === "error" && (
          <p className="text-sm text-red-500">
            Failed to save. Check that the vault is configured.
          </p>
        )}
      </div>

      <div className="text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-1">
        <p>Notes are saved to <code>inbox/</code> in your vault and indexed for semantic search.</p>
        <p>
          You can also capture via Telegram: send any message to your bot, or use{" "}
          <code>/note &lt;text&gt;</code>.
        </p>
      </div>
    </div>
  );
}
