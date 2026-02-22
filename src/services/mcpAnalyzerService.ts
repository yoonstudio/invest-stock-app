/**
 * MCP Analyzer Service - @mrbaeksang/korea-stock-analyzer-mcp wrapper
 *
 * Provides access to:
 * - Financial data (PER, PBR, ROE, etc.)
 * - Technical indicators (RSI, MACD, MA, Bollinger Bands)
 * - DCF valuation
 * - News sentiment analysis
 * - Supply/demand analysis (institutional/foreign investors)
 * - Peer comparison
 * - Guru analysis (6 investment legends)
 *
 * NOTE: All tools use `ticker` (not `symbol`) as the parameter name.
 * ticker should be a pure Korean stock code like "005930" (without .KS suffix).
 */

import { callTool, isConnected } from './mcpClientManager.js';
import { logger } from '../shared/logger/index.js';

const log = logger.child('McpAnalyzerService');

const SERVER: 'analyzer' = 'analyzer';

function ensureConnected(): void {
  if (!isConnected(SERVER)) {
    throw new Error('korea-stock-analyzer MCP server is not connected');
  }
}

/**
 * Normalize symbol to pure ticker code (strip .KS suffix)
 */
function toTicker(symbol: string): string {
  return symbol.replace(/\.KS$/i, '').toUpperCase();
}

/**
 * Get financial data (PER, PBR, EPS, ROE, etc.)
 */
export async function getFinancialData(symbol: string): Promise<unknown> {
  ensureConnected();
  const ticker = toTicker(symbol);
  log.debug('getFinancialData', { ticker });
  return callTool(SERVER, 'get_financial_data', { ticker });
}

/**
 * Get technical indicators (RSI, MACD, MA, Bollinger Bands, etc.)
 */
export async function getTechnicalIndicators(symbol: string): Promise<unknown> {
  ensureConnected();
  const ticker = toTicker(symbol);
  log.debug('getTechnicalIndicators', { ticker });
  return callTool(SERVER, 'get_technical_indicators', { ticker });
}

/**
 * Calculate DCF intrinsic value
 */
export async function calculateDCF(symbol: string): Promise<unknown> {
  ensureConnected();
  const ticker = toTicker(symbol);
  log.debug('calculateDCF', { ticker });
  return callTool(SERVER, 'calculate_dcf', { ticker });
}

/**
 * Search news with sentiment analysis
 * Note: search_news requires `company_name` (required), `ticker` (optional)
 */
export async function searchNews(query: string, ticker?: string): Promise<unknown> {
  ensureConnected();
  log.debug('searchNews', { query, ticker });
  return callTool(SERVER, 'search_news', {
    company_name: query,
    ...(ticker ? { ticker: toTicker(ticker) } : {}),
  });
}

/**
 * Get supply/demand analysis (institutional/foreign investor trends)
 */
export async function getSupplyDemand(symbol: string): Promise<unknown> {
  ensureConnected();
  const ticker = toTicker(symbol);
  log.debug('getSupplyDemand', { ticker });
  return callTool(SERVER, 'get_supply_demand', { ticker });
}

/**
 * Compare with peer companies in the same industry
 */
export async function comparePeers(symbol: string): Promise<unknown> {
  ensureConnected();
  const ticker = toTicker(symbol);
  log.debug('comparePeers', { ticker });
  return callTool(SERVER, 'compare_peers', { ticker });
}

/**
 * Comprehensive equity analysis using 6 investment gurus' strategies
 * Required: ticker + company_name
 */
export async function analyzeEquity(symbol: string, companyName?: string): Promise<unknown> {
  ensureConnected();
  const ticker = toTicker(symbol);
  log.debug('analyzeEquity', { ticker, companyName });
  return callTool(SERVER, 'analyze_equity', {
    ticker,
    company_name: companyName || ticker,
    report_type: 'quick',
  });
}
