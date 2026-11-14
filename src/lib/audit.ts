import { createHash } from "node:crypto";
import { PROMPT_VERSION } from "./prompts";
import {
  currentAiMode,
  getGeminiModel,
  type AiMode,
} from "./runtime";

export interface GenerationMeta {
  mode: AiMode;
  model: string;
  promptVersion: string;
}

export type AuditMode = AiMode | "mixed";

export interface AuditMeta {
  mode: AuditMode;
  model: string;
  promptVersion: string;
  scoredAt: string;
  inputHash: string;
  generations: GenerationMeta[];
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();

    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(String(value));
}

export function hashInput(value: unknown): string {
  return createHash("sha256")
    .update(stableStringify(value))
    .digest("hex")
    .slice(0, 16);
}

export function createAuditMeta(
  input: unknown,
  generations: GenerationMeta[] = [],
): AuditMeta {
  const fallbackGeneration: GenerationMeta = {
    mode: currentAiMode(),
    model: getGeminiModel(),
    promptVersion: PROMPT_VERSION,
  };
  const effectiveGenerations =
    generations.length > 0 ? generations : [fallbackGeneration];

  const modes = Array.from(
    new Set(effectiveGenerations.map((generation) => generation.mode)),
  );
  const models = Array.from(
    new Set(effectiveGenerations.map((generation) => generation.model)),
  );
  const promptVersions = Array.from(
    new Set(
      effectiveGenerations.map((generation) => generation.promptVersion),
    ),
  );

  return {
    mode: modes.length === 1 ? (modes[0] ?? fallbackGeneration.mode) : "mixed",
    model: models.join(","),
    promptVersion: promptVersions.join(","),
    scoredAt: new Date().toISOString(),
    inputHash: hashInput(input),
    generations: effectiveGenerations,
  };
}
