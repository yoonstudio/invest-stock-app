/**
 * Enhanced in-memory cache service with TTL support
 * Features: stale-while-revalidate, statistics, tiered TTL
 */

import type { CacheEntry } from '../types/index.js';

/**
 * Extended cache entry with stale support
 */
interface ExtendedCacheEntry<T> extends CacheEntry<T> {
  staleTtl: number; // Additional time to serve stale data while revalidating
  isRevalidating?: boolean;
  hitCount: number;
  lastAccessed: number;
}

/**
 * Cache statistics
 */
interface CacheStats {
  size: number;
  maxSize: number;
  defaultTtl: number;
  hits: number;
  misses: number;
  staleHits: number;
  hitRate: number;
  evictions: number;
  avgHitCount: number;
}

interface CacheOptions {
  defaultTtl: number; // Default TTL in milliseconds
  staleTtl: number;   // Stale-while-revalidate window
  maxSize: number;    // Maximum number of entries
  cleanupInterval: number; // Cleanup interval in milliseconds
  enableStats: boolean; // Enable statistics tracking
}

const DEFAULT_OPTIONS: CacheOptions = {
  defaultTtl: 60 * 1000, // 1 minute
  staleTtl: 30 * 1000,   // 30 seconds stale window
  maxSize: 1000,
  cleanupInterval: 30 * 1000, // 30 seconds
  enableStats: true,
};

class MemoryCache {
  private cache: Map<string, ExtendedCacheEntry<unknown>> = new Map();
  private options: CacheOptions;
  private cleanupTimer: NodeJS.Timeout | null = null;

  // Statistics
  private hits = 0;
  private misses = 0;
  private staleHits = 0;
  private evictions = 0;

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.startCleanup();
  }

  /**
   * Get a value from cache with stale-while-revalidate support
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as ExtendedCacheEntry<T> | undefined;

    if (!entry) {
      if (this.options.enableStats) this.misses++;
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Update access tracking
    entry.hitCount++;
    entry.lastAccessed = now;

    // Fresh data
    if (age <= entry.ttl) {
      if (this.options.enableStats) this.hits++;
      return entry.data;
    }

    // Stale but within stale window
    if (age <= entry.ttl + entry.staleTtl) {
      if (this.options.enableStats) this.staleHits++;
      return entry.data; // Return stale data
    }

    // Expired beyond stale window
    this.cache.delete(key);
    if (this.options.enableStats) this.misses++;
    return null;
  }

  /**
   * Check if data is stale (but still usable)
   */
  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    return age > entry.ttl && age <= entry.ttl + entry.staleTtl;
  }

  /**
   * Set a value in cache with optional TTL and stale TTL
   */
  set<T>(key: string, data: T, ttl?: number, staleTtl?: number): void {
    // Enforce max size with LRU eviction
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: ExtendedCacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.options.defaultTtl,
      staleTtl: staleTtl ?? this.options.staleTtl,
      hitCount: 0,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is not expired (including stale window)
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get detailed cache statistics
   */
  stats(): CacheStats {
    const totalRequests = this.hits + this.misses + this.staleHits;
    const totalHitCount = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.hitCount, 0);

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      defaultTtl: this.options.defaultTtl,
      hits: this.hits,
      misses: this.misses,
      staleHits: this.staleHits,
      hitRate: totalRequests > 0 ? (this.hits + this.staleHits) / totalRequests : 0,
      evictions: this.evictions,
      avgHitCount: this.cache.size > 0 ? totalHitCount / this.cache.size : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.staleHits = 0;
    this.evictions = 0;
  }

  /**
   * Get or set pattern with stale-while-revalidate support
   * Returns cached/stale value immediately and revalidates in background
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
    staleTtl?: number
  ): Promise<T> {
    const entry = this.cache.get(key) as ExtendedCacheEntry<T> | undefined;

    if (entry) {
      const now = Date.now();
      const age = now - entry.timestamp;

      // Fresh data
      if (age <= entry.ttl) {
        entry.hitCount++;
        entry.lastAccessed = now;
        if (this.options.enableStats) this.hits++;
        return entry.data;
      }

      // Stale but within stale window - return stale and revalidate
      if (age <= entry.ttl + entry.staleTtl) {
        if (this.options.enableStats) this.staleHits++;
        entry.lastAccessed = now;

        // Background revalidation (don't await)
        if (!entry.isRevalidating) {
          entry.isRevalidating = true;
          this.revalidateInBackground(key, factory, ttl, staleTtl);
        }

        return entry.data;
      }
    }

    // No cache or fully expired - fetch fresh
    if (this.options.enableStats) this.misses++;
    const data = await factory();
    this.set(key, data, ttl, staleTtl);
    return data;
  }

  /**
   * Revalidate cache entry in background
   */
  private async revalidateInBackground<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
    staleTtl?: number
  ): Promise<void> {
    try {
      const data = await factory();
      this.set(key, data, ttl, staleTtl);
    } catch (error) {
      // Silently fail - stale data is still being served
      const entry = this.cache.get(key);
      if (entry) {
        entry.isRevalidating = false;
      }
    }
  }

  /**
   * Warm up cache with multiple keys
   */
  async warmUp<T>(
    items: Array<{ key: string; factory: () => Promise<T>; ttl?: number }>
  ): Promise<void> {
    await Promise.allSettled(
      items.map(async ({ key, factory, ttl }) => {
        if (!this.has(key)) {
          const data = await factory();
          this.set(key, data, ttl);
        }
      })
    );
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entries info (for debugging)
   */
  entries(): Array<{ key: string; age: number; hitCount: number; isStale: boolean }> {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      hitCount: entry.hitCount,
      isStale: now - entry.timestamp > entry.ttl,
    }));
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);

    // Don't prevent process from exiting
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop cleanup timer
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Clean up fully expired entries (beyond stale window)
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl + entry.staleTtl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * LRU (Least Recently Used) eviction strategy
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      if (this.options.enableStats) this.evictions++;
    }
  }
}

// Singleton instances for different cache purposes with optimized settings
export const stockCache = new MemoryCache({
  defaultTtl: 60 * 1000,  // 1 minute for stock prices
  staleTtl: 30 * 1000,    // Serve stale for 30 more seconds while revalidating
  maxSize: 500,
  enableStats: true,
});

export const newsCache = new MemoryCache({
  defaultTtl: 5 * 60 * 1000,  // 5 minutes for news
  staleTtl: 5 * 60 * 1000,    // News can be stale for another 5 minutes
  maxSize: 200,
  enableStats: true,
});

export const exchangeRateCache = new MemoryCache({
  defaultTtl: 60 * 1000,  // 1 minute for exchange rates
  staleTtl: 30 * 1000,    // Serve stale for 30 more seconds
  maxSize: 100,
  enableStats: true,
});

export const portfolioCache = new MemoryCache({
  defaultTtl: 30 * 1000,  // 30 seconds for portfolio analysis
  staleTtl: 15 * 1000,    // Short stale window for portfolio
  maxSize: 100,
  enableStats: true,
});

/**
 * Get all cache statistics for monitoring
 */
export function getAllCacheStats(): Record<string, CacheStats> {
  return {
    stock: stockCache.stats(),
    news: newsCache.stats(),
    exchangeRate: exchangeRateCache.stats(),
    portfolio: portfolioCache.stats(),
  };
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  stockCache.clear();
  newsCache.clear();
  exchangeRateCache.clear();
  portfolioCache.clear();
}

// Export class for custom cache instances
export { MemoryCache };
export type { CacheOptions, CacheStats };
