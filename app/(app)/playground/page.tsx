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

type AgentTeamWithAgents = {
  id: string;
  name: string;
  description: string;
  category: string;
  _count: { agents: number };
  agents: { id: string; name: string; model: string; description?: string }[];
};

function NewPlaygroundModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#38BDF8");
  const [agentTeams, setAgentTeams] = useState<AgentTeamWithAgents[]>([]);
  // { agentId → { group, role } }
  const [selected, setSelected] = useState<Map<string, { group: string; role: string }>>(new Map());
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/teams").then((r) => r.json()),
      fetch("/api/agents").then((r) => r.json()),
    ])
      .then(([teams, allAgents]) => {
        const agentsByTeam = new Map<string, typeof allAgents[0][]>();
        for (const a of (allAgents as { id: string; name: string; model: string; description?: string; teamId: string }[])) {
          if (!agentsByTeam.has(a.teamId)) agentsByTeam.set(a.teamId, []);
          agentsByTeam.get(a.teamId)!.push(a);
        }
        const enriched = (teams as AgentTeamWithAgents[])
          .filter((t) => !("isSystemTeam" in t && t.isSystemTeam))
          .map((t) => ({ ...t, agents: agentsByTeam.get(t.id) ?? [] }));
        setAgentTeams(enriched);
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, []);

  // Toggle an entire Agent Team — adds/removes all its agents with group = team name
  const toggleTeam = (team: AgentTeamWithAgents) => {
    const allSelected = team.agents.every((a) => selected.has(a.id));
    const next = new Map(selected);
    if (allSelected) {
      for (const a of team.agents) next.delete(a.id);
    } else {
      for (const a of team.agents) {
        if (!next.has(a.id)) next.set(a.id, { group: team.name, role: "" });
      }
    }
    setSelected(next);
  };

  // Toggle a single agent
  const toggleAgent = (agentId: string, teamName: string) => {
    const next = new Map(selected);
    if (next.has(agentId)) {
      next.delete(agentId);
    } else {
      next.set(agentId, { group: teamName, role: "" });
    }
    setSelected(next);
  };

  const submit = async () => {
    if (!name.trim() || selected.size === 0) return;
    setLoading(true);
    const agentIds: string[] = [];
    const agentRoles: (string | null)[] = [];
    const agentGroups: (string | null)[] = [];
    for (const [id, meta] of selected) {
      agentIds.push(id);
      agentRoles.push(meta.role || null);
      agentGroups.push(meta.group || null);
    }
    try {
      const res = await fetch("/api/playground/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
          agentIds,
          agentRoles,
          agentGroups,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const team = await res.json();
      onCreated(team.id);
    } catch {
      setLoading(false);
    }
  };

  const selectedCount = selected.size;

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

        {/* Color */}
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
          <label className="text-[11px] font-medium" style={{ color: "var(--color-muted)" }}>PLAYGROUND NAME *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Business Operations"
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
          />
        </div>

        {/* Description */}
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

        {/* Agent Teams */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium" style={{ color: "var(--color-muted)" }}>AGENT TEAMS</label>
            {selectedCount > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: `${color}20`, color }}>
                {selectedCount} agent{selectedCount !== 1 ? "s" : ""} selected
              </span>
            )}
          </div>
          <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
            Select one or more Agent Teams. Each team becomes a group in the playground — agents stay organized by team.
          </p>
          {dataLoading ? (
            <div className="flex items-center gap-2 py-2" style={{ color: "var(--color-muted)" }}>
              <Loader2 size={13} className="animate-spin" />
              <span className="text-[12px]">Loading teams...</span>
            </div>
          ) : agentTeams.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>No agent teams yet. Create teams in Agent Lab first.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {agentTeams.map((team) => {
                const allSelected = team.agents.length > 0 && team.agents.every((a) => selected.has(a.id));
                const someSelected = team.agents.some((a) => selected.has(a.id));
                const isExpanded = expandedTeams.has(team.id);
                const accent = allSelected ? color : "var(--color-border)";

                return (
                  <div
                    key={team.id}
                    className="rounded-xl overflow-hidden"
                    style={{
                      border: `1px solid ${allSelected || someSelected ? color : "var(--color-border)"}`,
                      background: allSelected ? `${color}08` : "var(--color-surface-2)",
                    }}
                  >
                    {/* Team header row */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
                        onChange={() => toggleTeam(team)}
                        className="flex-shrink-0"
                        style={{ accentColor: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: "var(--color-text)" }}>{team.name}</p>
                        <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                          {team.agents.length} agent{team.agents.length !== 1 ? "s" : ""}
                          {team.category && team.category !== "General" ? ` · ${team.category}` : ""}
                        </p>
                      </div>
                      {/* Group label badge */}
                      {(allSelected || someSelected) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ background: `${color}20`, color }}>
                          group: {team.name}
                        </span>
                      )}
                      {/* Expand toggle */}
                      {team.agents.length > 0 && (
                        <button
                          onClick={() => setExpandedTeams((prev) => {
                            const next = new Set(prev);
                            next.has(team.id) ? next.delete(team.id) : next.add(team.id);
                            return next;
                          })}
                          className="p-1 rounded hover:opacity-70 flex-shrink-0"
                          style={{ color: "var(--color-muted)" }}
                        >
                          <ChevronRight
                            size={13}
                            style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}
                          />
                        </button>
                      )}
                    </div>

                    {/* Expanded agent list */}
                    {isExpanded && team.agents.length > 0 && (
                      <div className="px-3 pb-2 flex flex-col gap-1" style={{ borderTop: `1px solid ${accent}30` }}>
                        {team.agents.map((a) => {
                          const isSel = selected.has(a.id);
                          return (
                            <div key={a.id} className="flex items-center gap-2 pl-4 py-1">
                              <input
                                type="checkbox"
                                checked={isSel}
                                onChange={() => toggleAgent(a.id, team.name)}
                                style={{ accentColor: color }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px]" style={{ color: "var(--color-text)" }}>{a.name}</p>
                                <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>{a.model}</p>
                              </div>
                            </div>
                          );
                        })}
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
            disabled={loading || !name.trim() || selectedCount === 0}
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
