import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CachedResponse, ExternalDataSource } from "@/lib/external-data/types";

// CacheEntry stores one local JSON-cache record on disk.
type CacheEntry<T> = CachedResponse<T>;

// getCacheRoot returns the local cache folder. It is ignored by git.
function getCacheRoot() {
  return process.env.CODEX_ORACLE_CACHE_DIR ?? join(process.cwd(), ".data", "external-cache");
}

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
  loader,
  provider,
  ttlMs,
}: {
  cacheKey: string;
  loader: () => Promise<T>;
  provider: ExternalDataSource;
  ttlMs: number;
}): Promise<CachedResponse<T>> {
  const now = Date.now();
  const cached = await readCache<T>(cacheKey);

  if (cached && new Date(cached.expiresAt).getTime() > now) {
    return cached;
  }

  const data = await loader();
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
    const text = await readFile(getCachePath(cacheKey), "utf-8");
    return JSON.parse(text) as CacheEntry<T>;
  } catch {
    return null;
  }
}

// writeCache persists one cache record to the local cache folder.
async function writeCache<T>(cacheKey: string, entry: CacheEntry<T>) {
  await mkdir(getCacheRoot(), { recursive: true });
  await writeFile(getCachePath(cacheKey), JSON.stringify(entry, null, 2));
}

// getCachePath hashes the key so long URLs and tickers remain filesystem-safe.
function getCachePath(cacheKey: string) {
  const hash = createHash("sha256").update(cacheKey).digest("hex");
  return join(getCacheRoot(), `${hash}.json`);
}
