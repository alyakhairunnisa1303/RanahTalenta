import { tooManyRequests } from "./errors";
import { getClientIp } from "./http";

type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

// Rate limit in-memory sederhana (per proses). Cukup untuk hackathon;
// jika nanti deploy multi-instance, ganti dengan Redis.
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;
let lastPrune = 0;

function prune(now: number): void {
  if (now - lastPrune < 60_000 && buckets.size < MAX_BUCKETS) {
    return;
  }
  lastPrune = now;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  // Batasi ukuran map agar tidak tumbuh tanpa batas.
  if (buckets.size >= MAX_BUCKETS) {
    const overflow = buckets.size - MAX_BUCKETS + 1;
    let deleted = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (++deleted >= overflow) {
        break;
      }
    }
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  prune(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSec: 0,
    };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSec: 0,
  };
}

export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const result = checkRateLimit(key, limit, windowMs);
  if (!result.allowed) {
    throw tooManyRequests(
      "Terlalu banyak percobaan. Silakan coba lagi nanti.",
      result.retryAfterSec,
    );
  }
  return result;
}

export function requestRateLimitKey(request: Request, scope: string): string {
  return `${scope}:${getClientIp(request)}`;
}

// Dipakai oleh skrip pengujian agar state rate limit tidak mengganggu.
export function resetRateLimits(): void {
  buckets.clear();
  lastPrune = 0;
}
