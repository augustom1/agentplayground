"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Plus,
  X,
  LayoutGrid,
  Activity,
  BarChart3,
  Calendar,
  Clock,
  Zap,
  GripVertical,
  TrendingUp,
  Loader2,
  AlertCircle,
  RefreshCw,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/ToastProvider";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ─── Types ─── */
interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  icon: string;
  size: "sm" | "md" | "lg";
}

interface MetricsData {
  teamCount: number;
  taskCounts: Record<string, number>;
  recentActivity: Array<{ id: string; action: string; type: string; teamName: string | null; createdAt: string }>;
  upcomingJobs: Array<{ id: string; title: string; scheduledFor: string; teamName: string; recurring: string }>;
  recentRuns: Array<{ id: string; target: string; prompt: string; result: string; createdAt: string }>;
  teams: Array<{ id: string; name: string; status: string; tasksCompleted: number; lastActivity: string; description: string }>;
  optimization?: { totalSkills: number; totalCliFunctions: number; appliedImprovements: number; totalImprovements: number };
}

const WIDGET_CATALOG = [
  { type: "agent-status", title: "Agent Team Status", icon: "zap", size: "md" as const, description: "Live status of all your agent teams" },
  { type: "recent-activity", title: "Recent Activity", icon: "activity", size: "md" as const, description: "Latest actions from your agents" },
  { type: "tasks-overview", title: "Tasks Overview", icon: "bar-chart", size: "sm" as const, description: "Summary of completed and pending tasks" },
  { type: "upcoming-schedule", title: "Upcoming Schedule", icon: "calendar", size: "md" as const, description: "Next scheduled jobs at a glance" },
  { type: "optimization", title: "Optimization", icon: "wrench", size: "sm" as const, description: "Tools generated, improvements logged, flywheel metrics" },
  { type: "performance", title: "Performance", icon: "trending-up", size: "sm" as const, description: "Agent response times and throughput" },
  { type: "run-history", title: "Recent Runs", icon: "clock", size: "lg" as const, description: "Your latest playground runs" },
];

const iconMap: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  zap: Zap,
  activity: Activity,
  "bar-chart": BarChart3,
  calendar: Calendar,
  clock: Clock,
  "trending-up": TrendingUp,
  wrench: Wrench,
};

/* ─── Widget Content ─── */
function WidgetContent({ widget, metrics }: { widget: DashboardWidget; metrics: MetricsData | null }) {
  if (!metrics) {
    return (
      <div className="flex flex-col gap-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ height: "28px", borderRadius: "6px", background: "rgba(255,255,255,0.04)" }}
          />
        ))}
      </div>
    );
  }

  if (widget.type === "agent-status") {
    if (metrics.teams.length === 0) {
      return (
        <p className="text-[12px] text-center py-4" style={{ color: "var(--color-muted)" }}>
          No teams yet — create one in Chat
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        {metrics.teams.slice(0, 5).map((team) => (
          <div key={team.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={12} style={{ color: "var(--color-text-secondary)" }} />
              <span className="text-[13px]" style={{ color: "var(--color-text)" }}>{team.name}</span>
            </div>
            <StatusBadge status={team.status} />
          </div>
        ))}
      </div>
    );
  }

  if (widget.type === "recent-activity") {
    if (metrics.recentActivity.length === 0) {
      return (
        <p className="text-[12px] text-center py-4" style={{ color: "var(--color-muted)" }}>
          No activity yet
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        {metrics.recentActivity.slice(0, 5).map((log) => (
          <div key={log.id} className="flex items-start gap-2">
            <Activity size={11} style={{ color: "var(--color-text-secondary)", marginTop: "2px", flexShrink: 0 }} />
            <div>
              <p className="text-[12px] leading-snug" style={{ color: "var(--color-text)" }}>{log.action}</p>
              {log.teamName && (
                <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>{log.teamName}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (widget.type === "tasks-overview") {
    const statuses = ["pending", "running", "completed", "failed"];
    const colors: Record<string, string> = {
      pending: "var(--color-muted)",
      running: "var(--color-text-secondary)",
      completed: "var(--color-green)",
      failed: "var(--color-red)",
    };
    const total = Object.values(metrics.taskCounts).reduce((a, b) => a + b, 0);
    if (total === 0) {
      return (
        <p className="text-[12px] text-center py-4" style={{ color: "var(--color-muted)" }}>
          No tasks yet
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        {statuses.map((s) => {
          const count = metrics.taskCounts[s] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={s}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] capitalize" style={{ color: "var(--color-muted)" }}>{s}</span>
                <span className="text-[11px] font-mono" style={{ color: colors[s] }}>{count}</span>
              </div>
              <div style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.06)" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    borderRadius: "2px",
                    background: colors[s],
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (widget.type === "upcoming-schedule") {
    if (metrics.upcomingJobs.length === 0) {
      return (
        <p className="text-[12px] text-center py-4" style={{ color: "var(--color-muted)" }}>
          No upcoming jobs
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        {metrics.upcomingJobs.map((job) => {
          const d = new Date(job.scheduledFor);
          const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
          return (
            <div key={job.id} className="flex items-center gap-2">
              <Calendar size={11} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] truncate" style={{ color: "var(--color-text)" }}>{job.title}</p>
                <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>{job.teamName} · {dateStr} {timeStr}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (widget.type === "run-history") {
    if (metrics.recentRuns.length === 0) {
      return (
        <p className="text-[12px] text-center py-4" style={{ color: "var(--color-muted)" }}>
          No playground runs yet
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        {metrics.recentRuns.map((run) => (
          <div
            key={run.id}
            className="px-3 py-2 rounded-lg"
            style={{ background: "var(--color-surface-3)" }}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[11px] font-medium" style={{ color: "var(--color-text)" }}>{run.target}</span>
              <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                {new Date(run.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-[12px] truncate" style={{ color: "var(--color-text)" }}>{run.prompt}</p>
          </div>
        ))}
      </div>
    );
  }

  if (widget.type === "optimization") {
    const opt = metrics.optimization;
    if (!opt) {
      return (
        <p className="text-[12px] text-center py-4" style={{ color: "var(--color-muted)" }}>
          No optimization data yet
        </p>
      );
    }
    const rows = [
      { label: "Skills in catalog", value: opt.totalSkills, icon: Wrench, color: "#a78bfa" },
      { label: "CLI functions", value: opt.totalCliFunctions, icon: Zap, color: "#60a5fa" },
      { label: "Improvements applied", value: opt.appliedImprovements, icon: CheckCircle2, color: "var(--color-green)" },
      { label: "Total improvements", value: opt.totalImprovements, icon: TrendingUp, color: "var(--color-yellow)" },
    ];
    return (
      <div className="flex flex-col gap-2">
        {rows.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Icon size={11} style={{ color }} />
              <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>{label}</span>
            </div>
            <span className="text-[13px] font-mono font-semibold" style={{ color: "var(--color-text)" }}>{value}</span>
          </div>
        ))}
      </div>
    );
  }

  // Performance and unknown types — placeholder
  const Icon = iconMap[widget.icon] || Zap;
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-2" style={{ opacity: 0.5 }}>
      <Icon size={20} style={{ color: "var(--color-text-secondary)" }} />
      <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
        Connect a data source to populate
      </p>
    </div>
  );
}

/* ─── Sortable Widget Wrapper ─── */
function SortableWidget({
  widget,
  metrics,
  onRemove,
}: {
  widget: DashboardWidget;
  metrics: MetricsData | null;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const colSpan =
    widget.size === "lg" ? "md:col-span-2 lg:col-span-3" :
    widget.size === "md" ? "md:col-span-1 lg:col-span-2" : "";
  const Icon = iconMap[widget.icon] || Zap;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass-card p-4 group relative ${colSpan}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GripVertical
            size={14}
            style={{ color: "var(--color-muted)", opacity: 0, cursor: "grab" }}
            className="group-hover:!opacity-40 transition-opacity"
            {...attributes}
            {...listeners}
          />
          <div
            className="flex items-center justify-center w-6 h-6"
            style={{ background: "var(--color-surface-3)", borderRadius: "6px" }}
          >
            <Icon size={12} style={{ color: "var(--color-text-secondary)" }} />
          </div>
          <h3
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {widget.title}
          </h3>
        </div>
        <button
          onClick={() => onRemove(widget.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "2px" }}
        >
          <X size={13} />
        </button>
      </div>
      <WidgetContent widget={widget} metrics={metrics} />
    </div>
  );
}

export default function DashboardPage() {
  const { addToast } = useToast();
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [widgetsLoading, setWidgetsLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [metricsError, setMetricsError] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const metricsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setWidgets((prev) => {
      const oldIndex = prev.findIndex((w) => w.id === active.id);
      const newIndex = prev.findIndex((w) => w.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);

      // Persist new positions (fire-and-forget)
      reordered.forEach((w, i) => {
        fetch(`/api/widgets/${w.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: i }),
        }).catch(() => {});
      });

      return reordered;
    });
  }, []);

  // Load widgets from DB
  useEffect(() => {
    async function loadWidgets() {
      try {
        const res = await fetch("/api/widgets");
        if (res.ok) {
          const data = await res.json();
          setWidgets(data.map((w: DashboardWidget) => ({
            id: w.id,
            type: w.type,
            title: w.title,
            icon: w.icon,
            size: w.size,
          })));
        }
      } catch {
        // non-critical
      } finally {
        setWidgetsLoading(false);
      }
    }
    loadWidgets();
  }, []);

  // Fetch metrics on mount and every 60s
  const fetchMetrics = useCallback(async () => {
    try {
      setMetricsError(false);
      const res = await fetch("/api/metrics");
      if (res.ok) {
        setMetrics(await res.json());
      } else {
        setMetricsError(true);
      }
    } catch {
      setMetricsError(true);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    metricsIntervalRef.current = setInterval(fetchMetrics, 60_000);
    return () => {
      if (metricsIntervalRef.current) clearInterval(metricsIntervalRef.current);
    };
  }, [fetchMetrics]);

  const addWidget = useCallback(async (catalog: typeof WIDGET_CATALOG[0]) => {
    try {
      const res = await fetch("/api/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: catalog.type,
          title: catalog.title,
          icon: catalog.icon,
          size: catalog.size,
          position: widgets.length,
        }),
      });
      if (!res.ok) throw new Error("Failed to add widget");
      const widget = await res.json();
      setWidgets((prev) => [...prev, {
        id: widget.id,
        type: widget.type,
        title: widget.title,
        icon: widget.icon,
        size: widget.size,
      }]);
      setShowPicker(false);
      addToast(`${catalog.title} added`, "success");
    } catch {
      addToast("Failed to add widget", "error");
    }
  }, [widgets.length, addToast]);

  const removeWidget = useCallback(async (id: string) => {
    // Optimistic remove
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    try {
      const res = await fetch(`/api/widgets?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      addToast("Failed to remove widget", "error");
      // Re-fetch to restore
      const res = await fetch("/api/widgets");
      if (res.ok) setWidgets(await res.json());
    }
  }, [addToast]);

  const isEmpty = widgets.length === 0;

  return (
    <div className="flex flex-col gap-5 p-6 max-w-5xl mx-auto w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            Dashboard
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            Your personalized command center
          </p>
        </div>
        <div className="flex items-center gap-2">
          {metricsError && (
            <button
              onClick={fetchMetrics}
              className="btn-ghost flex items-center gap-1.5 px-3 py-1.5"
              style={{ fontSize: "12px", color: "var(--color-yellow)" }}
              title="Metrics failed — click to retry"
            >
              <AlertCircle size={12} />
              <RefreshCw size={12} />
            </button>
          )}
          <button
            onClick={() => setShowPicker(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2.5"
          >
            <Plus size={15} />
            Add Widget
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {widgetsLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse" style={{ height: "140px" }} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!widgetsLoading && isEmpty && (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl"
          style={{
            background: "var(--color-surface-2)",
            border: "1px dashed var(--color-border)",
          }}
        >
          <div
            className="flex items-center justify-center w-16 h-16 mb-4"
            style={{
              background: "var(--color-surface-3)",
              borderRadius: "16px",
            }}
          >
            <LayoutGrid size={28} style={{ color: "var(--color-text-secondary)", opacity: 0.6 }} />
          </div>
          <h2 className="text-base font-semibold mb-1" style={{ color: "var(--color-text)" }}>
            Your dashboard is empty
          </h2>
          <p
            className="text-sm mb-5"
            style={{ color: "var(--color-muted)", maxWidth: "360px", textAlign: "center" }}
          >
            Add widgets to customize your view. Track agent status, tasks, schedules, and performance metrics.
          </p>
          <button
            onClick={() => setShowPicker(true)}
            className="btn-primary flex items-center gap-2 px-5 py-2.5"
          >
            <Plus size={15} />
            Add Your First Widget
          </button>
        </div>
      )}

      {/* Widget Grid — drag-and-drop enabled */}
      {!widgetsLoading && !isEmpty && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {widgets.map((widget) => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  metrics={metrics}
                  onRemove={removeWidget}
                />
              ))}

              {/* Add more widget tile */}
              <button
                onClick={() => setShowPicker(true)}
                className="flex flex-col items-center justify-center gap-2 p-5 rounded-[14px] transition-all duration-200 cursor-pointer hover:bg-white/[0.02]"
                style={{ border: "1px dashed var(--color-border)", background: "transparent", minHeight: "120px" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-light)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; }}
              >
                <Plus size={18} style={{ color: "var(--color-text-secondary)", opacity: 0.5 }} />
                <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>Add widget</span>
              </button>
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Widget Picker Modal */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowPicker(false)}
        >
          <div
            className="glass-card p-6 animate-fade-in"
            style={{ width: "480px", maxHeight: "80vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-base" style={{ color: "var(--color-text)" }}>
                Add Widget
              </h2>
              <button
                onClick={() => setShowPicker(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {WIDGET_CATALOG.map((catalog) => {
                const Icon = iconMap[catalog.icon] || Zap;
                const alreadyAdded = widgets.some((w) => w.type === catalog.type);

                return (
                  <button
                    key={catalog.type}
                    onClick={() => !alreadyAdded && addWidget(catalog)}
                    disabled={alreadyAdded}
                    className="glass-card-interactive flex items-center gap-3 p-3.5 text-left"
                    style={{ opacity: alreadyAdded ? 0.4 : 1, cursor: alreadyAdded ? "default" : "pointer" }}
                  >
                    <div
                      className="flex items-center justify-center w-9 h-9 shrink-0"
                      style={{
                        background: "var(--color-surface-3)",
                        borderRadius: "10px",
                      }}
                    >
                      <Icon size={16} style={{ color: "var(--color-text-secondary)" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{catalog.title}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>{catalog.description}</p>
                    </div>
                    {alreadyAdded ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--color-surface-3)", color: "var(--color-muted)" }}>
                        Added
                      </span>
                    ) : (
                      <Plus size={16} style={{ color: "var(--color-accent)", opacity: 0.6 }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Metrics refresh indicator */}
      {metrics && (
        <p className="text-[10px] text-center" style={{ color: "var(--color-muted)" }}>
          <Loader2 size={10} className="inline mr-1" style={{ opacity: 0.4 }} />
          Auto-refreshes every 60s
        </p>
      )}
    </div>
  );
}
