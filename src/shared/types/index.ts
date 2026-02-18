/**
 * Shared type definitions for Investment MCP
 */

// Stock related types
export interface StockPrice {
  symbol: string;
  name: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number | null;
  high52Week: number | null;
  low52Week: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  timestamp: string;
  currency: string;
  exchange: string;
}

// Portfolio related types
export interface Holding {
  symbol: string;
  quantity: number;
  avgPrice: number;
}

export interface HoldingAnalysis {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  cost: number;
  return: number;
  returnPercent: number;
  weight: number;
  currency: string;
}

export interface SectorAllocation {
  [sector: string]: number;
}

export interface RiskMetrics {
  diversificationScore: number;
  topHoldingWeight: number;
  sectorConcentration: string;
}

export interface PortfolioAnalysis {
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  totalReturnPercent: number;
  holdings: HoldingAnalysis[];
  allocation: SectorAllocation;
  riskMetrics: RiskMetrics;
  currency: string;
  analyzedAt: string;
}

// News related types
export interface NewsArticle {
  title: string;
  source: string;
  publishedAt: string;
  summary: string;
  url: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  imageUrl?: string | undefined;
}

export interface NewsResponse {
  query: string;
  articles: NewsArticle[];
  totalCount: number;
  fetchedAt: string;
}

// Exchange rate types
export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  change: number | null;
  changePercent: number | null;
  timestamp: string;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

// Stock search result
export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

// Cache entry type
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Common error codes
export enum ErrorCode {
  INVALID_SYMBOL = 'INVALID_SYMBOL',
  API_ERROR = 'API_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TIMEOUT = 'TIMEOUT',
}

// Stock sector mapping (simplified)
export const STOCK_SECTORS: Record<string, string> = {
  // US Tech
  'AAPL': 'Technology',
  'MSFT': 'Technology',
  'GOOGL': 'Technology',
  'GOOG': 'Technology',
  'META': 'Technology',
  'AMZN': 'Consumer Cyclical',
  'NVDA': 'Technology',
  'TSLA': 'Consumer Cyclical',
  // US Finance
  'JPM': 'Financial Services',
  'BAC': 'Financial Services',
  'WFC': 'Financial Services',
  'GS': 'Financial Services',
  // US Healthcare
  'JNJ': 'Healthcare',
  'UNH': 'Healthcare',
  'PFE': 'Healthcare',
  // Korean stocks
  '005930.KS': 'Technology',  // Samsung Electronics
  '000660.KS': 'Technology',  // SK Hynix
  '035420.KS': 'Technology',  // Naver
  '035720.KS': 'Technology',  // Kakao
  '005380.KS': 'Consumer Cyclical',  // Hyundai Motor
  '051910.KS': 'Consumer Defensive',  // LG Chem
  '006400.KS': 'Technology',  // Samsung SDI
  '003550.KS': 'Financial Services',  // LG
  '105560.KS': 'Financial Services',  // KB Financial
  '055550.KS': 'Financial Services',  // Shinhan Financial
};

// Default sector for unknown stocks
export const DEFAULT_SECTOR = 'Other';

// Supported currencies
export const SUPPORTED_CURRENCIES = [
  'USD', 'KRW', 'EUR', 'JPY', 'CNY', 'GBP', 'CHF', 'CAD', 'AUD', 'HKD'
];

// Market index type
export interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

// Chart data point type (OHLCV)
export interface ChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
