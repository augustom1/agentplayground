import { EventEmitter } from "events";

// Single in-process event bus — works for single-server Docker deployments.
// For multi-server: replace with Redis pub/sub on "plan_events" channel.
export const planEventBus = new EventEmitter();
planEventBus.setMaxListeners(100);

export interface PlanEvent {
  type:
    | "PLAN_READY"
    | "PLAN_DONE"
    | "PLAN_BLOCKED"
    | "TASK_DONE"
    | "COUNCIL_COMPLETE"
    | "AGENT_BLOCKED"
    | "MISSING_INFO"
    | "ERROR";
  planId?: string;
  taskId?: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

export function notifyPlanEvent(event: PlanEvent): void {
  const payload: PlanEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  planEventBus.emit("event", payload);
}

/**
 * Returns a ReadableStream (for Next.js SSE routes) that streams plan events.
 * Keeps connection alive with a heartbeat every 25s.
 */
export function createPlanEventStream(): ReadableStream {
  let closed = false;
  let controller: ReadableStreamDefaultController;

  return new ReadableStream({
    start(ctrl) {
      controller = ctrl;

      function send(event: PlanEvent) {
        if (closed) return;
        try {
          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
        } catch {
          closed = true;
        }
      }

      function onEvent(event: PlanEvent) {
        send(event);
      }

      planEventBus.on("event", onEvent);

      // Heartbeat to keep the connection alive
      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(": heartbeat\n\n");
        } catch {
          closed = true;
          clearInterval(heartbeat);
        }
      }, 25000);

      // Cleanup on stream close
      const cleanup = () => {
        closed = true;
        clearInterval(heartbeat);
        planEventBus.off("event", onEvent);
      };

      // Store cleanup on controller for cancel
      (ctrl as { _cleanup?: () => void })._cleanup = cleanup;
    },
    cancel() {
      closed = true;
      // Run cleanup if stored
      (controller as unknown as { _cleanup?: () => void })?._cleanup?.();
    },
  });
}
