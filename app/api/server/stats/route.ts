export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { execSync } from "child_process";

// GET /api/server/stats — returns Docker container states + basic system info
// Admin only.
export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session || role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // ── Docker containers ──────────────────────────────────────────────
    let containers: ContainerInfo[] = [];
    try {
      const raw = execSync(
        'docker ps -a --format "{{.Names}}|{{.Status}}|{{.Image}}|{{.RunningFor}}"',
        { timeout: 5000, encoding: "utf8" }
      ).trim();
      containers = raw
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [name, status, image, runningFor] = line.split("|");
          const healthy = status.toLowerCase().includes("healthy");
          const running = status.toLowerCase().includes("up");
          const exited = status.toLowerCase().includes("exited");
          return {
            name,
            status: exited ? "exited" : healthy ? "healthy" : running ? "running" : "unknown",
            image,
            runningFor,
            rawStatus: status,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      // Docker not accessible
    }

    // ── Ollama models ──────────────────────────────────────────────────
    let ollamaModels: OllamaModel[] = [];
    try {
      const raw = execSync(
        'docker exec vps-ollama ollama list 2>/dev/null',
        { timeout: 8000, encoding: "utf8" }
      ).trim();
      const lines = raw.split("\n").slice(1).filter(Boolean);
      ollamaModels = lines.map((line) => {
        const parts = line.trim().split(/\s+/);
        return { name: parts[0], size: parts[2] ? `${parts[2]} ${parts[3] || ""}`.trim() : "?" };
      });
    } catch {
      // Ollama not running
    }

    // ── System memory (Linux /proc/meminfo) ───────────────────────────
    let memory: MemoryInfo | null = null;
    try {
      const memRaw = execSync("free -m", { encoding: "utf8" }).trim();
      const line = memRaw.split("\n")[1].split(/\s+/);
      const total = parseInt(line[1]);
      const used = parseInt(line[2]);
      const free = parseInt(line[3]);
      memory = { total, used, free, usedPct: Math.round((used / total) * 100) };
    } catch {
      // not Linux or no access
    }

    // ── Disk usage ────────────────────────────────────────────────────
    let disk: DiskInfo | null = null;
    try {
      const diskRaw = execSync("df -h / | tail -1", { encoding: "utf8" }).trim().split(/\s+/);
      disk = { total: diskRaw[1], used: diskRaw[2], free: diskRaw[3], usedPct: diskRaw[4] };
    } catch {}

    return NextResponse.json({ containers, ollamaModels, memory, disk, ts: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/server/stats — perform a server action
export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session || role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { action, target } = await req.json();

  try {
    if (action === "restart" && target) {
      // Only allow restarting known vps-* containers
      if (!/^vps-[a-z0-9-]+$/.test(target)) {
        return NextResponse.json({ error: "Invalid target" }, { status: 400 });
      }
      execSync(`docker restart ${target}`, { timeout: 30000 });
      return NextResponse.json({ ok: true, message: `${target} restarted` });
    }

    if (action === "pull-model" && target) {
      // Validate model name: only allow alphanumeric, dash, colon, dot (e.g. "qwen2.5:7b")
      if (!/^[a-zA-Z0-9._:/-]+$/.test(target)) {
        return NextResponse.json({ error: "Invalid model name" }, { status: 400 });
      }
      execSync(`docker exec vps-ollama ollama pull ${target} &`, { timeout: 5000 });
      return NextResponse.json({ ok: true, message: `Pulling ${target}...` });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

interface ContainerInfo {
  name: string;
  status: "healthy" | "running" | "exited" | "unknown";
  image: string;
  runningFor: string;
  rawStatus: string;
}

interface OllamaModel {
  name: string;
  size: string;
}

interface MemoryInfo {
  total: number;
  used: number;
  free: number;
  usedPct: number;
}

interface DiskInfo {
  total: string;
  used: string;
  free: string;
  usedPct: string;
}
