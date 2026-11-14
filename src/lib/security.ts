import { timingSafeEqual } from "node:crypto";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const MAX_TRACKED_KEYS = 10_000;
const buckets = new Map<string, RateLimitBucket>();

function pruneExpiredBuckets(now: number): void {
  if (buckets.size < MAX_TRACKED_KEYS) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  const normalizedLimit = Math.max(1, Math.round(limit));
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + Math.max(1_000, windowMs);
    buckets.set(key, { count: 1, resetAt });
    pruneExpiredBuckets(now);

    return {
      allowed: true,
      limit: normalizedLimit,
      remaining: Math.max(0, normalizedLimit - 1),
      retryAfterSeconds: Math.ceil((resetAt - now) / 1_000),
    };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((existing.resetAt - now) / 1_000),
  );

  return {
    allowed: existing.count <= normalizedLimit,
    limit: normalizedLimit,
    remaining: Math.max(0, normalizedLimit - existing.count),
    retryAfterSeconds,
  };
}

export function screenRateLimitPerMinute(): number {
  const raw = process.env.SCREEN_RATE_LIMIT_PER_MINUTE;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) return 60;
  return Math.min(Math.round(parsed), 10_000);
}

export function isAuthorized(request: Request): boolean {
  const expected = process.env.SCREEN_API_TOKEN?.trim();
  if (!expected) return true;

  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;

  const received = header.slice(prefix.length);
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

export function rateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    ...(result.allowed
      ? {}
      : { "Retry-After": String(result.retryAfterSeconds) }),
  };
}

export function resetRateLimitStore(): void {
  buckets.clear();
}
