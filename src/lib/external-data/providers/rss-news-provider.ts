import { cacheTtls, freeApiBudgets, getProviderAvailability } from "@/lib/external-data/provider-config";
import { fetchTextWithCache } from "@/lib/external-data/http-client";
import type { StockNewsItem } from "@/lib/external-data/types";

// getConfiguredRssNews returns ticker headlines from STOCK_NEWS_RSS_URL_TEMPLATE when configured.
export async function getConfiguredRssNews(ticker: string, limit = 10): Promise<StockNewsItem[]> {
  const availability = getProviderAvailability("rss-news");

  if (!availability.enabled) {
    return [];
  }

  const symbol = normalizeTicker(ticker);
  const template = process.env.STOCK_NEWS_RSS_URL_TEMPLATE ?? "";
  const url = template.replaceAll("{ticker}", encodeURIComponent(symbol));
  const response = await fetchTextWithCache({
    budget: freeApiBudgets.rssNews,
    cacheParts: { limit, symbol },
    endpoint: "rss_news",
    provider: "rss-news",
    ttlMs: cacheTtls.news,
    url,
  });

  return parseRssItems(response.data, limit);
}

// parseRssItems extracts a compact headline list from ordinary RSS XML.
function parseRssItems(xml: string, limit: number): StockNewsItem[] {
  return Array.from(xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi))
    .slice(0, limit)
    .map((match) => match[1] ?? "")
    .map((itemXml) => ({
      publishedAt: readTag(itemXml, "pubDate"),
      source: "rss-news" as const,
      sourceName: readTag(itemXml, "source"),
      summary: readTag(itemXml, "description"),
      title: readTag(itemXml, "title") ?? "Untitled headline",
      url: readTag(itemXml, "link") ?? "#",
    }))
    .filter((item) => item.url !== "#");
}

// readTag returns plain text from one RSS tag.
function readTag(xml: string, tagName: string) {
  const match = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i").exec(xml);
  const rawValue = match?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");

  return rawValue ? decodeEntities(stripTags(rawValue).trim()) : undefined;
}

// stripTags removes basic XML/HTML tags from RSS descriptions.
function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, "");
}

// decodeEntities handles the common XML entities used in RSS titles.
function decodeEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", "\"")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

// normalizeTicker keeps provider requests consistent and safe.
function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);
}
