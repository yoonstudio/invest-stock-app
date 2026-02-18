/**
 * Portfolio analysis service
 */

import type {
  Holding,
  HoldingAnalysis,
  PortfolioAnalysis,
  SectorAllocation,
  RiskMetrics,
} from '../shared/types/index.js';
import { portfolioCache } from '../shared/cache/index.js';
import { logger } from '../shared/logger/index.js';
import { ValidationError } from '../shared/errors/index.js';
import { getStockPrice, getStockSector } from './stockService.js';

const log = logger.child('PortfolioService');

// Cache TTL: 30 seconds for portfolio analysis
const CACHE_TTL = 30 * 1000;

// Validation limits
const MAX_HOLDINGS = 50;
const MIN_HOLDINGS = 1;

/**
 * Validate portfolio holdings input
 */
function validateHoldings(holdings: Holding[]): void {
  if (!Array.isArray(holdings) || holdings.length < MIN_HOLDINGS) {
    throw new ValidationError(`Portfolio must have at least ${MIN_HOLDINGS} holding(s)`);
  }

  if (holdings.length > MAX_HOLDINGS) {
    throw new ValidationError(`Portfolio cannot exceed ${MAX_HOLDINGS} holdings`);
  }

  for (const holding of holdings) {
    if (!holding.symbol || typeof holding.symbol !== 'string') {
      throw new ValidationError('Each holding must have a valid symbol');
    }

    if (typeof holding.quantity !== 'number' || holding.quantity <= 0) {
      throw new ValidationError(`Invalid quantity for ${holding.symbol}: must be positive number`);
    }

    if (typeof holding.avgPrice !== 'number' || holding.avgPrice <= 0) {
      throw new ValidationError(`Invalid average price for ${holding.symbol}: must be positive number`);
    }
  }

  // Check for duplicate symbols
  const symbols = holdings.map((h) => h.symbol.toUpperCase());
  const uniqueSymbols = new Set(symbols);
  if (uniqueSymbols.size !== symbols.length) {
    throw new ValidationError('Portfolio contains duplicate symbols');
  }
}

/**
 * Create cache key from holdings
 */
function createCacheKey(holdings: Holding[]): string {
  const sortedHoldings = [...holdings]
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
    .map((h) => `${h.symbol.toUpperCase()}:${h.quantity}:${h.avgPrice}`)
    .join('|');

  // Simple hash function for cache key
  let hash = 0;
  for (let i = 0; i < sortedHoldings.length; i++) {
    const char = sortedHoldings.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return `portfolio:${hash.toString(16)}`;
}

/**
 * Calculate sector allocation
 */
function calculateSectorAllocation(
  holdingAnalyses: HoldingAnalysis[],
  totalValue: number
): SectorAllocation {
  const sectorValues: Record<string, number> = {};

  for (const holding of holdingAnalyses) {
    const sector = getStockSector(holding.symbol);
    sectorValues[sector] = (sectorValues[sector] || 0) + holding.value;
  }

  const allocation: SectorAllocation = {};
  for (const [sector, value] of Object.entries(sectorValues)) {
    allocation[sector] = Number(((value / totalValue) * 100).toFixed(2));
  }

  return allocation;
}

/**
 * Calculate risk metrics
 */
function calculateRiskMetrics(
  holdingAnalyses: HoldingAnalysis[],
  allocation: SectorAllocation
): RiskMetrics {
  // Diversification score (1-10, based on number of holdings and sector distribution)
  const numHoldings = holdingAnalyses.length;
  const numSectors = Object.keys(allocation).length;

  // Base score from number of holdings
  let diversificationScore = Math.min(numHoldings / 5, 5); // Max 5 from holdings

  // Additional score from sector diversity
  const sectorScore = Math.min(numSectors / 3, 3); // Max 3 from sectors

  // Penalty for concentration in single sector
  const maxSectorWeight = Math.max(...Object.values(allocation));
  const concentrationPenalty = maxSectorWeight > 50 ? 2 : maxSectorWeight > 30 ? 1 : 0;

  diversificationScore = Math.max(1, Math.min(10,
    Math.round((diversificationScore + sectorScore - concentrationPenalty) * 10) / 10
  ));

  // Find top holding weight
  const topHoldingWeight = Math.max(...holdingAnalyses.map((h) => h.weight));

  // Find most concentrated sector
  const sortedSectors = Object.entries(allocation).sort((a, b) => b[1] - a[1]);
  const sectorConcentration = sortedSectors[0]?.[0] || 'Unknown';

  return {
    diversificationScore,
    topHoldingWeight: Number(topHoldingWeight.toFixed(2)),
    sectorConcentration,
  };
}

/**
 * Analyze portfolio holdings
 */
export async function analyzePortfolio(holdings: Holding[]): Promise<PortfolioAnalysis> {
  // Validate input
  validateHoldings(holdings);

  const cacheKey = createCacheKey(holdings);

  // Try to get from cache first
  const cached = portfolioCache.get<PortfolioAnalysis>(cacheKey);
  if (cached) {
    log.debug('Cache hit for portfolio analysis', { holdingsCount: holdings.length });
    return cached;
  }

  log.debug('Analyzing portfolio', { holdingsCount: holdings.length });
  const startTime = Date.now();

  // Fetch current prices for all holdings in parallel
  const priceResults = await Promise.allSettled(
    holdings.map((h) => getStockPrice(h.symbol))
  );

  // Build holding analyses
  const holdingAnalyses: HoldingAnalysis[] = [];
  let totalValue = 0;
  let totalCost = 0;
  let mainCurrency = 'USD';

  for (let i = 0; i < holdings.length; i++) {
    const holding = holdings[i];
    const priceResult = priceResults[i];

    if (!holding || !priceResult) {
      continue;
    }

    if (priceResult.status === 'rejected') {
      log.warn('Failed to fetch price for holding', {
        symbol: holding.symbol,
        error: String(priceResult.reason),
      });
      continue;
    }

    const stockPrice = priceResult.value;
    const value = stockPrice.currentPrice * holding.quantity;
    const cost = holding.avgPrice * holding.quantity;
    const returnAmount = value - cost;
    const returnPercent = (returnAmount / cost) * 100;

    // Track currency (prefer KRW if any Korean stocks)
    if (stockPrice.currency === 'KRW') {
      mainCurrency = 'KRW';
    }

    holdingAnalyses.push({
      symbol: holding.symbol.toUpperCase(),
      name: stockPrice.name,
      quantity: holding.quantity,
      avgPrice: holding.avgPrice,
      currentPrice: stockPrice.currentPrice,
      value,
      cost,
      return: Number(returnAmount.toFixed(2)),
      returnPercent: Number(returnPercent.toFixed(2)),
      weight: 0, // Will be calculated after total is known
      currency: stockPrice.currency,
    });

    totalValue += value;
    totalCost += cost;
  }

  // Calculate weights
  for (const analysis of holdingAnalyses) {
    analysis.weight = Number(((analysis.value / totalValue) * 100).toFixed(2));
  }

  // Sort by value descending
  holdingAnalyses.sort((a, b) => b.value - a.value);

  // Calculate sector allocation
  const allocation = calculateSectorAllocation(holdingAnalyses, totalValue);

  // Calculate risk metrics
  const riskMetrics = calculateRiskMetrics(holdingAnalyses, allocation);

  // Build final analysis
  const totalReturn = totalValue - totalCost;
  const totalReturnPercent = (totalReturn / totalCost) * 100;

  const analysis: PortfolioAnalysis = {
    totalValue: Number(totalValue.toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
    totalReturn: Number(totalReturn.toFixed(2)),
    totalReturnPercent: Number(totalReturnPercent.toFixed(2)),
    holdings: holdingAnalyses,
    allocation,
    riskMetrics,
    currency: mainCurrency,
    analyzedAt: new Date().toISOString(),
  };

  // Cache the result
  portfolioCache.set(cacheKey, analysis, CACHE_TTL);

  const durationMs = Date.now() - startTime;
  log.info('Portfolio analysis completed', {
    holdingsCount: holdingAnalyses.length,
    totalValue: analysis.totalValue,
    totalReturnPercent: analysis.totalReturnPercent,
    durationMs,
  });

  return analysis;
}

/**
 * Get portfolio summary (lighter version for quick display)
 */
export async function getPortfolioSummary(holdings: Holding[]): Promise<{
  totalValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  topHolding: string;
  currency: string;
}> {
  const analysis = await analyzePortfolio(holdings);

  return {
    totalValue: analysis.totalValue,
    totalReturn: analysis.totalReturn,
    totalReturnPercent: analysis.totalReturnPercent,
    topHolding: analysis.holdings[0]?.symbol || 'N/A',
    currency: analysis.currency,
  };
}
