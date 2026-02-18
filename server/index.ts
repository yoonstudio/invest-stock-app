/**
 * Investment REST API Server
 *
 * Express.js server with MCP server integration for:
 * - Stock prices (KRX via MCP + Yahoo Finance)
 * - Portfolio analysis
 * - Investment news (MCP sentiment analysis)
 * - Exchange rates
 * - Technical analysis, DCF, supply/demand, peer comparison (MCP)
 * - DART disclosures and financials (MCP)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import {
  getStockPrice,
  getMultipleStockPrices,
  analyzePortfolio,
  getInvestmentNews,
  getExchangeRate,
  getSupportedCurrencies,
  getAvailableMockSymbols,
  initializeMcpServers,
  shutdownMcpServers,
  getMcpStatus,
  reconnectMcpServers,
  getTechnicalIndicators,
  getFinancialData,
  calculateDCF,
  getSupplyDemand,
  comparePeers,
  analyzeEquity,
  getDartDisclosures,
  getDartFinancials,
  getMarketIndices,
  getStockChart,
  searchStocks,
} from '../src/services/index.js';

import { errorToResponse, successResponse, ValidationError } from '../src/shared/errors/index.js';
import { logger, LogLevel } from '../src/shared/logger/index.js';
import type { Holding } from '../src/shared/types/index.js';

const log = logger.child('RestAPI');

const app = express();
const PORT = process.env.PORT ?? 3000;

// ============================================================================
// Middleware
// ============================================================================

app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN ?? '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many requests, please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    log.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      durationMs,
      ip: req.ip,
    });
  });
  next();
});

// ============================================================================
// Health Check
// ============================================================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    mcp: getMcpStatus(),
  });
});

// ============================================================================
// MCP Status
// ============================================================================

app.get('/api/mcp/status', (_req, res) => {
  res.json(successResponse(getMcpStatus()));
});

app.post('/api/mcp/reconnect', async (_req, res) => {
  try {
    log.info('Manual MCP reconnect requested');
    const results = await reconnectMcpServers();
    res.json(successResponse({ results, status: getMcpStatus() }));
  } catch (error) {
    log.error('MCP reconnect failed', error as Error);
    res.status(500).json(errorToResponse(error as Error));
  }
});

app.post('/api/server/restart', async (_req, res) => {
  try {
    log.info('Backend server restart requested');
    await shutdownMcpServers();
    await initializeMcpServers();
    res.json(successResponse({ restarted: true, status: getMcpStatus() }));
  } catch (error) {
    log.error('Server restart failed', error as Error);
    res.status(500).json(errorToResponse(error as Error));
  }
});

// ============================================================================
// Stock API Routes
// ============================================================================

app.get('/api/stocks/search', async (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q || typeof q !== 'string' || !q.trim()) {
      res.status(400).json(errorToResponse(new ValidationError('Query parameter "q" is required')));
      return;
    }
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : 10;
    const results = await searchStocks(q.trim(), Math.min(limitNum, 20));
    res.json(successResponse(results));
  } catch (error) {
    res.status(500).json(errorToResponse(error));
  }
});

app.get('/api/stocks/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      res.status(400).json(errorToResponse(new ValidationError('Symbol is required')));
      return;
    }
    const stockPrice = await getStockPrice(symbol);
    res.json(successResponse(stockPrice));
  } catch (error) {
    const errorResponse = errorToResponse(error);
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    res.status(statusCode).json(errorResponse);
  }
});

app.post('/api/stocks', async (req, res) => {
  try {
    const { symbols } = req.body as { symbols?: string[] };
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      res.status(400).json(errorToResponse(new ValidationError('Symbols array is required')));
      return;
    }
    if (symbols.length > 50) {
      res.status(400).json(errorToResponse(new ValidationError('Maximum 50 symbols allowed')));
      return;
    }
    const stockPrices = await getMultipleStockPrices(symbols);
    res.json(successResponse({
      stocks: stockPrices,
      requested: symbols.length,
      fetched: stockPrices.length,
    }));
  } catch (error) {
    res.status(500).json(errorToResponse(error));
  }
});

app.get('/api/stocks', (_req, res) => {
  res.json(successResponse({
    availableSymbols: getAvailableMockSymbols(),
    message: 'Use GET /api/stocks/:symbol to fetch a specific stock price',
  }));
});

// ============================================================================
// Market Indices & Chart Data (Real-time Yahoo Finance)
// ============================================================================

app.get('/api/market/indices', async (_req, res) => {
  try {
    const indices = await getMarketIndices();
    res.json(successResponse(indices));
  } catch (error) {
    res.status(500).json(errorToResponse(error));
  }
});

const VALID_PERIODS = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'];
const VALID_INTERVALS = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'];

app.get('/api/stocks/:symbol/chart', async (req, res) => {
  try {
    const { symbol } = req.params;
    const period = (req.query.period as string) || '1mo';
    const interval = (req.query.interval as string) || '1d';
    if (!VALID_PERIODS.includes(period)) {
      res.status(400).json(errorToResponse(new ValidationError(`Invalid period: ${period}. Valid: ${VALID_PERIODS.join(', ')}`)));
      return;
    }
    if (!VALID_INTERVALS.includes(interval)) {
      res.status(400).json(errorToResponse(new ValidationError(`Invalid interval: ${interval}. Valid: ${VALID_INTERVALS.join(', ')}`)));
      return;
    }
    const data = await getStockChart(symbol, period, interval);
    res.json(successResponse(data));
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    res.status(statusCode).json(errorToResponse(error));
  }
});

// ============================================================================
// MCP Analysis Routes
// ============================================================================

app.get('/api/stocks/:symbol/technical', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await getTechnicalIndicators(symbol);
    res.json(successResponse(data));
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    res.status(statusCode).json(errorToResponse(error));
  }
});

app.get('/api/stocks/:symbol/financial', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await getFinancialData(symbol);
    res.json(successResponse(data));
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    res.status(statusCode).json(errorToResponse(error));
  }
});

app.get('/api/stocks/:symbol/dcf', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await calculateDCF(symbol);
    res.json(successResponse(data));
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    res.status(statusCode).json(errorToResponse(error));
  }
});

app.get('/api/stocks/:symbol/supply', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await getSupplyDemand(symbol);
    res.json(successResponse(data));
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    res.status(statusCode).json(errorToResponse(error));
  }
});

app.get('/api/stocks/:symbol/peers', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await comparePeers(symbol);
    res.json(successResponse(data));
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    res.status(statusCode).json(errorToResponse(error));
  }
});

app.get('/api/stocks/:symbol/analysis', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await analyzeEquity(symbol);
    res.json(successResponse(data));
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    res.status(statusCode).json(errorToResponse(error));
  }
});

// ============================================================================
// DART API Routes
// ============================================================================

app.get('/api/dart/disclosures', async (req, res) => {
  try {
    const { corpCode, beginDate, endDate, disclosureType } = req.query;
    if (!corpCode || typeof corpCode !== 'string') {
      res.status(400).json(errorToResponse(new ValidationError('corpCode parameter is required')));
      return;
    }
    const data = await getDartDisclosures(corpCode, {
      beginDate: beginDate as string | undefined,
      endDate: endDate as string | undefined,
      disclosureType: disclosureType as string | undefined,
    });
    res.json(successResponse(data));
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    res.status(statusCode).json(errorToResponse(error));
  }
});

app.get('/api/dart/financials/:corpCode', async (req, res) => {
  try {
    const { corpCode } = req.params;
    const data = await getDartFinancials(corpCode);
    res.json(successResponse(data));
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    res.status(statusCode).json(errorToResponse(error));
  }
});

// ============================================================================
// Portfolio API Routes
// ============================================================================

app.post('/api/portfolio/analyze', async (req, res) => {
  try {
    const { holdings } = req.body as { holdings?: Holding[] };
    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      res.status(400).json(errorToResponse(new ValidationError('Holdings array is required')));
      return;
    }
    for (const holding of holdings) {
      if (!holding.symbol || typeof holding.symbol !== 'string') {
        res.status(400).json(errorToResponse(new ValidationError('Each holding must have a valid symbol')));
        return;
      }
      if (typeof holding.quantity !== 'number' || holding.quantity <= 0) {
        res.status(400).json(errorToResponse(new ValidationError(`Invalid quantity for ${holding.symbol}`)));
        return;
      }
      if (typeof holding.avgPrice !== 'number' || holding.avgPrice <= 0) {
        res.status(400).json(errorToResponse(new ValidationError(`Invalid average price for ${holding.symbol}`)));
        return;
      }
    }
    const analysis = await analyzePortfolio(holdings);
    res.json(successResponse(analysis));
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    res.status(statusCode).json(errorToResponse(error));
  }
});

// ============================================================================
// News API Routes
// ============================================================================

app.get('/api/news', async (req, res) => {
  try {
    const { query, limit } = req.query;
    if (!query || typeof query !== 'string') {
      res.status(400).json(errorToResponse(new ValidationError('Query parameter is required')));
      return;
    }
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : 5;
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 20) {
      res.status(400).json(errorToResponse(new ValidationError('Limit must be between 1 and 20')));
      return;
    }
    const news = await getInvestmentNews(query, limitNum);
    res.json(successResponse(news));
  } catch (error) {
    res.status(500).json(errorToResponse(error));
  }
});

// ============================================================================
// Exchange Rate API Routes
// ============================================================================

app.get('/api/exchange', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
      res.status(400).json(errorToResponse(new ValidationError('Both "from" and "to" currency parameters are required')));
      return;
    }
    const rate = await getExchangeRate(from, to);
    res.json(successResponse(rate));
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    res.status(statusCode).json(errorToResponse(error));
  }
});

app.get('/api/exchange/currencies', (_req, res) => {
  res.json(successResponse({
    currencies: getSupportedCurrencies(),
  }));
});

// ============================================================================
// API Info
// ============================================================================

app.get('/api', (_req, res) => {
  res.json({
    name: 'Investment REST API',
    version: '2.0.0',
    description: 'RESTful API with MCP integration for Korean stock analysis',
    endpoints: {
      market: {
        'GET /api/market/indices': 'Real-time market indices (KOSPI, S&P 500, etc.)',
      },
      stocks: {
        'GET /api/stocks/search?q=...': 'Search stocks (MCP → Yahoo fallback)',
        'GET /api/stocks': 'Get available symbols',
        'GET /api/stocks/:symbol': 'Get stock price',
        'GET /api/stocks/:symbol/chart': 'Real-time OHLCV chart data',
        'POST /api/stocks': 'Get multiple stock prices',
        'GET /api/stocks/:symbol/technical': 'Technical analysis (RSI, MACD, etc.)',
        'GET /api/stocks/:symbol/financial': 'Financial data (PER, PBR, ROE, etc.)',
        'GET /api/stocks/:symbol/dcf': 'DCF intrinsic value',
        'GET /api/stocks/:symbol/supply': 'Supply/demand analysis',
        'GET /api/stocks/:symbol/peers': 'Peer comparison',
        'GET /api/stocks/:symbol/analysis': 'Guru equity analysis',
      },
      dart: {
        'GET /api/dart/disclosures?corpCode=...': 'DART disclosure search',
        'GET /api/dart/financials/:corpCode': 'DART financial statements',
      },
      portfolio: {
        'POST /api/portfolio/analyze': 'Analyze portfolio',
      },
      news: {
        'GET /api/news?query=...&limit=5': 'Get investment news with sentiment',
      },
      exchange: {
        'GET /api/exchange?from=USD&to=KRW': 'Get exchange rate',
        'GET /api/exchange/currencies': 'Get supported currencies',
      },
      mcp: {
        'GET /api/mcp/status': 'MCP server connection status',
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Error Handling
// ============================================================================

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
    timestamp: new Date().toISOString(),
  });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log.error('Unhandled error', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Server Startup with MCP Initialization
// ============================================================================

async function main() {
  // Initialize MCP server connections
  log.info('Initializing MCP server connections...');
  try {
    await initializeMcpServers();
    const mcpStatus = getMcpStatus();
    log.info('MCP initialization complete', mcpStatus);
  } catch (error) {
    log.warn('MCP initialization had errors (server will still start)', { error: String(error) });
  }

  app.listen(PORT, () => {
    const mcpStatus = getMcpStatus();
    log.info(`Investment REST API Server started`, {
      port: PORT,
      env: process.env.NODE_ENV ?? 'development',
      mcp: mcpStatus,
    });

    console.log(`
========================================
  Investment REST API Server v2.0
========================================

  Server:     http://localhost:${PORT}
  API Info:   http://localhost:${PORT}/api
  Health:     http://localhost:${PORT}/health

  MCP Servers:
    jjlabs:   ${mcpStatus.jjlabs.connected ? 'Connected' : 'Disconnected'}
    analyzer: ${mcpStatus.analyzer.connected ? 'Connected' : 'Disconnected'}

  Stock Endpoints:
    GET  /api/stocks/:symbol           - Stock price
    GET  /api/stocks/:symbol/technical - Technical analysis
    GET  /api/stocks/:symbol/financial - Financial data
    GET  /api/stocks/:symbol/dcf       - DCF valuation
    GET  /api/stocks/:symbol/supply    - Supply/demand
    GET  /api/stocks/:symbol/peers     - Peer comparison
    GET  /api/stocks/:symbol/analysis  - Guru analysis

  DART Endpoints:
    GET  /api/dart/disclosures         - Disclosure search
    GET  /api/dart/financials/:code    - Financial statements

  Other Endpoints:
    POST /api/portfolio/analyze        - Portfolio analysis
    GET  /api/news?query=...           - Investment news
    GET  /api/exchange?from=USD&to=KRW - Exchange rate
    GET  /api/mcp/status               - MCP status

========================================
    `);
  });
}

// Graceful shutdown
function handleShutdown(signal: string) {
  log.info(`Received ${signal}, shutting down...`);
  shutdownMcpServers()
    .then(() => {
      log.info('Graceful shutdown complete');
      process.exit(0);
    })
    .catch((error) => {
      log.error('Error during shutdown', error as Error);
      process.exit(1);
    });
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

main().catch((error) => {
  log.error('Failed to start server', error);
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
