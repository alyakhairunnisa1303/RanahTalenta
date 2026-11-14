import { hashInput } from "./audit";
import { TtlCache } from "./cache";
import { embedTexts } from "./gemini";
import { getEmbeddingModel, isMockMode } from "./runtime";

const LOCAL_DIMENSION = 256;
const LIVE_DISABLE_MS = 60_000;

const EMBEDDING_STOPWORDS = new Set([
  "dan",
  "yang",
  "untuk",
  "dengan",
  "atau",
  "pada",
  "dari",
  "dalam",
  "akan",
  "ini",
  "itu",
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "are",
  "you",
  "our",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "is",
]);

const embeddingCache = new TtlCache<string, number[]>({
  ttlMs: 60 * 60 * 1000,
  maxEntries: 5_000,
});

let liveDisabledUntil = 0;

function tokenizeForEmbedding(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !EMBEDDING_STOPWORDS.has(token));
}

function fnv1a(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function localEmbedding(text: string): number[] {
  const vector = new Array<number>(LOCAL_DIMENSION).fill(0);
  const tokens = tokenizeForEmbedding(text);

  for (const token of tokens) {
    vector[fnv1a(token) % LOCAL_DIMENSION] += 1;
  }

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const bigram = `${tokens[index]} ${tokens[index + 1]}`;
    vector[fnv1a(bigram) % LOCAL_DIMENSION] += 0.5;
  }

  const norm = Math.sqrt(
    vector.reduce((total, value) => total + value * value, 0),
  );
  if (norm === 0) return vector;

  return vector.map((value) => value / norm);
}

function localKey(text: string): string {
  return `local:${hashInput(text)}`;
}

function liveKey(text: string): string {
  return `${getEmbeddingModel()}:${hashInput(text)}`;
}

function hasApiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function embedTextsCached(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const useLive =
    !isMockMode() && hasApiKey() && Date.now() >= liveDisabledUntil;

  if (useLive) {
    const liveKeys = texts.map(liveKey);
    const missingIndexes: number[] = [];
    const missingTexts: string[] = [];

    liveKeys.forEach((key, index) => {
      if (!embeddingCache.has(key)) {
        missingIndexes.push(index);
        missingTexts.push(texts[index] ?? "");
      }
    });

    if (missingTexts.length > 0) {
      try {
        const fresh = await embedTexts(missingTexts);
        fresh.forEach((vector, freshIndex) => {
          const targetIndex = missingIndexes[freshIndex];
          if (targetIndex === undefined) return;
          embeddingCache.set(liveKeys[targetIndex]!, vector);
        });
      } catch (error) {
        console.error(
          "[embedding] Live embedding failed; falling back to local vectors",
          error,
        );
        liveDisabledUntil = Date.now() + LIVE_DISABLE_MS;
      }
    }

    const resolved = liveKeys.map((key) => embeddingCache.get(key));
    if (resolved.every((vector) => vector !== undefined)) {
      return resolved as number[][];
    }
  }

  return texts.map((text) => {
    const key = localKey(text);
    const cached = embeddingCache.get(key);
    if (cached) return cached;

    const vector = localEmbedding(text);
    embeddingCache.set(key, vector);
    return vector;
  });
}

export function cosineSimilarity(first: number[], second: number[]): number {
  const length = Math.min(first.length, second.length);
  if (length === 0) return 0;

  let dot = 0;
  let firstNorm = 0;
  let secondNorm = 0;

  for (let index = 0; index < length; index += 1) {
    const a = first[index] ?? 0;
    const b = second[index] ?? 0;
    dot += a * b;
    firstNorm += a * a;
    secondNorm += b * b;
  }

  if (firstNorm === 0 || secondNorm === 0) return 0;
  return dot / (Math.sqrt(firstNorm) * Math.sqrt(secondNorm));
}

export function clearEmbeddingCache(): void {
  embeddingCache.clear();
  liveDisabledUntil = 0;
}

export function getEmbeddingCacheSize(): number {
  return embeddingCache.size;
}
