"use client";

import { useEffect, useState } from "react";
import { BookOpen, FileText, CheckCircle, Clock, ExternalLink, RefreshCw } from "lucide-react";

interface BlogPost {
  path: string;
  title: string;
  tags: string[];
  updatedAt: string;
  summary?: string;
  slug?: string;
  content?: string;
  status?: string;
}

const PLANNED_POSTS = [
  { id: 1, title: "Deploy Your Own AI Agent Platform on a VPS for Under $20/month", tags: ["vps", "tutorial"] },
  { id: 2, title: "What Are AI Agent Teams and Why Every Solo Operator Needs One", tags: ["ai-agents"] },
  { id: 3, title: "Building a 2nd Brain with AI: Your Knowledge Base, Your Rules", tags: ["knowledge"] },
  { id: 4, title: "The Pipeline: How to Let AI Do the Heavy Lifting on Any Document", tags: ["tutorial"] },
  { id: 5, title: "Self-Hosting vs Cloud AI: The Real Cost Comparison in 2025", tags: ["vps", "analysis"] },
  { id: 6, title: "How MCP Protocol Connects Any AI Tool to Your Private Agent Platform", tags: ["mcp"] },
  { id: 7, title: "Local LLMs + Claude: A Hybrid Setup That Saves Money", tags: ["ollama"] },
  { id: 8, title: "From Telegram Message to Vault Note: Building an Autonomous Content Pipeline", tags: ["tutorial"] },
  { id: 9, title: "Inside the Keeper: How a Coordinator Agent Manages Your Teams", tags: ["ai-agents"] },
  { id: 10, title: "Why Your AI Should Live on Your Server, Not Someone Else's", tags: ["philosophy"] },
  { id: 11, title: "How to Set Up a Blog That Writes Itself (With AI Agent Teams)", tags: ["tutorial"] },
  { id: 12, title: "VPS Basics for AI Builders: What You Actually Need to Know", tags: ["vps"] },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    published: "bg-green-500/20 text-green-400 border-green-500/30",
    ready: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    draft: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };
  return map[status] ?? "bg-gray-700 text-gray-400 border-gray-600";
}

export default function BlogPage() {
  const [vaultPosts, setVaultPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/brain/notes?tag=blog-post&limit=100");
      const data = await res.json();
      const posts = (data.notes ?? [])
        .filter((n: BlogPost) => !n.path.includes("-social"))
        .map((n: BlogPost) => {
          const statusMatch = n.content?.match(/status:\s*(\w+)/);
          const summaryMatch = n.content?.match(/summary:\s*(.+)/);
          const slugMatch = n.path.match(/Blog\/(.+?)(?:-draft)?\.md/);
          return {
            ...n,
            status: statusMatch?.[1] ?? "draft",
            summary: summaryMatch?.[1]?.trim() ?? "",
            slug: slugMatch?.[1] ?? n.path,
          };
        });
      setVaultPosts(posts);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const published = vaultPosts.filter((p) => p.status === "published");
  const ready = vaultPosts.filter((p) => p.status === "ready");
  const drafts = vaultPosts.filter((p) => p.status === "draft");

  // match planned posts to vault posts by title similarity
  function findVaultPost(title: string) {
    return vaultPosts.find((p) =>
      p.title?.toLowerCase().includes(title.toLowerCase().slice(0, 20))
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6" style={{ color: "var(--color-text-secondary)" }} />
            Blog Pipeline
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Managed by the <span style={{ color: "var(--color-brand)" }}>Blog Team</span> — posts saved to vault under{" "}
            <code style={{ background: "var(--color-surface-3)", padding: "0 4px", borderRadius: 4 }} className="text-xs">Blog/</code>, served at{" "}
            <a
              href="https://agentplayground.net/blog"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline inline-flex items-center gap-1"
              style={{ color: "var(--color-brand)" }}
            >
              agentplayground.net/blog <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:bg-gray-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Published", count: published.length, icon: CheckCircle, color: "text-green-400" },
          { label: "Ready to publish", count: ready.length, icon: FileText, color: "text-blue-400" },
          { label: "In draft", count: drafts.length, icon: Clock, color: "text-yellow-400" },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex items-center gap-3">
            <Icon className={`w-5 h-5 ${color}`} />
            <div>
              <div className="text-xl font-bold text-gray-100">{count}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Vault posts (actual) */}
      {vaultPosts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">In Vault</h2>
          <div className="space-y-2">
            {vaultPosts.map((post) => (
              <div
                key={post.path}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-100 font-medium text-sm truncate">{post.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBadge(post.status ?? "draft")}`}>
                      {post.status ?? "draft"}
                    </span>
                  </div>
                  {post.summary && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{post.summary}</p>}
                  <p className="text-xs text-gray-600 mt-1 font-mono">{post.path}</p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {new Date(post.updatedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Planned posts queue */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Post Queue — {PLANNED_POSTS.length} Planned
        </h2>
        <div className="space-y-2">
          {PLANNED_POSTS.map((post) => {
            const vaultPost = findVaultPost(post.title);
            return (
              <div
                key={post.id}
                className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 font-mono w-6 text-right">{post.id}</span>
                  <div>
                    <span className="text-gray-300 text-sm">{post.title}</span>
                    <div className="flex gap-1 mt-1">
                      {post.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-gray-700/50 text-gray-500 px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${
                    vaultPost ? statusBadge(vaultPost.status ?? "draft") : "bg-gray-800 text-gray-600 border-gray-700"
                  }`}
                >
                  {vaultPost ? (vaultPost.status ?? "draft") : "planned"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 text-sm text-gray-400 space-y-2">
        <p className="font-medium text-gray-300">How the pipeline works</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>Pick a post brief from the queue above</li>
          <li>Chat with the <span style={{ color: "var(--color-brand)" }}>Blog Team</span> → ask Quill to draft post #N</li>
          <li>Quill writes full post → Reed edits → Press publishes to vault</li>
          <li>Post appears at <code className="bg-gray-800 px-1 rounded">Blog/&lt;slug&gt;.md</code> with status: published</li>
          <li>Social snippet saved at <code className="bg-gray-800 px-1 rounded">Blog/&lt;slug&gt;-social.md</code> for Marketing Team</li>
        </ol>
      </div>
    </div>
  );
}
