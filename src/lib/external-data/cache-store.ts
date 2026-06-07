import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/db/connection";
import { providerCache } from "@/lib/db/schema";
import type { CachedResponse, ExternalDataSource } from "@/lib/external-data/types";

// CacheEntry stores one local JSON-cache record on disk.
type CacheEntry<T> = CachedResponse<T>;

// buildCacheKey creates a stable non-secret key from provider, endpoint, and request parts.
export function buildCacheKey(provider: ExternalDataSource, endpoint: string, parts: Record<string, string | number | undefined>) {
  const normalizedParts = Object.entries(parts)
    .filter(([, value]) => value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${String(value).toUpperCase()}`)
    .join("|");

  return `${provider}:${endpoint}:${normalizedParts}`;
}

// getCachedOrLoad returns fresh cached data first, otherwise calls the loader and stores the result.
export async function getCachedOrLoad<T>({
  cacheKey,
  forceRefresh = false,
  loader,
  provider,
  ttlMs,
}: {
  cacheKey: string;
  forceRefresh?: boolean;
  loader: () => Promise<T>;
  provider: ExternalDataSource;
  ttlMs: number;
}): Promise<CachedResponse<T>> {
  const now = Date.now();
  const cached = await readCache<T>(cacheKey);

  if (!forceRefresh && cached && new Date(cached.expiresAt).getTime() > now) {
    return cached;
  }

  let data: T;

  try {
    data = await loader();
  } catch (error) {
    if (cached) {
      return cached;
    }

    throw error;
  }

  const entry: CacheEntry<T> = {
    cacheKey,
    data,
    expiresAt: new Date(now + ttlMs).toISOString(),
    fetchedAt: new Date(now).toISOString(),
    provider,
  };

  await writeCache(cacheKey, entry);
  return entry;
}

// readCache loads a cached JSON record if it exists and parses cleanly.
async function readCache<T>(cacheKey: string): Promise<CacheEntry<T> | null> {
  try {
    const row = getDatabase().select().from(providerCache).where(eq(providerCache.cacheKey, cacheKey)).get();

    if (!row) {
      return null;
    }

    return {
      cacheKey: row.cacheKey,
      data: JSON.parse(row.dataJson) as T,
      expiresAt: row.expiresAt,
      fetchedAt: row.fetchedAt,
      provider: row.provider as ExternalDataSource,
    };
  } catch {
    return null;
  }
}

// writeCache persists one cache record to the local cache folder.
async function writeCache<T>(cacheKey: string, entry: CacheEntry<T>) {
  const now = new Date().toISOString();

  getDatabase()
    .insert(providerCache)
    .values({
      cacheKey,
      createdAt: now,
      dataJson: JSON.stringify(entry.data),
      expiresAt: entry.expiresAt,
      fetchedAt: entry.fetchedAt,
      provider: entry.provider,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      set: {
        dataJson: JSON.stringify(entry.data),
        expiresAt: entry.expiresAt,
        fetchedAt: entry.fetchedAt,
        provider: entry.provider,
        updatedAt: now,
      },
      target: providerCache.cacheKey,
    })
    .run();
}
