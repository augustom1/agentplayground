"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Clock, ChevronRight, Loader2, X } from "lucide-react";

type Agent = { id: string; name: string; model: string; description?: string };
type Member = { agentId: string; agent: Agent; role: string | null };
type PlaygroundTeam = {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  color: string | null;
  members: Member[];
  updatedAt: string;
  _count: { threads: number };
};

const EMOJI_OPTIONS = ["💼", "🤖", "🧠", "🚀", "📊", "🎯", "🔬", "🛠️", "🌐", "⚡"];
const COLOR_OPTIONS = [
  "#38BDF8", "#6bcb8b", "#e8b84a", "#e06b6b",
  "#a78bfa", "#f97316", "#ec4899", "#14b8a6",
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function TeamCard({ team, onClick }: { team: PlaygroundTeam; onClick: () => void }) {
  const accent = team.color ?? "var(--color-brand)";
  const shown = team.members.slice(0, 5);
  const extra = team.members.length - shown.length;

  return (
    <button
      onClick={onClick}
      className="glass-card rounded-2xl p-5 text-left flex flex-col gap-4 group transition-all hover:shadow-lg w-full"
      style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}
        >
          {team.emoji ?? "🤖"}
        </div>
        <ChevronRight
          size={16}
          className="opacity-0 group-hover:opacity-100 transition-opacity mt-1"
          style={{ color: accent }}
        />
      </div>

      {/* Name + desc */}
      <div className="flex-1">
        <p className="font-semibold text-[15px]" style={{ color: "var(--color-text)" }}>{team.name}</p>
        {team.description && (
          <p className="text-[12px] mt-1 leading-relaxed line-clamp-2" style={{ color: "var(--color-muted)" }}>
            {team.description}
          </p>
        )}
      </div>

      {/* Members + meta */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5">
            {shown.map((m) => (
              <div
                key={m.agentId}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2"
                style={{
                  background: `${accent}30`,
                  borderColor: "var(--color-surface-2)",
                  color: accent,
                }}
                title={m.agent.name}
              >
                {m.agent.name[0]}
              </div>
            ))}
            {extra > 0 && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] border-2"
                style={{ background: "var(--color-surface-3)", borderColor: "var(--color-surface-2)", color: "var(--color-muted)" }}
              >
                +{extra}
              </div>
            )}
          </div>
          <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
            {team.members.length} agent{team.members.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1" style={{ color: "var(--color-muted)" }}>
          <Clock size={11} />
          <span className="text-[11px]">{timeAgo(team.updatedAt)}</span>
        </div>
      </div>

      {/* Thread count */}
      <div
        className="text-[11px] px-2 py-1 rounded-md self-start"
        style={{ background: `${accent}15`, color: accent }}
      >
        {team._count.threads} thread{team._count.threads !== 1 ? "s" : ""}
      </div>
    </button>
  );
}

function NewTeamModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🤖");
  const [color, setColor] = useState("#38BDF8");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<{ id: string; role: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentsLoading, setAgentsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => setAgents(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setAgentsLoading(false));
  }, []);

  const toggleAgent = (id: string) => {
    setSelected((prev) =>
      prev.find((s) => s.id === id)
        ? prev.filter((s) => s.id !== id)
        : [...prev, { id, role: "" }]
    );
  };

  const setRole = (id: string, role: string) => {
    setSelected((prev) => prev.map((s) => (s.id === id ? { ...s, role } : s)));
  };

  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/playground/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          emoji,
          color,
          agentIds: selected.map((s) => s.id),
          agentRoles: selected.map((s) => s.role || null),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const team = await res.json();
      onCreated(team.id);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-5"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[16px]" style={{ color: "var(--color-text)" }}>New Team</h2>
          <button onClick={onClose} style={{ color: "var(--color-muted)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Emoji + color */}
        <div className="flex gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-medium" style={{ color: "var(--color-muted)" }}>ICON</label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className="w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all"
                  style={{
                    background: emoji === e ? "var(--color-surface-3)" : "transparent",
                    border: `1px solid ${emoji === e ? "var(--color-border-light)" : "transparent"}`,
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Color swatches */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-medium" style={{ color: "var(--color-muted)" }}>ACCENT COLOR</label>
          <div className="flex gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-transform"
                style={{
                  background: c,
                  outline: color === c ? `2px solid ${c}` : "none",
                  outlineOffset: "2px",
                  transform: color === c ? "scale(1.15)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium" style={{ color: "var(--color-muted)" }}>TEAM NAME *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Business Strategy"
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium" style={{ color: "var(--color-muted)" }}>DESCRIPTION</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this team do?"
            rows={2}
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none resize-none"
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          />
        </div>

        {/* Agents */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-medium" style={{ color: "var(--color-muted)" }}>AGENTS</label>
          {agentsLoading ? (
            <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>Loading agents…</p>
          ) : agents.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>No agents yet. Create some in Agent Lab first.</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
              {agents.map((a) => {
                const sel = selected.find((s) => s.id === a.id);
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{
                      background: sel ? "var(--color-brand-dim)" : "var(--color-surface-2)",
                      border: `1px solid ${sel ? "var(--color-brand)" : "var(--color-border)"}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!sel}
                      onChange={() => toggleAgent(a.id)}
                      className="accent-blue-400"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium" style={{ color: "var(--color-text)" }}>{a.name}</p>
                      <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>{a.model}</p>
                    </div>
                    {sel && (
                      <input
                        value={sel.role}
                        onChange={(e) => setRole(a.id, e.target.value)}
                        placeholder="Role (optional)"
                        className="text-[11px] rounded px-2 py-1 w-28 outline-none"
                        style={{
                          background: "var(--color-surface-3)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px]"
            style={{ color: "var(--color-muted)", background: "var(--color-surface-2)" }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading || !name.trim()}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-2 disabled:opacity-50"
            style={{ background: color, color: "#fff" }}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            Create Team
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlaygroundPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<PlaygroundTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/playground/teams");
      if (res.ok) setTeams(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Playground</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--color-muted)" }}>
            Create agent teams and chat with them as a unified interface.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all"
          style={{ background: "var(--color-brand)", color: "#fff" }}
        >
          <Plus size={15} />
          New Team
        </button>
      </div>

      {/* Teams grid */}
      {loading ? (
        <div className="flex items-center gap-2 py-12 justify-center" style={{ color: "var(--color-muted)" }}>
          <Loader2 size={18} className="animate-spin" />
          <span className="text-[13px]">Loading teams…</span>
        </div>
      ) : teams.length === 0 ? (
        <div
          className="glass-card rounded-2xl p-12 flex flex-col items-center gap-4 text-center"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: "var(--color-surface-2)" }}
          >
            🤖
          </div>
          <div>
            <p className="font-semibold text-[15px]" style={{ color: "var(--color-text)" }}>No teams yet</p>
            <p className="text-[13px] mt-1" style={{ color: "var(--color-muted)" }}>
              Create your first agent team to start multi-agent conversations.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold"
            style={{ background: "var(--color-brand)", color: "#fff" }}
          >
            <Plus size={14} />
            Create Your First Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onClick={() => router.push(`/playground/${team.id}`)}
            />
          ))}
        </div>
      )}

      {/* Stats bar */}
      {teams.length > 0 && (
        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center gap-1.5" style={{ color: "var(--color-muted)" }}>
            <Users size={13} />
            <span className="text-[12px]">{teams.length} team{teams.length !== 1 ? "s" : ""}</span>
          </div>
          <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>·</span>
          <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
            {teams.reduce((s, t) => s + t.members.length, 0)} total agents
          </span>
          <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>·</span>
          <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
            {teams.reduce((s, t) => s + t._count.threads, 0)} threads
          </span>
        </div>
      )}

      {showModal && (
        <NewTeamModal
          onClose={() => setShowModal(false)}
          onCreated={(id) => {
            setShowModal(false);
            router.push(`/playground/${id}`);
          }}
        />
      )}
    </div>
  );
}
