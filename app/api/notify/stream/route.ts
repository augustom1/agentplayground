export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { createPlanEventStream } from "@/lib/notify/sse";

export async function GET() {
  const stream = createPlanEventStream();
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
