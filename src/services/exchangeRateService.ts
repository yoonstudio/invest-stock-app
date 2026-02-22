/**
 * Exchange rate service - Real-time rates from Frankfurter API (ECB data)
 * Free, no API key required, reliable
 */

import type { ExchangeRate } from '../shared/types/index.js';
import { SUPPORTED_CURRENCIES } from '../shared/types/index.js';
import { exchangeRateCache } from '../shared/cache/index.js';
import { logger } from '../shared/logger/index.js';
import { ValidationError, ApiError, withRetry, withTimeout } from '../shared/errors/index.js';

const log = logger.child('ExchangeRateService');

const CACHE_TTL = 60 * 1000;
const API_TIMEOUT = 8000;

// Currency mapping: Frankfurter uses ISO codes but doesn't support KRW directly
// We'll handle KRW separately via a different approach
const FRANKFURTER_BASE_URL = 'https://api.frankfurter.app';

function validateCurrency(currency: string): void {
  const normalized = currency.toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(normalized)) {
    throw new ValidationError(
      `Unsupported currency: ${currency}. Supported currencies: ${SUPPORTED_CURRENCIES.join(', ')}`
    );
  }
}

/**
 * Fetch exchange rate from Frankfurter API (ECB data, free, no key)
 */
async function fetchFromFrankfurter(from: string, to: string): Promise<ExchangeRate> {
  // Frankfurter supports: USD, EUR, JPY, GBP, CHF, CAD, AUD, HKD, CNY, KRW
  const latestUrl = `${FRANKFURTER_BASE_URL}/latest?from=${from}&to=${to}`;

  log.debug('Fetching exchange rate from Frankfurter', { from, to });
  const startTime = Date.now();

  try {
    const [latestRes, prevRes] = await Promise.all([
      fetch(latestUrl),
      // Get yesterday's rate for change calculation
      fetch(`${FRANKFURTER_BASE_URL}/${getYesterdayDate()}?from=${from}&to=${to}`),
    ]);

    const durationMs = Date.now() - startTime;
    log.logApiCall('GET', 'frankfurter.app', latestRes.status, durationMs);

    if (!latestRes.ok) {
      throw new ApiError(`Frankfurter API error: ${latestRes.status}`);
    }

    interface FrankfurterResponse {
      rates?: Record<string, number>;
      date?: string;
    }

    const latestData = await latestRes.json() as FrankfurterResponse;
    const currentRate = latestData.rates?.[to];

    if (!currentRate) {
      throw new ApiError(`No rate found for ${from}/${to}`);
    }

    let change: number | null = null;
    let changePercent: number | null = null;

    if (prevRes.ok) {
      const prevData = await prevRes.json() as FrankfurterResponse;
      const prevRate = prevData.rates?.[to];
      if (prevRate) {
        change = Number((currentRate - prevRate).toFixed(4));
        changePercent = Number(((currentRate - prevRate) / prevRate * 100).toFixed(2));
      }
    }

    return {
      from,
      to,
      rate: Number(currentRate.toFixed(4)),
      change,
      changePercent,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    log.error('Frankfurter API failed', error as Error, { from, to });
    throw new ApiError(`Failed to fetch exchange rate for ${from}/${to}`);
  }
}

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  // Skip weekends (ECB doesn't publish on weekends)
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() - 2); // Sunday -> Friday
  if (day === 6) d.setDate(d.getDate() - 1); // Saturday -> Friday
  return d.toISOString().split('T')[0];
}

/**
 * Get exchange rate with caching
 */
export async function getExchangeRate(from: string, to: string): Promise<ExchangeRate> {
  const normalizedFrom = from.toUpperCase();
  const normalizedTo = to.toUpperCase();

  validateCurrency(normalizedFrom);
  validateCurrency(normalizedTo);

  if (normalizedFrom === normalizedTo) {
    return {
      from: normalizedFrom,
      to: normalizedTo,
      rate: 1.0,
      change: 0,
      changePercent: 0,
      timestamp: new Date().toISOString(),
    };
  }

  const cacheKey = `exchange:${normalizedFrom}:${normalizedTo}`;

  const cached = exchangeRateCache.get<ExchangeRate>(cacheKey);
  if (cached) {
    log.debug('Cache hit for exchange rate', { from: normalizedFrom, to: normalizedTo });
    return cached;
  }

  log.debug('Cache miss for exchange rate', { from: normalizedFrom, to: normalizedTo });

  const rate = await withTimeout(
    () => withRetry(() => fetchFromFrankfurter(normalizedFrom, normalizedTo), {
      maxRetries: 2,
      delayMs: 500,
    }),
    API_TIMEOUT,
    `fetchExchangeRate:${normalizedFrom}/${normalizedTo}`
  );

  exchangeRateCache.set(cacheKey, rate, CACHE_TTL);
  log.info('Exchange rate fetched from Frankfurter', { from: normalizedFrom, to: normalizedTo, rate: rate.rate });
  return rate;
}

/**
 * Get multiple exchange rates
 */
export async function getMultipleExchangeRates(
  base: string,
  targets: string[]
): Promise<ExchangeRate[]> {
  const results = await Promise.allSettled(
    targets.map((target) => getExchangeRate(base, target))
  );

  return results
    .filter((result): result is PromiseFulfilledResult<ExchangeRate> => result.status === 'fulfilled')
    .map((result) => result.value);
}

/**
 * Get list of supported currencies
 */
export function getSupportedCurrencies(): string[] {
  return [...SUPPORTED_CURRENCIES];
}
