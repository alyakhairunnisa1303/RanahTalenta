export type AiMode = "gemini" | "fallback" | "mock" | "deterministic";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-004";

export function isMockMode(): boolean {
  const flag = process.env.MOCK_AI?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export function getEmbeddingModel(): string {
  return process.env.GEMINI_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;
}

export function currentAiMode(): Exclude<AiMode, "deterministic"> {
  if (isMockMode()) return "mock";
  return process.env.GEMINI_API_KEY?.trim() ? "gemini" : "fallback";
}
