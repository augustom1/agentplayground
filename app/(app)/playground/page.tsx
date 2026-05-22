"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Clock, ChevronRight, Loader2, X } from "lucide-react";

type Agent = { id: string; name: string; model: string; description?: string };
type Member = { agentId: string; agent: Agent; role: string | null; group: string | null };
type PlaygroundTeam = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  members: Member[];
  updatedAt: string;
  _count: { threads: number };
};

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

function getGroups(members: Member[]): Map<string, Member[]> {
  const groups = new Map<string, Member[]>();
  for (const m of members) {
    const key = m.group ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  return groups;
}

function PlaygroundCard({ team, onClick }: { team: PlaygroundTeam; onClick: () => void }) {
  const accent = team.color ?? "var(--color-brand)";
  const groups = getGroups(team.members);
  const namedGroups = [...groups.entries()].filter(([k]) => k !== "");
  const ungrouped = groups.get("") ?? [];

  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-5 text-left flex flex-col gap-4 group transition-all hover:shadow-lg w-full"
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-surface-2)",
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[15px] truncate" style={{ color: "var(--color-text)" }}>{team.name}</p>
          {team.description && (
            <p className="text-[12px] mt-1 leading-relaxed line-clamp-2" style={{ color: "var(--color-muted)" }}>
              {team.description}
            </p>
          )}
        </div>
        <ChevronRight
          size={16}
          className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0"
          style={{ color: accent }}
        />
      </div>

      {/* Named groups */}
      {namedGroups.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {namedGroups.slice(0, 3).map(([groupName, members]) => (
            <div key={groupName} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
              <span className="text-[11px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                {groupName}
              </span>
              <div className="flex -space-x-1 ml-1">
                {members.slice(0, 4).map((m) => (
                  <div
                    key={m.agentId}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border"
                    style={{ background: `${accent}25`, borderColor: "var(--color-surface-2)", color: accent }}
                    title={m.agent.name}
                  >
                    {m.agent.name[0]}
                  </div>
                ))}
                {members.length > 4 && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] border"
                    style={{ background: "var(--color-surface-3)", borderColor: "var(--color-surface-2)", color: "var(--color-muted)" }}
                  >
                    +{members.length - 4}
                  </div>
                )}
              </div>
            </div>
          ))}
          {namedGroups.length > 3 && (
            <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
              +{namedGroups.length - 3} more groups
            </span>
          )}
        </div>
      )}

      {/* Ungrouped agents (flat if no groups defined) */}
      {namedGroups.length === 0 && ungrouped.length > 0 && (
        <div className="flex -space-x-1.5">
          {ungrouped.slice(0, 6).map((m) => (
            <div
              key={m.agentId}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2"
              style={{ background: `${accent}25`, borderColor: "var(--color-surface-2)", color: accent }}
              title={m.agent.name}
            >
              {m.agent.name[0]}
            </div>
          ))}
          {ungrouped.length > 6 && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] border-2"
              style={{ background: "var(--color-surface-3)", borderColor: "var(--color-surface-2)", color: "var(--color-muted)" }}
            >
              +{ungrouped.length - 6}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span
          className="text-[11px] px-2 py-0.5 rounded"
          style={{ background: `${accent}15`, color: accent }}
        >
          {team._count.threads} thread{team._count.threads !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1" style={{ color: "var(--color-muted)" }}>
          <Clock size={11} />
          <span className="text-[11px]">{timeAgo(team.updatedAt)}</span>
        </div>
      </div>
    </button>
  );
}

function NewPlaygroundModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#38BDF8");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<{ id: string; role: string; group: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [pendingGroupName, setPendingGroupName] = useState<string>("");
  const [pendingGroupFor, setPendingGroupFor] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => setAgents(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setAgentsLoading(false));
  }, []);

  const usedGroups = [...new Set(selected.map((s) => s.group).filter(Boolean))];

  const toggleAgent = (id: string) =>
    setSelected((prev) =>
      prev.find((s) => s.id === id)
        ? prev.filter((s) => s.id !== id)
        : [...prev, { id, role: "", group: "" }]
    );

  const updateSelected = (id: string, field: "role" | "group", value: string) =>
    setSelected((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));

  const confirmNewGroup = (agentId: string) => {
    const val = pendingGroupName.trim();
    if (val) updateSelected(agentId, "group", val);
    setPendingGroupFor(null);
    setPendingGroupName("");
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
          color,
          agentIds: selected.map((s) => s.id),
          agentRoles: selected.map((s) => s.role || null),
          agentGroups: selected.map((s) => s.group || null),
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
        className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[16px]" style={{ color: "var(--color-text)" }}>New Playground</h2>
          <button onClick={onClose} style={{ color: "var(--color-muted)" }}>
            <X size={18} />
          </button>
        </div>

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

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium" style={{ color: "var(--color-muted)" }}>PLAYGROUND NAME *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Business Operations"
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium" style={{ color: "var(--color-muted)" }}>DESCRIPTION</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this playground do?"
            rows={2}
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none resize-none"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-medium" style={{ color: "var(--color-muted)" }}>AGENTS & GROUPS</label>
          <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
            Select agents and assign them to named groups within this playground.
          </p>
          {agentsLoading ? (
            <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>Loading agents...</p>
          ) : agents.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>No agents yet. Create some in Agent Lab first.</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
              {agents.map((a) => {
                const sel = selected.find((s) => s.id === a.id);
                const isNewGroup = sel?.group === "__new__";
                return (
                  <div
                    key={a.id}
                    className="rounded-lg px-3 py-2"
                    style={{
                      background: sel ? "var(--color-brand-dim)" : "var(--color-surface-2)",
                      border: `1px solid ${sel ? "var(--color-brand)" : "var(--color-border)"}`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!sel} onChange={() => toggleAgent(a.id)} className="accent-blue-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium" style={{ color: "var(--color-text)" }}>{a.name}</p>
                        <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>{a.model}</p>
                      </div>
                    </div>
                    {sel && (
                      <div className="flex gap-2 mt-1.5 ml-5">
                        {pendingGroupFor === a.id ? (
                          <div className="flex gap-1 flex-1">
                            <input
                              autoFocus
                              value={pendingGroupName}
                              onChange={(e) => setPendingGroupName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") confirmNewGroup(a.id); if (e.key === "Escape") { setPendingGroupFor(null); setPendingGroupName(""); } }}
                              placeholder="Group name"
                              className="text-[11px] rounded px-2 py-1 flex-1 outline-none"
                              style={{ background: "var(--color-surface-3)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                            />
                            <button
                              onClick={() => confirmNewGroup(a.id)}
                              className="text-[11px] px-2 py-1 rounded font-medium"
                              style={{ background: color, color: "#fff" }}
                            >
                              Add
                            </button>
                          </div>
                        ) : (
                          <select
                            value={isNewGroup ? "__new__" : sel.group}
                            onChange={(e) => {
                              if (e.target.value === "__new__") {
                                setPendingGroupFor(a.id);
                              } else {
                                updateSelected(a.id, "group", e.target.value);
                              }
                            }}
                            className="text-[11px] rounded px-2 py-1 flex-1 outline-none"
                            style={{ background: "var(--color-surface-3)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                          >
                            <option value="">No group</option>
                            {usedGroups.map((g) => <option key={g} value={g}>{g}</option>)}
                            <option value="__new__">+ New group...</option>
                          </select>
                        )}
                        <input
                          value={sel.role}
                          onChange={(e) => updateSelected(a.id, "role", e.target.value)}
                          placeholder="Role"
                          className="text-[11px] rounded px-2 py-1 w-24 outline-none"
                          style={{ background: "var(--color-surface-3)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
            Create Playground
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

  const totalAgents = teams.reduce((s, t) => s + t.members.length, 0);
  const totalThreads = teams.reduce((s, t) => s + t._count.threads, 0);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Playground</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--color-muted)" }}>
            Multi-agent workspaces with dashboards, agent groups, and coordination.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all"
          style={{ background: "var(--color-brand)", color: "#fff" }}
        >
          <Plus size={15} />
          New Playground
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 justify-center" style={{ color: "var(--color-muted)" }}>
          <Loader2 size={18} className="animate-spin" />
          <span className="text-[13px]">Loading playgrounds...</span>
        </div>
      ) : teams.length === 0 ? (
        <div
          className="rounded-2xl p-12 flex flex-col items-center gap-4 text-center"
          style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--color-surface-3)" }}
          >
            <Plus size={24} style={{ color: "var(--color-muted)" }} />
          </div>
          <div>
            <p className="font-semibold text-[15px]" style={{ color: "var(--color-text)" }}>No playgrounds yet</p>
            <p className="text-[13px] mt-1" style={{ color: "var(--color-muted)" }}>
              Create your first playground to start multi-agent coordination.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold"
            style={{ background: "var(--color-brand)", color: "#fff" }}
          >
            <Plus size={14} />
            Create Your First Playground
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <PlaygroundCard key={team.id} team={team} onClick={() => router.push(`/playground/${team.id}`)} />
          ))}
        </div>
      )}

      {teams.length > 0 && (
        <div className="flex items-center gap-4 pt-2">
          <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
            {teams.length} playground{teams.length !== 1 ? "s" : ""}
          </span>
          <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>·</span>
          <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>{totalAgents} agents</span>
          <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>·</span>
          <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>{totalThreads} conversations</span>
        </div>
      )}

      {showModal && (
        <NewPlaygroundModal
          onClose={() => setShowModal(false)}
          onCreated={(id) => { setShowModal(false); router.push(`/playground/${id}`); }}
        />
      )}
    </div>
  );
}
