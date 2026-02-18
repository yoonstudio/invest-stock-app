/**
 * Stock price service - MCP-based Korean stock data via jjlabs KRX
 * Falls back to Yahoo Finance API for non-Korean stocks
 */

import type { StockPrice, MarketIndex, ChartDataPoint, StockSearchResult } from '../shared/types/index.js';
import { STOCK_SECTORS, DEFAULT_SECTOR } from '../shared/types/index.js';
import { stockCache } from '../shared/cache/index.js';
import { logger } from '../shared/logger/index.js';
import {
  InvalidSymbolError,
  ApiError,
  withRetry,
  withTimeout,
  CircuitBreaker,
  parallelWithLimit,
} from '../shared/errors/index.js';
import { getKrxStockInfo, getDartCorpCode } from './mcpStockService.js';
import { isConnected, callTool } from './mcpClientManager.js';

const log = logger.child('StockService');

const CACHE_TTL = 60 * 1000;
const STALE_TTL = 30 * 1000;
const API_TIMEOUT = 10000;
const CONCURRENCY_LIMIT = 5;

const yahooFinanceBreaker = new CircuitBreaker('YahooFinance', {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenSuccessThreshold: 2,
});

/**
 * Check if symbol is a Korean stock
 */
function isKoreanStock(symbol: string): boolean {
  return /^\d{6}(\.KS)?$/.test(symbol);
}

/**
 * Normalize Korean stock symbol (ensure no .KS suffix for KRX API)
 */
function normalizeKrxSymbol(symbol: string): string {
  return symbol.replace(/\.KS$/i, '');
}

/**
 * Fetch stock price from KRX via jjlabs MCP server
 */
async function fetchFromKrx(symbol: string): Promise<StockPrice> {
  const krxSymbol = normalizeKrxSymbol(symbol);
  log.debug('Fetching from KRX via MCP', { symbol, krxSymbol });

  const data = await getKrxStockInfo(krxSymbol) as Record<string, unknown>;

  // Map MCP response to StockPrice format
  const currentPrice = Number(data.currentPrice ?? data.price ?? data.close ?? 0);
  const previousClose = Number(data.previousClose ?? data.prevClose ?? 0);

  return {
    symbol: symbol.includes('.KS') ? symbol.toUpperCase() : `${krxSymbol}.KS`,
    name: String(data.name ?? data.stockName ?? symbol),
    currentPrice,
    previousClose,
    change: currentPrice - previousClose,
    changePercent: previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0,
    volume: Number(data.volume ?? data.tradingVolume ?? 0),
    marketCap: data.marketCap ? Number(data.marketCap) : null,
    high52Week: data.high52Week ? Number(data.high52Week) : null,
    low52Week: data.low52Week ? Number(data.low52Week) : null,
    dayHigh: data.dayHigh ?? data.high ? Number(data.dayHigh ?? data.high) : null,
    dayLow: data.dayLow ?? data.low ? Number(data.dayLow ?? data.low) : null,
    timestamp: new Date().toISOString(),
    currency: 'KRW',
    exchange: 'KRX',
  };
}

/**
 * Fetch stock price from Yahoo Finance API (for non-Korean stocks)
 */
async function fetchFromYahooFinance(symbol: string): Promise<StockPrice> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

  log.debug('Fetching from Yahoo Finance', { symbol, url });
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      log.logApiCall('GET', url, response.status, durationMs);
      throw new ApiError(`Yahoo Finance API error: ${response.status}`);
    }

    interface YahooFinanceResponse {
      chart?: {
        result?: Array<{
          meta?: {
            symbol?: string;
            shortName?: string;
            longName?: string;
            regularMarketPrice?: number;
            previousClose?: number;
            chartPreviousClose?: number;
            regularMarketVolume?: number;
            marketCap?: number;
            fiftyTwoWeekHigh?: number;
            fiftyTwoWeekLow?: number;
            regularMarketDayHigh?: number;
            regularMarketDayLow?: number;
            currency?: string;
            exchangeName?: string;
            exchange?: string;
          };
          indicators?: {
            quote?: Array<{
              volume?: number[];
              high?: number[];
              low?: number[];
            }>;
          };
        }>;
      };
    }

    const data = await response.json() as YahooFinanceResponse;
    log.logApiCall('GET', url, response.status, durationMs);

    const result = data?.chart?.result?.[0];
    if (!result || !result.meta) {
      throw new InvalidSymbolError(symbol);
    }

    const quote = result.meta;
    const indicators = result.indicators?.quote?.[0];

    const currentPrice = quote.regularMarketPrice ?? quote.previousClose ?? 0;
    const previousClose = quote.chartPreviousClose ?? quote.previousClose ?? 0;
    const indicatorVolume = indicators?.volume;
    const indicatorHigh = indicators?.high;
    const indicatorLow = indicators?.low;
    const lastVolume = indicatorVolume && indicatorVolume.length > 0 ? indicatorVolume[indicatorVolume.length - 1] : undefined;
    const lastHigh = indicatorHigh && indicatorHigh.length > 0 ? indicatorHigh[indicatorHigh.length - 1] : undefined;
    const lastLow = indicatorLow && indicatorLow.length > 0 ? indicatorLow[indicatorLow.length - 1] : undefined;

    return {
      symbol: quote.symbol ?? symbol,
      name: quote.shortName ?? quote.longName ?? symbol,
      currentPrice,
      previousClose,
      change: currentPrice - previousClose,
      changePercent: previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0,
      volume: quote.regularMarketVolume ?? lastVolume ?? 0,
      marketCap: quote.marketCap ?? null,
      high52Week: quote.fiftyTwoWeekHigh ?? null,
      low52Week: quote.fiftyTwoWeekLow ?? null,
      dayHigh: quote.regularMarketDayHigh ?? lastHigh ?? null,
      dayLow: quote.regularMarketDayLow ?? lastLow ?? null,
      timestamp: new Date().toISOString(),
      currency: quote.currency ?? 'USD',
      exchange: quote.exchangeName ?? quote.exchange ?? 'UNKNOWN',
    };
  } catch (error) {
    if (error instanceof InvalidSymbolError || error instanceof ApiError) {
      throw error;
    }
    log.error('Yahoo Finance API fetch failed', error as Error, { symbol });
    throw new ApiError(`Failed to fetch stock data for ${symbol}`, { originalError: String(error) });
  }
}

/**
 * Get stock price with MCP for Korean stocks, Yahoo Finance for others
 */
export async function getStockPrice(symbol: string): Promise<StockPrice> {
  const normalizedSymbol = symbol.toUpperCase();
  const cacheKey = `stock:${normalizedSymbol}`;

  return stockCache.getOrSet<StockPrice>(
    cacheKey,
    async () => {
      log.debug('Fetching stock price', { symbol: normalizedSymbol });

      // Korean stock → use KRX via MCP
      if (isKoreanStock(normalizedSymbol) && isConnected('jjlabs')) {
        try {
          const stockPrice = await withTimeout(
            () => fetchFromKrx(normalizedSymbol),
            API_TIMEOUT,
            `fetchKrxStock:${normalizedSymbol}`
          );
          log.info('Stock price fetched from KRX MCP', {
            symbol: normalizedSymbol,
            price: stockPrice.currentPrice,
          });
          return stockPrice;
        } catch (error) {
          log.warn('KRX MCP fetch failed, falling back to Yahoo Finance', {
            symbol: normalizedSymbol,
            error: String(error),
          });
        }
      }

      // Non-Korean stock or KRX fallback → Yahoo Finance
      try {
        const stockPrice = await yahooFinanceBreaker.execute(
          () => withTimeout(
            () => withRetry(
              () => fetchFromYahooFinance(normalizedSymbol),
              {
                maxRetries: 2,
                delayMs: 500,
                jitter: true,
                onRetry: (error, attempt, delay) => {
                  log.warn('Retrying API call', {
                    symbol: normalizedSymbol,
                    attempt,
                    delay,
                    error: String(error),
                  });
                },
              }
            ),
            API_TIMEOUT,
            `fetchStockPrice:${normalizedSymbol}`
          )
        );

        log.info('Stock price fetched from Yahoo Finance', {
          symbol: normalizedSymbol,
          price: stockPrice.currentPrice,
        });
        return stockPrice;
      } catch (apiError) {
        log.warn('All stock data sources failed', {
          symbol: normalizedSymbol,
          error: String(apiError),
        });

        if (apiError instanceof InvalidSymbolError) {
          throw apiError;
        }
        throw new InvalidSymbolError(normalizedSymbol);
      }
    },
    CACHE_TTL,
    STALE_TTL
  );
}

/**
 * Get multiple stock prices with controlled concurrency
 */
export async function getMultipleStockPrices(symbols: string[]): Promise<StockPrice[]> {
  const results = await parallelWithLimit(
    symbols,
    (symbol) => getStockPrice(symbol),
    {
      concurrency: CONCURRENCY_LIMIT,
      continueOnError: true,
      onProgress: (completed, total) => {
        log.debug('Fetching multiple stock prices', { completed, total });
      },
    }
  );

  return results
    .filter((result): result is { status: 'fulfilled'; value: StockPrice } =>
      result.status === 'fulfilled'
    )
    .map((result) => result.value);
}

/**
 * Get circuit breaker status
 */
export function getCircuitBreakerStatus(): {
  state: string;
  failures: number;
  lastFailure: Date | null;
} {
  return yahooFinanceBreaker.getState();
}

/**
 * Get stock sector
 */
export function getStockSector(symbol: string): string {
  return STOCK_SECTORS[symbol.toUpperCase()] || DEFAULT_SECTOR;
}

/**
 * Get list of commonly tracked Korean stocks
 */
export function getAvailableMockSymbols(): string[] {
  return [
    '005930.KS', '000660.KS', '035420.KS', '035720.KS',
    '005380.KS', '051910.KS', '006400.KS',
    'AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA',
  ];
}

// ============================================================================
// Stock Search - MCP first, Yahoo Finance fallback
// ============================================================================

// Runtime-updatable Korean company name → symbol local map
// Includes KRX top 100+ stocks for instant Korean search
const KRX_STOCKS: [string, string][] = [
  // KOSPI 시가총액 상위
  ['005930', '삼성전자'], ['000660', 'SK하이닉스'], ['373220', 'LG에너지솔루션'],
  ['005935', '삼성전자우'], ['207940', '삼성바이오로직스'], ['005380', '현대자동차'],
  ['000270', '기아'], ['006400', '삼성SDI'], ['051910', 'LG화학'],
  ['035420', '네이버'], ['035720', '카카오'], ['003550', 'LG'],
  ['105560', 'KB금융'], ['055550', '신한지주'], ['034730', 'SK'],
  ['012330', '현대모비스'], ['066570', 'LG전자'], ['028260', '삼성물산'],
  ['003670', '포스코퓨처엠'], ['005490', 'POSCO홀딩스'], ['068270', '셀트리온'],
  ['259960', '크래프톤'], ['017670', 'SK텔레콤'], ['030200', 'KT'],
  ['032830', '삼성생명'], ['316140', '우리금융지주'], ['086790', '하나금융지주'],
  ['018260', '삼성에스디에스'], ['009150', '삼성전기'], ['036570', '엔씨소프트'],
  ['010130', '고려아연'], ['033780', 'KT&G'], ['000880', '한화'],
  ['009540', '한국조선해양'], ['011200', 'HMM'], ['010950', 'S-Oil'],
  ['015760', '한국전력'], ['034020', '두산에너빌리티'], ['323410', '카카오뱅크'],
  ['352820', '하이브'], ['047050', '포스코인터내셔널'], ['096770', 'SK이노베이션'],
  ['024110', '기업은행'], ['161390', '한국타이어앤테크놀로지'], ['000150', '두산'],
  ['009830', '한화솔루션'], ['004020', '현대제철'], ['271560', '오리온'],
  ['011170', '롯데케미칼'], ['007070', 'GS리테일'], ['078930', 'GS'],
  ['021240', '코웨이'], ['090430', '아모레퍼시픽'], ['003490', '대한항공'],
  ['005830', 'DB손해보험'], ['018880', '한온시스템'], ['128940', '한미약품'],
  ['097950', 'CJ제일제당'], ['051900', 'LG생활건강'], ['006800', '미래에셋증권'],
  ['000120', 'CJ대한통운'], ['036460', '한국가스공사'], ['010140', '삼성중공업'],
  ['004990', '롯데지주'], ['029780', '삼성카드'], ['035250', '강원랜드'],
  ['139480', '이마트'], ['002790', '아모레G'], ['326030', 'SK바이오팜'],
  ['000810', '삼성화재'], ['241560', '두산밥캣'], ['030000', '제일기획'],
  ['402340', 'SK스퀘어'], ['267250', '현대건설'], ['011780', '금호석유'],
  ['042700', '한미반도체'], ['204320', '만도'], ['251270', '넷마블'],
  ['293490', '카카오게임즈'], ['086520', '에코프로'], ['247540', '에코프로비엠'],
  ['377300', '카카오페이'], ['112040', '위메이드'], ['263750', '펄어비스'],
  // KOSDAQ 주요
  ['091990', '셀트리온헬스케어'], ['196170', '알테오젠'], ['145020', '휴젤'],
  ['041510', 'SM엔터테인먼트'], ['035900', 'JYP엔터테인먼트'], ['122870', 'YG엔터테인먼트'],
  ['058470', '리노공업'], ['357780', '솔브레인'], ['099190', '아이센스'],
  ['039030', '이오테크닉스'], ['336260', '두산퓨얼셀'], ['095340', 'ISC'],
  ['403870', 'HPSP'], ['068760', '셀트리온제약'], ['298380', '에이비엘바이오'],
  ['028300', 'HLB'], ['137310', '에스디바이오센서'], ['067310', '하나마이크론'],
];

const koreanStockMap = new Map<string, { symbol: string; name: string }[]>();

// Initialize map from KRX_STOCKS
for (const [code, name] of KRX_STOCKS) {
  const symbol = `${code}.KS`;
  koreanStockMap.set(name, [{ symbol, name }]);
}
// Add aliases
koreanStockMap.set('삼성', [
  { symbol: '005930.KS', name: '삼성전자' }, { symbol: '006400.KS', name: '삼성SDI' },
  { symbol: '028260.KS', name: '삼성물산' }, { symbol: '207940.KS', name: '삼성바이오로직스' },
]);
koreanStockMap.set('SK', [
  { symbol: '000660.KS', name: 'SK하이닉스' }, { symbol: '034730.KS', name: 'SK' },
  { symbol: '096770.KS', name: 'SK이노베이션' },
]);
koreanStockMap.set('LG', [
  { symbol: '003550.KS', name: 'LG' }, { symbol: '051910.KS', name: 'LG화학' },
  { symbol: '066570.KS', name: 'LG전자' }, { symbol: '373220.KS', name: 'LG에너지솔루션' },
]);
koreanStockMap.set('현대차', [{ symbol: '005380.KS', name: '현대자동차' }]);
koreanStockMap.set('NAVER', [{ symbol: '035420.KS', name: '네이버' }]);
koreanStockMap.set('POSCO', [{ symbol: '005490.KS', name: 'POSCO홀딩스' }]);
koreanStockMap.set('포스코', [{ symbol: '005490.KS', name: 'POSCO홀딩스' }]);
koreanStockMap.set('KB', [{ symbol: '105560.KS', name: 'KB금융' }]);
koreanStockMap.set('배터리', [{ symbol: '006400.KS', name: '삼성SDI' }, { symbol: '051910.KS', name: 'LG화학' }, { symbol: '373220.KS', name: 'LG에너지솔루션' }]);
koreanStockMap.set('반도체', [{ symbol: '005930.KS', name: '삼성전자' }, { symbol: '000660.KS', name: 'SK하이닉스' }, { symbol: '042700.KS', name: '한미반도체' }]);
koreanStockMap.set('엔터', [
  { symbol: '352820.KS', name: '하이브' }, { symbol: '041510.KS', name: 'SM엔터테인먼트' },
  { symbol: '035900.KS', name: 'JYP엔터테인먼트' }, { symbol: '122870.KS', name: 'YG엔터테인먼트' },
]);

/**
 * Add entry to runtime Korean stock map (auto-learning)
 */
function addToKoreanStockMap(name: string, symbol: string): void {
  const existing = koreanStockMap.get(name);
  if (existing) {
    if (!existing.some((s) => s.symbol === symbol)) {
      existing.push({ symbol, name });
    }
  } else {
    koreanStockMap.set(name, [{ symbol, name }]);
  }
  log.debug('Korean stock map updated', { name, symbol, totalKeys: koreanStockMap.size });
}

/**
 * Search local Korean stock map: exact match only
 */
function searchLocalExact(query: string): StockSearchResult[] {
  const results: StockSearchResult[] = [];
  const seen = new Set<string>();
  const q = query.toLowerCase();

  for (const [key, stocks] of koreanStockMap) {
    if (key.toLowerCase() === q) {
      for (const stock of stocks) {
        if (!seen.has(stock.symbol)) {
          seen.add(stock.symbol);
          results.push({ symbol: stock.symbol, name: stock.name, exchange: 'KRX', type: 'Equity' });
        }
      }
    }
  }
  return results;
}

/**
 * Search local Korean stock map: partial match (excluding exact)
 */
function searchLocalPartial(query: string): StockSearchResult[] {
  const results: StockSearchResult[] = [];
  const seen = new Set<string>();
  const q = query.toLowerCase();

  for (const [key, stocks] of koreanStockMap) {
    const kl = key.toLowerCase();
    if (kl !== q && (kl.includes(q) || q.includes(kl))) {
      for (const stock of stocks) {
        if (!seen.has(stock.symbol)) {
          seen.add(stock.symbol);
          results.push({ symbol: stock.symbol, name: stock.name, exchange: 'KRX', type: 'Equity' });
        }
      }
    }
  }
  return results;
}

/**
 * Search stocks: Local exact → MCP DART → Yahoo Finance → Local partial
 * Results from MCP/Yahoo are auto-added to the local map for future searches.
 */
export async function searchStocks(query: string, limit: number = 10): Promise<StockSearchResult[]> {
  const cacheKey = `search:${query.toLowerCase()}`;

  return stockCache.getOrSet<StockSearchResult[]>(
    cacheKey,
    async () => {
      log.debug('Searching stocks', { query });
      const results: StockSearchResult[] = [];
      const seen = new Set<string>();

      const addResults = (items: StockSearchResult[]) => {
        for (const item of items) {
          if (!seen.has(item.symbol)) {
            seen.add(item.symbol);
            results.push(item);
          }
        }
      };

      // Step 1: Local exact match (instant)
      const exactResults = searchLocalExact(query);
      if (exactResults.length > 0) {
        addResults(exactResults);
        log.info('Stock search: local exact match', { query, count: exactResults.length });
        return results.slice(0, limit);
      }

      // Step 2: MCP DART get_corp_code (Korean company name search)
      if (isConnected('jjlabs')) {
        try {
          const mcpResult = await withTimeout(
            () => getDartCorpCode(query),
            API_TIMEOUT,
            `searchMcp:${query}`
          ) as Array<Record<string, string>> | Record<string, string> | null;

          if (mcpResult) {
            const items = Array.isArray(mcpResult) ? mcpResult : [mcpResult];
            for (const item of items) {
              const corpName = item.corp_name ?? item.name ?? '';
              const stockCode = item.stock_code ?? item.code ?? '';
              if (stockCode && stockCode.trim()) {
                const symbol = `${stockCode}.KS`;
                const result: StockSearchResult = {
                  symbol,
                  name: corpName,
                  exchange: 'KRX',
                  type: 'Equity',
                };
                if (!seen.has(symbol)) {
                  seen.add(symbol);
                  results.push(result);
                }
                // Auto-learn: add to local map
                addToKoreanStockMap(corpName, symbol);
              }
            }
          }

          if (results.length > 0) {
            log.info('Stock search: MCP DART succeeded', { query, count: results.length });
            return results.slice(0, limit);
          }
        } catch (error) {
          log.warn('MCP DART search failed, trying Yahoo', { query, error: String(error) });
        }
      }

      // Step 3: Yahoo Finance search API
      // Yahoo doesn't support Korean, so try English query directly
      // If query looks Korean, also try searching on KRX via get_stock_base_info
      const isKoreanQuery = /[가-힣]/.test(query);
      try {
        const yahooResults = await withTimeout(
          () => searchFromYahooFinance(query),
          API_TIMEOUT,
          `searchYahoo:${query}`
        );
        addResults(yahooResults);
        // Auto-learn: add Korean stocks to local map
        for (const r of yahooResults) {
          if (r.symbol.endsWith('.KS') || r.symbol.endsWith('.KQ')) {
            addToKoreanStockMap(r.name, r.symbol);
          }
        }
        if (results.length > 0) {
          log.info('Stock search: Yahoo Finance', { query, count: results.length });
          return results.slice(0, limit);
        }
      } catch (error) {
        log.warn('Yahoo Finance search failed', { query, error: String(error) });
      }

      // Step 3.5: For Korean queries, brute-force KRX search via MCP get_stock_base_info
      if (isKoreanQuery && isConnected('jjlabs') && results.length === 0) {
        try {
          const krxResults = await withTimeout(
            () => searchKrxByName(query),
            API_TIMEOUT * 2,
            `searchKrx:${query}`
          );
          addResults(krxResults);
          for (const r of krxResults) {
            addToKoreanStockMap(r.name, r.symbol);
          }
          if (results.length > 0) {
            log.info('Stock search: KRX name scan', { query, count: results.length });
            return results.slice(0, limit);
          }
        } catch (error) {
          log.warn('KRX name scan failed', { query, error: String(error) });
        }
      }

      // Step 4: Local partial match as last resort
      const partialResults = searchLocalPartial(query);
      if (partialResults.length > 0) {
        addResults(partialResults);
        log.info('Stock search: local partial match', { query, count: partialResults.length });
      }

      return results.slice(0, limit);
    },
    60 * 1000, // 1 min cache
    30 * 1000
  );
}

/**
 * Search stocks from Yahoo Finance search/autocomplete API
 * Uses query2 endpoint which is more reliable
 */
async function searchFromYahooFinance(query: string): Promise<StockSearchResult[]> {
  // Yahoo Finance doesn't support Korean queries - try query2 endpoint
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new ApiError(`Yahoo Finance search error: ${response.status}`);
  }

  interface YahooSearchResponse {
    quotes?: Array<{
      symbol?: string;
      shortname?: string;
      longname?: string;
      exchange?: string;
      exchDisp?: string;
      quoteType?: string;
      typeDisp?: string;
    }>;
  }

  const data = await response.json() as YahooSearchResponse;
  const quotes = data?.quotes ?? [];

  return quotes
    .filter((q) => q.symbol && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'))
    .map((q) => ({
      symbol: q.symbol!,
      name: q.shortname ?? q.longname ?? q.symbol!,
      exchange: q.exchDisp ?? q.exchange ?? 'UNKNOWN',
      type: q.typeDisp ?? q.quoteType ?? 'Equity',
    }));
}

/**
 * Search KRX stocks by name using MCP get_stock_base_info
 * Fetches all stocks for today and filters by name match
 */
async function searchKrxByName(query: string): Promise<StockSearchResult[]> {
  const results: StockSearchResult[] = [];
  const q = query.toLowerCase();

  for (const market of ['KOSPI', 'KOSDAQ'] as const) {
    try {
      const today = getTodayKST();
      const result = await callTool('jjlabs', 'get_stock_base_info', {
        basDdList: [today],
        market,
      }) as Record<string, Array<Record<string, unknown>>>;

      const dayData = result[today];
      if (dayData && Array.isArray(dayData)) {
        for (const stock of dayData) {
          const name = String(stock.ISU_ABBRV ?? stock.ISU_NM ?? '');
          const code = String(stock.ISU_SRT_CD ?? stock.ISU_CD ?? '').replace(/^A/, '');
          if (name.toLowerCase().includes(q) && code) {
            results.push({
              symbol: `${code}.KS`,
              name,
              exchange: market,
              type: 'Equity',
            });
          }
        }
      }
    } catch (error) {
      log.debug(`KRX ${market} name scan failed`, { error: String(error) });
    }
  }

  return results;
}

/**
 * Get today's date in YYYYMMDD format (KST) - for KRX queries
 */
function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10).replace(/-/g, '');
}

// ============================================================================
// Market Indices - Real-time from Yahoo Finance
// ============================================================================

const INDEX_SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: '^KS11', name: 'KOSPI' },
  { symbol: '^KQ11', name: 'KOSDAQ' },
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^IXIC', name: 'NASDAQ' },
  { symbol: '^DJI', name: 'Dow Jones' },
];

/**
 * Fetch a single index from Yahoo Finance
 */
async function fetchIndexFromYahoo(symbol: string, name: string): Promise<MarketIndex> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new ApiError(`Yahoo Finance index error: ${response.status} for ${symbol}`);
  }

  interface YahooChartResponse {
    chart?: {
      result?: Array<{
        meta?: {
          regularMarketPrice?: number;
          previousClose?: number;
          chartPreviousClose?: number;
        };
      }>;
    };
  }

  const data = await response.json() as YahooChartResponse;
  const meta = data?.chart?.result?.[0]?.meta;

  if (!meta || !meta.regularMarketPrice) {
    throw new ApiError(`No data for index ${symbol}`);
  }

  const value = meta.regularMarketPrice;
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? value;
  const change = value - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

  return {
    symbol: symbol.replace('^', ''),
    name,
    value: Number(value.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get real-time market indices
 */
export async function getMarketIndices(): Promise<MarketIndex[]> {
  const cacheKey = 'market:indices';

  return stockCache.getOrSet<MarketIndex[]>(
    cacheKey,
    async () => {
      log.debug('Fetching market indices from Yahoo Finance');

      const results = await Promise.allSettled(
        INDEX_SYMBOLS.map(({ symbol, name }) =>
          withTimeout(
            () => fetchIndexFromYahoo(symbol, name),
            API_TIMEOUT,
            `fetchIndex:${symbol}`
          )
        )
      );

      const indices = results
        .filter((r): r is PromiseFulfilledResult<MarketIndex> => r.status === 'fulfilled')
        .map((r) => r.value);

      if (indices.length === 0) {
        throw new ApiError('Failed to fetch any market indices');
      }

      log.info('Market indices fetched', { count: indices.length });
      return indices;
    },
    CACHE_TTL,
    STALE_TTL
  );
}

// ============================================================================
// Chart Data - Real OHLCV from Yahoo Finance
// ============================================================================

/**
 * Get real chart data for a stock symbol
 */
export async function getStockChart(
  symbol: string,
  period: string = '1mo',
  interval: string = '1d'
): Promise<ChartDataPoint[]> {
  const normalizedSymbol = symbol.toUpperCase();
  const cacheKey = `chart:${normalizedSymbol}:${period}:${interval}`;

  return stockCache.getOrSet<ChartDataPoint[]>(
    cacheKey,
    async () => {
      log.debug('Fetching chart data from Yahoo Finance', { symbol: normalizedSymbol, period, interval });

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalizedSymbol)}?interval=${interval}&range=${period}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new ApiError(`Yahoo Finance chart error: ${response.status}`);
      }

      interface YahooChartResult {
        chart?: {
          result?: Array<{
            timestamp?: number[];
            indicators?: {
              quote?: Array<{
                open?: (number | null)[];
                high?: (number | null)[];
                low?: (number | null)[];
                close?: (number | null)[];
                volume?: (number | null)[];
              }>;
            };
          }>;
        };
      }

      const data = await response.json() as YahooChartResult;
      const result = data?.chart?.result?.[0];

      if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
        throw new ApiError(`No chart data for ${normalizedSymbol}`);
      }

      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];

      const chartData: ChartDataPoint[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const open = quote.open?.[i];
        const high = quote.high?.[i];
        const low = quote.low?.[i];
        const close = quote.close?.[i];
        const volume = quote.volume?.[i];

        // Skip null entries (market closed days)
        if (open == null || high == null || low == null || close == null) continue;

        chartData.push({
          date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume: volume ?? 0,
        });
      }

      log.info('Chart data fetched', { symbol: normalizedSymbol, points: chartData.length });
      return chartData;
    },
    5 * 60 * 1000, // 5 min cache for chart data
    STALE_TTL
  );
}
