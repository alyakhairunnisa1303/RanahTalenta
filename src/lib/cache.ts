export interface TtlCacheOptions {
  ttlMs?: number;
  maxEntries?: number;
}

interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

export class TtlCache<K, V> {
  private readonly entries = new Map<K, CacheEntry<V>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor({
    ttlMs = 60 * 60 * 1000,
    maxEntries = 5_000,
  }: TtlCacheOptions = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}

export function createTtlCache<K, V>(
  options?: TtlCacheOptions,
): TtlCache<K, V> {
  return new TtlCache<K, V>(options);
}
