/**
 * PLAYGROUND_MODE detection and feature flags.
 *
 * VPS mode (default): PostgreSQL + pgvector, Redis/BullMQ, Docker cron
 * Laptop mode:        SQLite, in-memory queue, node-cron (future)
 *
 * Set PLAYGROUND_MODE=laptop in your environment to enable laptop mode.
 */

export type PlaygroundMode = "vps" | "laptop";

export const PLAYGROUND_MODE: PlaygroundMode =
  (process.env.PLAYGROUND_MODE as PlaygroundMode) === "laptop"
    ? "laptop"
    : "vps";

export const isVPS = PLAYGROUND_MODE === "vps";
export const isLaptop = PLAYGROUND_MODE === "laptop";

/** Feature flags derived from mode */
export const features = {
  /** PostgreSQL + pgvector available */
  pgvector: isVPS,
  /** Redis + BullMQ available */
  redis: isVPS,
  /** Semantic memory search (falls back to keyword in laptop mode) */
  semanticSearch: isVPS,
  /** Ollama local LLM (optional in both modes — check OLLAMA_BASE_URL) */
  ollama: Boolean(process.env.OLLAMA_BASE_URL),
  /** Anthropic Claude API */
  claude: Boolean(process.env.ANTHROPIC_API_KEY),
} as const;
