import type { Provider } from "./types.js";
import { OpenRouterProvider } from "./openrouter.js";
import { GeminiProvider } from "./gemini.js";
import { GroqProvider } from "./groq.js";
import { OllamaProvider } from "./ollama.js";
import { AnthropicProvider } from "./anthropic.js";
import { ArenaProvider } from "./arena.js";

export * from "./types.js";

export type ProviderName = "arena" | "openrouter" | "gemini" | "groq" | "ollama" | "anthropic";

export function createProvider(name?: string): Provider {
  const n = (name ?? process.env.ARENA_PROVIDER ?? detectProvider()) as ProviderName;

  switch (n) {
    case "openrouter": {
      const key = process.env.OPENROUTER_API_KEY;
      if (!key) throw new Error("OPENROUTER_API_KEY not set. Get one at https://openrouter.ai/keys");
      return new OpenRouterProvider({ apiKey: key, model: process.env.OPENROUTER_MODEL || "deepseek/deepseek-r1:free" });
    }
    case "gemini": {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error("GEMINI_API_KEY not set. Get one at https://aistudio.google.com/app/apikey");
      return new GeminiProvider({ apiKey: key, model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });
    }
    case "groq": {
      const key = process.env.GROQ_API_KEY;
      if (!key) throw new Error("GROQ_API_KEY not set. Get one at https://console.groq.com/keys");
      return new GroqProvider({ apiKey: key, model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile" });
    }
    case "ollama": {
      return new OllamaProvider({
        baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
        model: process.env.OLLAMA_MODEL || "qwen2.5-coder:14b",
      });
    }
    case "anthropic": {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error("ANTHROPIC_API_KEY not set");
      return new AnthropicProvider({ apiKey: key, model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514" });
    }
    case "arena":
    default: {
      // Arena with fallback chain
      const fallback = tryCreateFallback();
      return new ArenaProvider({
        apiUrl: process.env.ARENA_API_URL,
        apiKey: process.env.ARENA_API_KEY,
        model: process.env.ARENA_MODEL || "arena-agent",
        fallback,
      });
    }
  }
}

function detectProvider(): ProviderName {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL) return "ollama";
  if (process.env.ARENA_API_URL) return "arena";
  // Default: gemini (most generous free tier) — but will error with helpful message if no key
  return "arena";
}

function tryCreateFallback(): Provider | null {
  try {
    if (process.env.GEMINI_API_KEY) return new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });
    if (process.env.OPENROUTER_API_KEY) return new OpenRouterProvider({ apiKey: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_MODEL || "deepseek/deepseek-r1:free" });
    if (process.env.GROQ_API_KEY) return new GroqProvider({ apiKey: process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile" });
    return new OllamaProvider({ baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434", model: process.env.OLLAMA_MODEL || "qwen2.5-coder:14b" });
  } catch {
    return null;
  }
}

export { OpenRouterProvider, GeminiProvider, GroqProvider, OllamaProvider, AnthropicProvider, ArenaProvider };
