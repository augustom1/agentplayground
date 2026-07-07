import { prisma } from "@/lib/prisma";
import { getEffectiveApiKey } from "@/lib/api-keys";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { OllamaProvider } from "./ollama";
import type { LLMProvider, ProviderRole } from "./types";

export type { LLMProvider, CompletionParams, CompletionResult, Message, Tool, ProviderRole } from "./types";
export { AnthropicProvider } from "./anthropic";
export { OpenAIProvider } from "./openai";
export { OllamaProvider } from "./ollama";

// Encryption helpers (AES-256-GCM) for stored API keys
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ENC_KEY = process.env.ENCRYPTION_KEY
  ? Buffer.from(process.env.ENCRYPTION_KEY, "base64").slice(0, 32)
  : randomBytes(32); // ephemeral key if not configured — keys won't survive restart

export function encryptApiKey(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptApiKey(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(":");
  const decipher = createDecipheriv("aes-256-gcm", ENC_KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(encHex, "hex")).toString("utf8") + decipher.final("utf8");
}

// Build a provider instance from a DB row
function buildProvider(row: {
  type: string;
  apiKeyEnc?: string | null;
  baseUrl?: string | null;
  id: string;
  name: string;
}): LLMProvider {
  const apiKey = row.apiKeyEnc ? decryptApiKey(row.apiKeyEnc) : undefined;

  switch (row.type) {
    case "anthropic":
      return new AnthropicProvider(apiKey);
    case "openai":
    case "custom":
      return new OpenAIProvider({ apiKey, baseUrl: row.baseUrl ?? undefined, id: row.id, name: row.name });
    case "ollama":
      return new OllamaProvider(row.baseUrl ?? undefined);
    default:
      return new AnthropicProvider(apiKey);
  }
}

// Default fallback providers (from env vars, no DB needed)
const ENV_DEFAULTS: Record<ProviderRole, () => LLMProvider> = {
  keeper:  () => new AnthropicProvider(),
  agent:   () => new AnthropicProvider(),
  embed:   () => new OllamaProvider(),
  council: () => new AnthropicProvider(),
};

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

/**
 * Free-tier fallback chain for agent/background work:
 * Anthropic (env or wizard/Settings key) → NVIDIA (free API) → OpenAI → Ollama (local, if reachable).
 * Returns null when nothing is usable — callers should surface
 * "add a key in Settings → API Keys" instead of crashing.
 */
export async function getAvailableProvider(): Promise<LLMProvider | null> {
  const anthropicKey = await getEffectiveApiKey("ANTHROPIC_API_KEY");
  if (anthropicKey) return new AnthropicProvider(anthropicKey);
  const nvidiaKey = await getEffectiveApiKey("NVIDIA_API_KEY");
  if (nvidiaKey) {
    return new OpenAIProvider({ apiKey: nvidiaKey, baseUrl: NVIDIA_BASE_URL, id: "nvidia", name: "NVIDIA" });
  }
  const openaiKey = await getEffectiveApiKey("OPENAI_API_KEY");
  if (openaiKey) return new OpenAIProvider({ apiKey: openaiKey });
  // Ollama last — only if actually reachable (models() returns [] on any failure)
  const ollama = new OllamaProvider();
  const models = await ollama.models();
  if (models.length > 0) return ollama;
  return null;
}

/**
 * Get the configured LLM provider for a given role.
 * Falls back to env-var-based defaults if no DB provider is configured.
 */
export async function getProvider(role: ProviderRole): Promise<LLMProvider> {
  try {
    const row = await prisma.llmProvider.findFirst({
      where: { role, isDefault: true },
    });
    if (row) return buildProvider(row);
  } catch {
    // DB might not have the table yet during initial setup
  }
  // Fallbacks for desktop installs (no env keys): honor keys entered via the setup
  // wizard / Settings (AgentMemory), then the free NVIDIA API, OpenAI, local Ollama.
  if (role !== "embed") {
    const avail = await getAvailableProvider();
    if (avail) return avail;
  }
  return ENV_DEFAULTS[role]();
}

/**
 * Get the embed provider — always Ollama by default (local, zero external latency).
 */
export async function getEmbedProvider(): Promise<LLMProvider> {
  return getProvider("embed");
}

/**
 * Sensible default model for whatever provider getProvider() returned — callers must
 * not hardcode a Claude model, since the fallback chain can hand back NVIDIA or Ollama.
 * Small NVIDIA model on purpose: faster and burns far fewer free-tier credits.
 */
export function defaultModelFor(p: LLMProvider): string {
  if (p.id === "nvidia") return "meta/llama-3.1-8b-instruct";
  if (p.type === "ollama") return "qwen2.5:7b";
  if (p.type === "openai") return "gpt-4o-mini";
  return "claude-sonnet-4-6";
}
