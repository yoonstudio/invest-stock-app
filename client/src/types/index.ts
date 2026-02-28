// Stock Types
export interface StockPrice {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  high52Week: number;
  low52Week: number;
  timestamp: string;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

// Portfolio Types
export interface Holding {
  symbol: string;
  quantity: number;
  avgPrice: number;
}

export interface HoldingAnalysis extends Holding {
  name: string;
  currentPrice: number;
  value: number;
  return: number;
  returnPercent: number;
  weight: number;
}

export interface PortfolioAnalysis {
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  totalReturnPercent: number;
  holdings: HoldingAnalysis[];
  allocation: Record<string, number>;
  riskMetrics: {
    beta: number;
    volatility: number;
  };
}

// News Types
export interface NewsArticle {
  title: string;
  source: string;
  publishedAt: string;
  summary: string;
  url: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface NewsResponse {
  query: string;
  articles: NewsArticle[];
  totalCount: number;
}

// Exchange Rate Types
export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

// Market Index Types
export interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

// Chart Data Types
export interface ChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// MCP Analysis Types
// ============================================================================

// Technical Indicators (RSI, MACD, MA, Bollinger Bands, etc.)
export interface TechnicalIndicators {
  symbol: string;
  rsi?: number;
  rsiSignal?: string;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
  movingAverages?: {
    ma5?: number;
    ma20?: number;
    ma60?: number;
    ma120?: number;
  };
  bollingerBands?: {
    upper: number;
    middle: number;
    lower: number;
  };
  stochastic?: {
    k: number;
    d: number;
  };
  signal?: string;
  summary?: string;
  [key: string]: unknown;
}

// Financial Data (PER, PBR, EPS, ROE, etc.)
export interface FinancialData {
  symbol: string;
  per?: number;
  pbr?: number;
  eps?: number;
  roe?: number;
  roa?: number;
  debtRatio?: number;
  operatingMargin?: number;
  netMargin?: number;
  revenue?: number;
  operatingProfit?: number;
  netIncome?: number;
  dividendYield?: number;
  summary?: string;
  [key: string]: unknown;
}

// DCF Valuation Result
export interface DCFResult {
  symbol: string;
  intrinsicValue?: number;
  currentPrice?: number;
  upside?: number;
  discountRate?: number;
  terminalGrowthRate?: number;
  summary?: string;
  [key: string]: unknown;
}

// Supply/Demand Analysis
export interface SupplyDemand {
  symbol: string;
  institutional?: {
    buyVolume?: number;
    sellVolume?: number;
    netVolume?: number;
  };
  foreign?: {
    buyVolume?: number;
    sellVolume?: number;
    netVolume?: number;
  };
  individual?: {
    buyVolume?: number;
    sellVolume?: number;
    netVolume?: number;
  };
  trend?: string;
  summary?: string;
  [key: string]: unknown;
}

// Peer Comparison
export interface PeerComparison {
  symbol: string;
  peers?: Array<{
    symbol: string;
    name: string;
    per?: number;
    pbr?: number;
    roe?: number;
    marketCap?: number;
    [key: string]: unknown;
  }>;
  summary?: string;
  [key: string]: unknown;
}

// Equity Analysis (6 Investment Gurus)
export interface EquityAnalysis {
  symbol: string;
  analyses?: Array<{
    guru: string;
    score?: number;
    verdict?: string;
    criteria?: Record<string, unknown>;
    [key: string]: unknown;
  }>;
  overallScore?: number;
  overallVerdict?: string;
  summary?: string;
  [key: string]: unknown;
}

// DART Disclosure
export interface DartDisclosure {
  title: string;
  corpName?: string;
  date?: string;
  type?: string;
  url?: string;
  [key: string]: unknown;
}

// Stock Recommendation Types
export interface CountryMeta {
  code: string;
  label: string;
  flag: string;
}

export interface SectorGroup {
  group: string;
  sectors: string[];
}

export interface ScreeningCriteria {
  roeMin: number;       // ROE >= roeMin%
  perRatioMax: number;  // PER < industryPER * (perRatioMax/100)
  pbrRatioMax: number;  // PBR < industryPBR * (pbrRatioMax/100)
  epsMin: number;       // EPS CAGR >= epsMin%
  requireMoat: boolean;
  countries: string[];  // [] = all countries
  sectors: string[];    // [] = all sectors
}

export const DEFAULT_SCREENING_CRITERIA: ScreeningCriteria = {
  roeMin: 15,
  perRatioMax: 90,
  pbrRatioMax: 80,
  epsMin: 15,
  requireMoat: true,
  countries: [],
  sectors: [],
};

export const AVAILABLE_COUNTRIES: CountryMeta[] = [
  { code: 'KR', label: '대한민국', flag: '🇰🇷' },
  { code: 'US', label: '미국', flag: '🇺🇸' },
];

export const SECTOR_GROUPS: SectorGroup[] = [
  {
    group: '기술/반도체',
    sectors: ['반도체', 'AI반도체', '클라우드/AI', 'CRM/SaaS', 'IT플랫폼', '인터넷/AI'],
  },
  {
    group: '소비자/플랫폼',
    sectors: ['소비자전자', '소셜미디어', '이커머스/클라우드', '게임', '멤버십리테일'],
  },
  {
    group: '금융/결제',
    sectors: ['결제네트워크', '금융지주'],
  },
  {
    group: '산업/에너지',
    sectors: ['자동차', '2차전지', '화학/소재', '조선', '방산/항공', '지주회사'],
  },
  {
    group: '헬스케어/바이오',
    sectors: ['헬스케어/제약', '바이오CDMO', '바이오시밀러'],
  },
];

export interface RecommendedStockMetrics {
  roe: number;
  per: number;
  industryPER: number;
  pbr: number;
  industryPBR: number;
  epsCAGR: number;
  perDiscount: number;
  pbrDiscount: number;
}

export interface RecommendedStock {
  symbol: string;
  name: string;
  sector: string;
  country: string;
  moat: string;
  hasMoat: boolean;
  metrics: RecommendedStockMetrics;
  score: number;
  passedCriteria: string[];
}

// MCP Server Status
export interface McpStatus {
  jjlabs: {
    connected: boolean;
    lastError: string | null;
    connectedAt: string | null;
  };
  analyzer: {
    connected: boolean;
    lastError: string | null;
    connectedAt: string | null;
  };
}
