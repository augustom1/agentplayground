// Shared provider/model catalog for every chat surface (main chat, playground
// scoped chat). Curated shortlists only — any picker using this catalog must
// also offer a custom model id input ("any model, any time").

export type ProviderId = "anthropic" | "openai" | "nvidia" | "ollama";

export interface CatalogModel { value: string; label: string }
export interface CatalogProvider { label: string; color: string; models: CatalogModel[] }

export const MODEL_CATALOG: Record<ProviderId, CatalogProvider> = {
  anthropic: {
    label: "Anthropic", color: "var(--color-brand)",
    models: [
      { value: "claude-sonnet-4-6",         label: "Sonnet 4.6" },
      { value: "claude-opus-4-6",           label: "Opus 4.6" },
      { value: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
    ],
  },
  openai: {
    label: "OpenAI", color: "#34d399",
    models: [
      { value: "gpt-4o",      label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o mini" },
      { value: "o1-mini",     label: "o1-mini" },
    ],
  },
  nvidia: {
    label: "NVIDIA", color: "#76b900",
    models: [
      { value: "meta/llama-3.1-8b-instruct",      label: "Llama 3.1 8B (free)" },
      { value: "qwen/qwen2.5-coder-32b-instruct", label: "Qwen2.5 Coder 32B (free)" },
      { value: "meta/llama-3.3-70b-instruct",     label: "Llama 3.3 70B (free)" },
      { value: "deepseek-ai/deepseek-r1",         label: "DeepSeek R1 (free)" },
    ],
  },
  ollama: {
    label: "Ollama", color: "#fb923c",
    models: [
      { value: "llama3",    label: "Llama 3" },
      { value: "llama3.1",  label: "Llama 3.1" },
      { value: "mistral",   label: "Mistral" },
      { value: "codellama", label: "CodeLlama" },
    ],
  },
};
