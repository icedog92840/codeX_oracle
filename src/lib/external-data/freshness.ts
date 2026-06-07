import type { CachedResponse, SourceFreshness } from "@/lib/external-data/types";

// buildSourceFreshness converts cache metadata into UI-ready freshness details.
export function buildSourceFreshness<T>(response: CachedResponse<T>): SourceFreshness {
  return {
    cacheKey: response.cacheKey,
    expiresAt: response.expiresAt,
    fetchedAt: response.fetchedAt,
    isStale: new Date(response.expiresAt).getTime() <= Date.now(),
    source: response.provider,
  };
}
