/**
 * Services barrel export
 */

export {
  getStockPrice,
  getMultipleStockPrices,
  getStockSector,
  getAvailableMockSymbols,
  getMarketIndices,
  getStockChart,
  searchStocks,
} from './stockService.js';

export {
  getExchangeRate,
  getMultipleExchangeRates,
  getSupportedCurrencies,
} from './exchangeRateService.js';

export {
  getInvestmentNews,
  getTrendingNews,
} from './newsService.js';

export {
  analyzePortfolio,
  getPortfolioSummary,
} from './portfolioService.js';

// MCP Client Manager
export {
  initializeAll as initializeMcpServers,
  shutdown as shutdownMcpServers,
  getStatus as getMcpStatus,
  reconnectAll as reconnectMcpServers,
  callTool as callMcpTool,
  listTools as listMcpTools,
  isConnected as isMcpConnected,
} from './mcpClientManager.js';

// MCP Stock Service (jjlabs)
export {
  getKrxStockInfo,
  getKrxBaseInfo,
  getDartDisclosures,
  getDartFinancials,
  getDartCorpCode,
} from './mcpStockService.js';

// MCP Analyzer Service
export {
  getFinancialData,
  getTechnicalIndicators,
  calculateDCF,
  searchNews,
  getSupplyDemand,
  comparePeers,
  analyzeEquity,
} from './mcpAnalyzerService.js';
