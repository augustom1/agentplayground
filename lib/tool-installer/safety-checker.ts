/**
 * Safety checker for npm, PyPI, and MCP packages.
 * All tool installations must pass before executing SSH install.
 */

export interface SafetyResult {
  approved: boolean;
  score: number; // 0-10
  reason: string;
  requiresConfirmation: boolean;
  metadata: {
    weeklyDownloads?: number;
    license?: string;
    lastPublished?: string;
    maintainers?: number;
    version?: string;
  };
}

export async function checkSafety(
  packageName: string,
  type: "npm" | "pip" | "mcp" | "github"
): Promise<SafetyResult> {
  switch (type) {
    case "npm":
      return checkNpm(packageName);
    case "pip":
      return checkPyPI(packageName);
    case "mcp":
      return checkMCP(packageName);
    case "github":
      return {
        approved: true,
        score: 5,
        reason: "GitHub package — review source before installing",
        requiresConfirmation: true,
        metadata: {},
      };
    default:
      return { approved: false, score: 0, reason: "Unknown package type", requiresConfirmation: false, metadata: {} };
  }
}

// ─── npm ───────────────────────────────────────────────────────────────────────

const NPM_BLOCKLIST = new Set(["node-serialize", "grunt-fancy-log", "crossenv", "flatmap-stream"]);

async function checkNpm(packageName: string): Promise<SafetyResult> {
  if (NPM_BLOCKLIST.has(packageName)) {
    return { approved: false, score: 0, reason: "Package is on the security blocklist", requiresConfirmation: false, metadata: {} };
  }

  const [regRes, statsRes] = await Promise.allSettled([
    fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`),
    fetch(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`),
  ]);

  if (regRes.status === "rejected" || !(regRes.value as Response).ok) {
    return { approved: false, score: 0, reason: `Package "${packageName}" not found on npm`, requiresConfirmation: false, metadata: {} };
  }

  const data = await (regRes.value as Response).json() as {
    deprecated?: string;
    "dist-tags"?: { latest?: string };
    versions?: Record<string, { license?: string }>;
    license?: string;
    maintainers?: unknown[];
    time?: { modified?: string };
  };

  const weeklyDownloads =
    statsRes.status === "fulfilled" && (statsRes.value as Response).ok
      ? ((await (statsRes.value as Response).json()) as { downloads?: number }).downloads ?? 0
      : 0;

  const latestVersion = data["dist-tags"]?.latest ?? "unknown";
  const versionData = data.versions?.[latestVersion] ?? {};
  const license = (versionData as { license?: string }).license ?? data.license ?? "unknown";
  const maintainerCount = (data.maintainers?.length ?? 0) as number;

  if (data.deprecated) {
    return {
      approved: false,
      score: 1,
      reason: `Package is deprecated: ${data.deprecated}`,
      requiresConfirmation: false,
      metadata: { weeklyDownloads, license },
    };
  }

  if (weeklyDownloads < 1000) {
    return {
      approved: false,
      score: 1,
      reason: `Too few downloads (${weeklyDownloads}/week). Minimum 1,000 required for safety.`,
      requiresConfirmation: false,
      metadata: { weeklyDownloads, license },
    };
  }

  let score = 0;
  if (weeklyDownloads > 10_000_000) score += 4;
  else if (weeklyDownloads > 1_000_000) score += 3;
  else if (weeklyDownloads > 100_000) score += 2;
  else if (weeklyDownloads > 10_000) score += 1;
  else score += 0.5;

  const openLicenses = ["MIT", "ISC", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "0BSD", "Unlicense"];
  if (openLicenses.some((l) => (license as string).includes(l))) score += 2;
  else if (license !== "unknown") score += 1;

  if (maintainerCount > 1) score += 1;
  if (maintainerCount > 5) score += 1;

  if (data.time?.modified) {
    const daysSince = (Date.now() - new Date(data.time.modified).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 365) score += 1;
    else if (daysSince > 365 * 3) score -= 1;
  }

  const requiresConfirmation = weeklyDownloads < 10_000;

  return {
    approved: true,
    score: Math.min(Math.round(score * 10) / 10, 10),
    reason: `${weeklyDownloads.toLocaleString()} weekly downloads, ${license} license`,
    requiresConfirmation,
    metadata: { weeklyDownloads, license, version: latestVersion, maintainers: maintainerCount },
  };
}

// ─── PyPI ──────────────────────────────────────────────────────────────────────

async function checkPyPI(packageName: string): Promise<SafetyResult> {
  const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`);
  if (!res.ok) {
    return { approved: false, score: 0, reason: `Package "${packageName}" not found on PyPI`, requiresConfirmation: false, metadata: {} };
  }

  const data = (await res.json()) as { info: { license?: string; version?: string } };
  const license = data.info.license ?? "unknown";
  const version = data.info.version;

  // pypistats.org for download counts
  let weeklyDownloads = 0;
  try {
    const statsRes = await fetch(`https://pypistats.org/api/packages/${encodeURIComponent(packageName)}/recent`);
    if (statsRes.ok) {
      const stats = (await statsRes.json()) as { data?: { last_week?: number } };
      weeklyDownloads = stats.data?.last_week ?? 0;
    }
  } catch {}

  if (weeklyDownloads > 0 && weeklyDownloads < 1000) {
    return { approved: false, score: 1, reason: `Too few downloads (${weeklyDownloads}/week)`, requiresConfirmation: false, metadata: { weeklyDownloads, license, version } };
  }

  const score = weeklyDownloads > 100_000 ? 8 : weeklyDownloads > 10_000 ? 6 : 4;
  return {
    approved: true,
    score,
    reason: `Found on PyPI${weeklyDownloads > 0 ? `, ${weeklyDownloads.toLocaleString()} weekly downloads` : ""}, ${license} license`,
    requiresConfirmation: weeklyDownloads < 10_000,
    metadata: { weeklyDownloads, license, version },
  };
}

// ─── MCP ───────────────────────────────────────────────────────────────────────

const OFFICIAL_MCP_SERVERS = new Set([
  "@modelcontextprotocol/server-filesystem",
  "@modelcontextprotocol/server-github",
  "@modelcontextprotocol/server-google-maps",
  "@modelcontextprotocol/server-postgres",
  "@modelcontextprotocol/server-puppeteer",
  "@modelcontextprotocol/server-brave-search",
  "@modelcontextprotocol/server-slack",
  "@modelcontextprotocol/server-memory",
  "@modelcontextprotocol/server-sequential-thinking",
  "@modelcontextprotocol/server-fetch",
  "@modelcontextprotocol/server-everything",
]);

async function checkMCP(serverName: string): Promise<SafetyResult> {
  if (OFFICIAL_MCP_SERVERS.has(serverName)) {
    return { approved: true, score: 10, reason: "Official Anthropic MCP server", requiresConfirmation: false, metadata: {} };
  }
  // Treat community MCP servers as npm packages
  if (serverName.startsWith("@") || !serverName.includes(" ")) {
    return checkNpm(serverName);
  }
  return { approved: false, score: 0, reason: "Unknown MCP server. Use official @modelcontextprotocol/* servers or npm-published packages.", requiresConfirmation: false, metadata: {} };
}
