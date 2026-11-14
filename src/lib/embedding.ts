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
let liveFetchInFlight: Promise<void> | null = null;

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

function resolveLocal(uniqueTexts: string[]): number[][] {
  return uniqueTexts.map((text) => {
    const key = localKey(text);
    const cached = embeddingCache.get(key);
    if (cached) return cached;

    const vector = localEmbedding(text);
    embeddingCache.set(key, vector);
    return vector;
  });
}

async function resolveLive(
  uniqueTexts: string[],
): Promise<(number[] | undefined)[]> {
  if (liveFetchInFlight) {
    await liveFetchInFlight.catch(() => undefined);
  }

  if (Date.now() < liveDisabledUntil) {
    return uniqueTexts.map(() => undefined);
  }

  const keys = uniqueTexts.map(liveKey);
  const missingIndexes: number[] = [];

  keys.forEach((key, index) => {
    if (!embeddingCache.has(key)) missingIndexes.push(index);
  });

  if (missingIndexes.length === 0) {
    return keys.map((key) => embeddingCache.get(key));
  }

  let release!: () => void;
  const flight = new Promise<void>((resolve) => {
    release = resolve;
  });
  liveFetchInFlight = flight;

  try {
    const missingTexts = missingIndexes.map((index) => uniqueTexts[index] ?? "");
    const fresh = await embedTexts(missingTexts);

    fresh.forEach((vector, freshIndex) => {
      const targetIndex = missingIndexes[freshIndex];
      if (targetIndex === undefined) return;
      const key = keys[targetIndex];
      if (key) embeddingCache.set(key, vector);
    });
  } catch (error) {
    console.error(
      "[embedding] Live embedding failed; falling back to local vectors",
      error,
    );
    liveDisabledUntil = Date.now() + LIVE_DISABLE_MS;
  } finally {
    liveFetchInFlight = null;
    release();
  }

  return keys.map((key) => embeddingCache.get(key));
}

export async function embedTextsCached(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const uniqueTexts: string[] = [];
  const uniqueIndexByText = new Map<string, number>();

  for (const text of texts) {
    if (uniqueIndexByText.has(text)) continue;
    uniqueIndexByText.set(text, uniqueTexts.length);
    uniqueTexts.push(text);
  }

  const useLive =
    !isMockMode() && hasApiKey() && Date.now() >= liveDisabledUntil;

  let uniqueVectors: number[][] | undefined;

  if (useLive) {
    const liveVectors = await resolveLive(uniqueTexts);
    if (liveVectors.every((vector) => vector !== undefined)) {
      uniqueVectors = liveVectors as number[][];
    }
  }

  if (!uniqueVectors) {
    uniqueVectors = resolveLocal(uniqueTexts);
  }

  return texts.map((text) => {
    const uniqueIndex = uniqueIndexByText.get(text);
    return uniqueVectors?.[uniqueIndex ?? -1] ?? [];
  });
}

export async function warmJobEmbeddings(jobTexts: string[]): Promise<void> {
  if (jobTexts.length === 0) return;

  try {
    await embedTextsCached(jobTexts);
  } catch (error) {
    console.error("[embedding] Failed to warm job embeddings", error);
  }
}

export function isLiveEmbeddingEnabled(): boolean {
  return !isMockMode() && hasApiKey() && Date.now() >= liveDisabledUntil;
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
  liveFetchInFlight = null;
}

export function getEmbeddingCacheSize(): number {
  return embeddingCache.size;
}
