/**
 * News service - MCP-based news with sentiment analysis
 * Uses korea-stock-analyzer MCP server for Korean market news
 */

import type { NewsArticle, NewsResponse } from '../shared/types/index.js';
import { newsCache } from '../shared/cache/index.js';
import { logger } from '../shared/logger/index.js';
import { ValidationError, withTimeout } from '../shared/errors/index.js';
import { searchNews } from './mcpAnalyzerService.js';
import { isConnected } from './mcpClientManager.js';

const log = logger.child('NewsService');

const CACHE_TTL = 5 * 60 * 1000;
const API_TIMEOUT = 15000;

/**
 * Fetch news from MCP analyzer server
 */
async function fetchFromMcp(query: string, limit: number): Promise<NewsResponse | null> {
  if (!isConnected('analyzer')) {
    log.debug('Analyzer MCP not connected, cannot fetch news');
    return null;
  }

  try {
    const data = await withTimeout(
      () => searchNews(query),
      API_TIMEOUT,
      `fetchMcpNews:${query}`
    ) as Record<string, unknown>;

    // Map MCP response to NewsResponse format
    const rawArticles = Array.isArray(data) ? data : (data.articles ?? data.results ?? []) as unknown[];
    const articles: NewsArticle[] = (rawArticles as Record<string, unknown>[])
      .slice(0, limit)
      .map((article) => ({
        title: String(article.title ?? ''),
        source: String(article.source ?? article.publisher ?? 'Unknown'),
        publishedAt: String(article.publishedAt ?? article.date ?? new Date().toISOString()),
        summary: String(article.summary ?? article.description ?? article.content ?? ''),
        url: String(article.url ?? article.link ?? ''),
        sentiment: mapSentiment(article.sentiment),
        imageUrl: article.imageUrl ? String(article.imageUrl) : undefined,
      }));

    return {
      query,
      articles,
      totalCount: articles.length,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    log.warn('MCP news fetch failed', { query, error: String(error) });
    return null;
  }
}

function mapSentiment(value: unknown): 'positive' | 'neutral' | 'negative' {
  const s = String(value ?? '').toLowerCase();
  if (s === 'positive' || s === 'bullish') return 'positive';
  if (s === 'negative' || s === 'bearish') return 'negative';
  return 'neutral';
}

/**
 * Get investment news with caching
 */
export async function getInvestmentNews(query: string, limit: number = 5): Promise<NewsResponse> {
  if (!query || query.trim().length === 0) {
    throw new ValidationError('Search query is required');
  }

  if (limit < 1 || limit > 20) {
    throw new ValidationError('Limit must be between 1 and 20');
  }

  const normalizedQuery = query.trim().toLowerCase();
  const cacheKey = `news:${normalizedQuery}:${limit}`;

  const cached = newsCache.get<NewsResponse>(cacheKey);
  if (cached) {
    log.debug('Cache hit for news', { query: normalizedQuery });
    return cached;
  }

  log.debug('Cache miss for news', { query: normalizedQuery });

  // Try MCP analyzer first
  const mcpResponse = await fetchFromMcp(normalizedQuery, limit);
  if (mcpResponse && mcpResponse.articles.length > 0) {
    newsCache.set(cacheKey, mcpResponse, CACHE_TTL);
    log.info('News fetched from MCP analyzer', { query: normalizedQuery, count: mcpResponse.articles.length });
    return mcpResponse;
  }

  // Return empty response if MCP is unavailable
  const emptyResponse: NewsResponse = {
    query: normalizedQuery,
    articles: [],
    totalCount: 0,
    fetchedAt: new Date().toISOString(),
  };

  newsCache.set(cacheKey, emptyResponse, CACHE_TTL);
  log.info('No news available (MCP not connected)', { query: normalizedQuery });
  return emptyResponse;
}

/**
 * Get trending investment news
 */
export async function getTrendingNews(limit: number = 5): Promise<NewsResponse> {
  return getInvestmentNews('stock market', limit);
}
