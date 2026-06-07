import { assertApiBudget, type ApiBudgetPolicy } from "@/lib/external-data/api-budget";
import { buildCacheKey, getCachedOrLoad } from "@/lib/external-data/cache-store";
import type { CachedResponse, ExternalDataSource } from "@/lib/external-data/types";

// FetchOptions stores common safety controls for external provider requests.
type FetchOptions = {
  budget: ApiBudgetPolicy;
  cacheParts: Record<string, string | number | undefined>;
  endpoint: string;
  headers?: HeadersInit;
  provider: ExternalDataSource;
  timeoutMs?: number;
  ttlMs: number;
  url: string;
};

// fetchJsonWithCache safely fetches JSON using cache-first reads, timeout, and API-budget limits.
export async function fetchJsonWithCache<T>(options: FetchOptions): Promise<CachedResponse<T>> {
  const cacheKey = buildCacheKey(options.provider, options.endpoint, options.cacheParts);

  return getCachedOrLoad<T>({
    cacheKey,
    provider: options.provider,
    ttlMs: options.ttlMs,
    loader: async () => {
      await assertApiBudget(options.budget);
      return fetchJson<T>(options.url, options.headers, options.timeoutMs);
    },
  });
}

// fetchTextWithCache safely fetches text/XML/RSS using cache-first reads, timeout, and API-budget limits.
export async function fetchTextWithCache(options: FetchOptions): Promise<CachedResponse<string>> {
  const cacheKey = buildCacheKey(options.provider, options.endpoint, options.cacheParts);

  return getCachedOrLoad<string>({
    cacheKey,
    provider: options.provider,
    ttlMs: options.ttlMs,
    loader: async () => {
      await assertApiBudget(options.budget);
      return fetchText(options.url, options.headers, options.timeoutMs);
    },
  });
}

// fetchJson performs one timeout-protected JSON request.
async function fetchJson<T>(url: string, headers?: HeadersInit, timeoutMs = 10_000): Promise<T> {
  const text = await fetchText(url, headers, timeoutMs);
  return JSON.parse(text) as T;
}

// fetchText performs one timeout-protected text request.
async function fetchText(url: string, headers?: HeadersInit, timeoutMs = 10_000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`External data request failed: ${response.status} ${response.statusText}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}
