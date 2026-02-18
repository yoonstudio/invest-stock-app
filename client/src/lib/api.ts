import axios, { AxiosError } from 'axios';
import {
  StockPrice,
  StockSearchResult,
  PortfolioAnalysis,
  Holding,
  NewsResponse,
  ExchangeRate,
  MarketIndex,
  ChartDataPoint,
  TechnicalIndicators,
  FinancialData,
  DCFResult,
  SupplyDemand,
  PeerComparison,
  EquityAnalysis,
  McpStatus,
} from '@/types';

// API Base URL - REST API server
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API response type
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

function handleApiError(error: unknown): never {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.error?.message || error.message;
    throw new Error(`API Error: ${message}`);
  }
  throw error;
}

async function fetchApi<T>(url: string): Promise<T> {
  try {
    const response = await api.get<ApiResponse<T>>(url);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error?.message || 'Request failed');
  } catch (error) {
    handleApiError(error);
  }
}

// ============================================================================
// Stock APIs
// ============================================================================

export async function getStockPrice(symbol: string): Promise<StockPrice> {
  return fetchApi<StockPrice>(`/stocks/${encodeURIComponent(symbol)}`);
}

export async function getMultipleStockPrices(symbols: string[]): Promise<StockPrice[]> {
  try {
    const response = await api.post<ApiResponse<{ stocks: StockPrice[] }>>('/stocks', { symbols });
    if (response.data.success && response.data.data) {
      return response.data.data.stocks;
    }
    throw new Error(response.data.error?.message || 'Failed to fetch stocks');
  } catch (error) {
    handleApiError(error);
  }
}

export async function searchStocks(query: string, limit: number = 10): Promise<StockSearchResult[]> {
  return fetchApi<StockSearchResult[]>(`/stocks/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export async function getStockChart(
  symbol: string,
  period: string = '1mo',
  interval: string = '1d'
): Promise<ChartDataPoint[]> {
  return fetchApi<ChartDataPoint[]>(
    `/stocks/${encodeURIComponent(symbol)}/chart?period=${encodeURIComponent(period)}&interval=${encodeURIComponent(interval)}`
  );
}

// ============================================================================
// MCP Analysis APIs
// ============================================================================

export async function getTechnicalIndicators(symbol: string): Promise<TechnicalIndicators> {
  return fetchApi<TechnicalIndicators>(`/stocks/${encodeURIComponent(symbol)}/technical`);
}

export async function getFinancialData(symbol: string): Promise<FinancialData> {
  return fetchApi<FinancialData>(`/stocks/${encodeURIComponent(symbol)}/financial`);
}

export async function calculateDCF(symbol: string): Promise<DCFResult> {
  return fetchApi<DCFResult>(`/stocks/${encodeURIComponent(symbol)}/dcf`);
}

export async function getSupplyDemand(symbol: string): Promise<SupplyDemand> {
  return fetchApi<SupplyDemand>(`/stocks/${encodeURIComponent(symbol)}/supply`);
}

export async function comparePeers(symbol: string): Promise<PeerComparison> {
  return fetchApi<PeerComparison>(`/stocks/${encodeURIComponent(symbol)}/peers`);
}

export async function analyzeEquity(symbol: string): Promise<EquityAnalysis> {
  return fetchApi<EquityAnalysis>(`/stocks/${encodeURIComponent(symbol)}/analysis`);
}

export async function getDartDisclosures(corpCode: string): Promise<unknown> {
  return fetchApi(`/dart/disclosures?corpCode=${encodeURIComponent(corpCode)}`);
}

export async function getMcpStatus(): Promise<McpStatus> {
  return fetchApi<McpStatus>('/mcp/status');
}

export async function reconnectMcp(): Promise<{ results: Record<string, boolean>; status: McpStatus }> {
  const response = await api.post<ApiResponse<{ results: Record<string, boolean>; status: McpStatus }>>('/mcp/reconnect');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error('MCP reconnect failed');
}

export async function restartServer(): Promise<{ restarted: boolean; status: McpStatus }> {
  const response = await api.post<ApiResponse<{ restarted: boolean; status: McpStatus }>>('/server/restart');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error('Server restart failed');
}

// ============================================================================
// Portfolio APIs
// ============================================================================

export async function analyzePortfolio(holdings: Holding[]): Promise<PortfolioAnalysis> {
  try {
    const response = await api.post<ApiResponse<PortfolioAnalysis>>('/portfolio/analyze', { holdings });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error?.message || 'Failed to analyze portfolio');
  } catch (error) {
    handleApiError(error);
  }
}

// ============================================================================
// News APIs
// ============================================================================

export async function getInvestmentNews(query: string, limit: number = 5): Promise<NewsResponse> {
  return fetchApi<NewsResponse>(`/news?query=${encodeURIComponent(query)}&limit=${limit}`);
}

// ============================================================================
// Exchange Rate APIs
// ============================================================================

export async function getExchangeRate(from: string, to: string): Promise<ExchangeRate> {
  return fetchApi<ExchangeRate>(`/exchange?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

export async function getMainExchangeRates(): Promise<ExchangeRate[]> {
  const pairs = [
    { from: 'USD', to: 'KRW' },
    { from: 'EUR', to: 'KRW' },
    { from: 'JPY', to: 'KRW' },
    { from: 'CNY', to: 'KRW' },
    { from: 'GBP', to: 'KRW' },
  ];
  return Promise.all(pairs.map(p => getExchangeRate(p.from, p.to)));
}

// ============================================================================
// Market Indices (Real-time from Yahoo Finance via REST API)
// ============================================================================

export async function getMarketIndices(): Promise<MarketIndex[]> {
  return fetchApi<MarketIndex[]>('/market/indices');
}

export default api;
