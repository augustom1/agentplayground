"use client";

import { useEffect, useRef, useState } from "react";
import {
  X, Loader2, Check, ArrowRight, ArrowLeft, Network, Users, LayoutGrid,
} from "lucide-react";

// Coordinator task router (Session 34): describe a task → coordinator picks the team →
// confirmation shows pick + reasoning → accept, or override via playground → team picker →
// dispatches through the delegate_to_team machinery (POST /api/route-task).

type PlaygroundItem = { id: string; name: string; teamIds: string[] };
type TeamItem = { id: string; name: string; isSystemTeam?: boolean };

type RouterState = "input" | "routing" | "confirm" | "override" | "dispatching" | "done";

type RoutePick = { teamId: string | null; teamName?: string; title: string; reasoning: string };

const BTN_PRIMARY: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8, border: "none",
  background: "var(--color-brand)", color: "#0a1628",
  cursor: "pointer", fontSize: 13, fontWeight: 600,
};

const BTN_GHOST: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "transparent", color: "var(--color-text-secondary)",
  cursor: "pointer", fontSize: 13,
};

const LIST_ROW: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, width: "100%",
  padding: "9px 12px", borderRadius: 8, border: "none",
  background: "transparent", cursor: "pointer", textAlign: "left",
  color: "var(--color-text)", fontSize: 13,
};

export function TaskRouter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, setState] = useState<RouterState>("input");
  const [description, setDescription] = useState("");
  const [pick, setPick] = useState<RoutePick | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Override picker data
  const [playgrounds, setPlaygrounds] = useState<PlaygroundItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [overridePg, setOverridePg] = useState<PlaygroundItem | null>(null);

  // Done state
  const [dispatchedTeam, setDispatchedTeam] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setState("input");
    setDescription("");
    setPick(null);
    setError(null);
    setOverridePg(null);
    setDispatchedTeam(null);
    setTimeout(() => inputRef.current?.focus(), 100);

    fetch("/api/playgrounds")
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => { if (Array.isArray(data)) setPlaygrounds(data as PlaygroundItem[]); })
      .catch(() => {});
    fetch("/api/teams")
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => { if (Array.isArray(data)) setTeams((data as TeamItem[]).filter(t => !t.isSystemTeam)); })
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  async function handleRoute() {
    const desc = description.trim();
    if (!desc) return;
    setState("routing");
    setError(null);
    try {
      const res = await fetch("/api/route-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error ?? "Routing failed");
      }
      const data = await res.json() as RoutePick;
      setPick(data);
      if (data.teamId) {
        setState("confirm");
      } else {
        // Coordinator could not pick — go straight to manual override
        setState("override");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Routing failed");
      setState("input");
    }
  }

  async function handleDispatch(teamId: string, teamName: string) {
    setState("dispatching");
    setError(null);
    try {
      const res = await fetch("/api/route-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          title: pick?.title,
          teamId,
          dispatch: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error ?? "Dispatch failed");
      }
      setDispatchedTeam(teamName);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dispatch failed");
      setState(pick?.teamId ? "confirm" : "override");
    }
  }

  const overrideTeams = overridePg
    ? teams.filter(t => overridePg.teamIds?.includes(t.id))
    : [];

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)" }}
        onClick={state !== "dispatching" ? onClose : undefined}
      />
      <div
        style={{
          position: "fixed", zIndex: 201,
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: "min(480px, calc(100vw - 32px))", maxHeight: "80vh",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 14, boxShadow: "var(--shadow-md)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid var(--color-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Network size={14} style={{ color: "var(--color-brand)" }} />
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
              Quick task
            </h2>
          </div>
          {state !== "dispatching" && (
            <button
              onClick={onClose}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--color-muted)", display: "flex", padding: 4, borderRadius: 6 }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>

          {error && (
            <div style={{
              padding: "8px 12px", borderRadius: 8, fontSize: 12,
              background: "var(--color-red-dim)", color: "var(--color-red)",
              border: "1px solid rgba(248,113,113,0.2)",
            }}>
              {error}
            </div>
          )}

          {/* ── Input ── */}
          {(state === "input" || state === "routing") && (
            <>
              <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0, lineHeight: 1.5 }}>
                Describe the task. The Playground Keeper picks the right team — you confirm before anything runs.
              </p>
              <textarea
                ref={inputRef}
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey && description.trim() && state === "input") {
                    e.preventDefault();
                    handleRoute();
                  }
                }}
                placeholder="e.g. Write a blog post about our new pricing and prepare social snippets"
                rows={3}
                disabled={state === "routing"}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
                  background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                  color: "var(--color-text)", outline: "none", resize: "vertical",
                  opacity: state === "routing" ? 0.6 : 1, fontFamily: "inherit",
                }}
              />
              <button
                onClick={handleRoute}
                disabled={!description.trim() || state === "routing"}
                style={{
                  ...BTN_PRIMARY,
                  background: description.trim() && state !== "routing" ? "var(--color-brand)" : "var(--color-surface-3)",
                  color: description.trim() && state !== "routing" ? "#0a1628" : "var(--color-muted)",
                  cursor: description.trim() && state !== "routing" ? "pointer" : "not-allowed",
                }}
              >
                {state === "routing" ? (
                  <><Loader2 size={13} className="animate-spin" /> Picking a team…</>
                ) : (
                  <>Route task <ArrowRight size={13} /></>
                )}
              </button>
            </>
          )}

          {/* ── Confirmation ── */}
          {state === "confirm" && pick?.teamId && (
            <>
              <div style={{
                background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 4 }}>Task</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text)" }}>{pick.title}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 4 }}>Suggested team</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Users size={13} style={{ color: "var(--color-brand)" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>{pick.teamName}</span>
                  </div>
                </div>
                {pick.reasoning && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 4 }}>Why</div>
                    <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.55 }}>{pick.reasoning}</p>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleDispatch(pick.teamId as string, pick.teamName ?? "")}
                  style={{ ...BTN_PRIMARY, flex: 1 }}
                >
                  <Check size={13} /> Dispatch to {pick.teamName}
                </button>
                <button onClick={() => { setOverridePg(null); setState("override"); }} style={BTN_GHOST}>
                  Change team
                </button>
              </div>
            </>
          )}

          {/* ── Override: playground → team picker ── */}
          {state === "override" && (
            <>
              {!overridePg ? (
                <>
                  <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0 }}>
                    Pick a playground, then the team to run this task.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {playgrounds.length === 0 && (
                      <p style={{ fontSize: 12, color: "var(--color-muted)", padding: "12px 0", textAlign: "center" }}>
                        No playgrounds yet.
                      </p>
                    )}
                    {playgrounds.map(pg => (
                      <button
                        key={pg.id}
                        onClick={() => setOverridePg(pg)}
                        style={LIST_ROW}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)")}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                      >
                        <LayoutGrid size={13} style={{ color: "var(--color-brand)", opacity: 0.85, flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{pg.name}</span>
                        <span style={{ fontSize: 11, color: "var(--color-muted)" }}>
                          {pg.teamIds?.length ?? 0} team{(pg.teamIds?.length ?? 0) !== 1 ? "s" : ""}
                        </span>
                        <ArrowRight size={11} style={{ color: "var(--color-muted)" }} />
                      </button>
                    ))}
                  </div>
                  {pick?.teamId && (
                    <button onClick={() => setState("confirm")} style={BTN_GHOST}>
                      <ArrowLeft size={12} /> Back to suggestion
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: "var(--color-muted)", margin: 0 }}>
                    Teams in <span style={{ color: "var(--color-text)", fontWeight: 500 }}>{overridePg.name}</span>:
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {overrideTeams.length === 0 && (
                      <p style={{ fontSize: 12, color: "var(--color-muted)", padding: "12px 0", textAlign: "center" }}>
                        This playground has no teams assigned.
                      </p>
                    )}
                    {overrideTeams.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleDispatch(t.id, t.name)}
                        style={LIST_ROW}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--color-hover-subtle)")}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                      >
                        <Users size={13} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{t.name}</span>
                        <ArrowRight size={11} style={{ color: "var(--color-muted)" }} />
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setOverridePg(null)} style={BTN_GHOST}>
                    <ArrowLeft size={12} /> Back to playgrounds
                  </button>
                </>
              )}
            </>
          )}

          {/* ── Dispatching ── */}
          {state === "dispatching" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0", justifyContent: "center", color: "var(--color-muted)", fontSize: 13 }}>
              <Loader2 size={14} className="animate-spin" />
              Dispatching task…
            </div>
          )}

          {/* ── Done ── */}
          {state === "done" && (
            <>
              <div style={{
                background: "var(--color-brand-dim)", border: "1px solid var(--color-brand-muted)",
                borderRadius: 12, padding: "14px 16px",
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text)", fontWeight: 500 }}>
                  <Check size={14} style={{ color: "var(--color-brand)" }} />
                  Task dispatched to {dispatchedTeam}
                </div>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>
                  The team is working on it now. Progress shows in the activity strip; the result lands in Overview → Tasks.
                </p>
              </div>
              <button onClick={onClose} style={BTN_GHOST}>Close</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
