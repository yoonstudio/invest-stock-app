#!/usr/bin/env node

/**
 * Investment MCP Server
 *
 * Provides AI assistants with real-time investment data tools:
 * - Stock price lookup
 * - Portfolio analysis
 * - Investment news
 * - Exchange rates
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { logger, LogLevel } from './shared/logger/index.js';
import { errorToResponse, formatErrorForAI } from './shared/errors/index.js';
import {
  getStockPrice,
  analyzePortfolio,
  getInvestmentNews,
  getExchangeRate,
  getSupportedCurrencies,
  getAvailableMockSymbols,
} from './services/index.js';

const log = logger.child('MCP');

// Investment MCP Server
const server = new McpServer({
  name: "investment-mcp",
  version: "1.0.0",
});

/**
 * Tool: get_stock_price
 * Fetches current stock price and related data with AI-optimized response
 */
server.tool(
  "get_stock_price",
  `주식 종목의 실시간 가격과 상세 정보를 조회합니다.

**지원 시장:**
- 미국 주식: AAPL, MSFT, GOOGL, NVDA, TSLA 등 (나스닥, NYSE)
- 한국 주식: 005930.KS(삼성전자), 000660.KS(SK하이닉스), 035420.KS(네이버) 등

**반환 정보:**
- 현재가, 전일대비 변동률
- 거래량, 시가총액
- 당일/52주 고가/저가
- AI 분석 힌트 (추세, 변동성 등)

**사용 예시:**
- "애플 주가 알려줘" → get_stock_price("AAPL")
- "삼성전자 현재가" → get_stock_price("005930.KS")

**주의사항:**
- 한국 주식은 종목코드 뒤에 .KS 접미사 필요
- 실시간 데이터는 1분 캐싱됨
- 거래시간 외에는 전일 종가 기준`,
  {
    symbol: z.string().describe("주식 종목 코드. 미국주식: AAPL, MSFT, GOOGL 등. 한국주식: 005930.KS(삼성전자), 000660.KS(SK하이닉스) 형식으로 .KS 접미사 필수."),
  },
  async ({ symbol }) => {
    const startTime = Date.now();
    log.info('Tool called: get_stock_price', { symbol });

    try {
      const stockPrice = await getStockPrice(symbol);
      const durationMs = Date.now() - startTime;

      log.logToolCall('get_stock_price', { symbol }, true, durationMs);

      // Format response for AI
      const formattedResponse = formatStockPriceResponse(stockPrice);

      return {
        content: [
          {
            type: "text" as const,
            text: formattedResponse,
          },
        ],
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      log.logToolCall('get_stock_price', { symbol }, false, durationMs, error as Error);

      return {
        content: [
          {
            type: "text" as const,
            text: formatErrorForAI(error),
          },
        ],
        isError: true,
      };
    }
  }
);

/**
 * Tool: analyze_portfolio
 * Analyzes a portfolio of holdings with comprehensive metrics
 */
server.tool(
  "analyze_portfolio",
  `투자 포트폴리오를 종합 분석하여 상세 리포트를 제공합니다.

**분석 항목:**
- 총 평가금액 및 수익률
- 개별 종목별 손익 분석
- 섹터별 배분 현황
- 리스크 지표 (분산투자 점수, 집중도)
- 성과 우수/부진 종목 식별
- AI 투자 인사이트 및 제안

**입력 형식:**
각 보유 종목에 대해 symbol(종목코드), quantity(수량), avgPrice(평균매수가) 제공

**사용 예시:**
- 단일 종목: [{"symbol": "AAPL", "quantity": 10, "avgPrice": 150}]
- 복수 종목: [{"symbol": "AAPL", "quantity": 10, "avgPrice": 150}, {"symbol": "MSFT", "quantity": 5, "avgPrice": 300}]
- 한국 주식: [{"symbol": "005930.KS", "quantity": 100, "avgPrice": 70000}]

**활용 시나리오:**
- "내 포트폴리오 분석해줘"
- "투자 리스크 점검해줘"
- "섹터 배분 현황 알려줘"

**주의사항:**
- 최소 1개, 최대 50개 종목 분석 가능
- 종목당 가격 조회로 인해 다소 시간 소요 가능
- 캐시된 가격 정보 사용 (30초)`,
  {
    holdings: z
      .array(
        z.object({
          symbol: z.string().describe("종목 코드. 미국주식: AAPL, MSFT. 한국주식: 005930.KS (반드시 .KS 접미사)"),
          quantity: z.number().positive().describe("보유 수량 (양수)"),
          avgPrice: z.number().positive().describe("평균 매수 단가 (해당 통화 기준)"),
        })
      )
      .min(1)
      .max(50)
      .describe("분석할 보유 종목 배열. 1~50개 범위."),
  },
  async ({ holdings }) => {
    const startTime = Date.now();
    log.info('Tool called: analyze_portfolio', { holdingsCount: holdings.length });

    try {
      const analysis = await analyzePortfolio(holdings);
      const durationMs = Date.now() - startTime;

      log.logToolCall('analyze_portfolio', { holdingsCount: holdings.length }, true, durationMs);

      // Format response for AI
      const formattedResponse = formatPortfolioResponse(analysis);

      return {
        content: [
          {
            type: "text" as const,
            text: formattedResponse,
          },
        ],
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      log.logToolCall('analyze_portfolio', { holdingsCount: holdings.length }, false, durationMs, error as Error);

      return {
        content: [
          {
            type: "text" as const,
            text: formatErrorForAI(error),
          },
        ],
        isError: true,
      };
    }
  }
);

/**
 * Tool: get_investment_news
 * Fetches investment-related news with sentiment analysis
 */
server.tool(
  "get_investment_news",
  `투자 관련 뉴스를 검색하고 감성 분석 결과를 제공합니다.

**제공 정보:**
- 검색어 관련 최신 뉴스 목록
- 각 뉴스별 감성 분석 (긍정/중립/부정)
- 전체 뉴스의 종합 감성 점수
- 뉴스 발행 시간 및 최신성 표시
- AI 시장 심리 분석 힌트

**검색 키워드 예시:**
- 종목명: "samsung", "apple", "nvidia"
- 종목코드: "AAPL", "005930"
- 시장 키워드: "stock market", "fed", "interest rate"
- 산업 키워드: "semiconductor", "AI chip", "electric vehicle"
- 한글 키워드: "삼성전자", "테슬라"

**활용 시나리오:**
- "애플 관련 뉴스 알려줘" → get_investment_news("apple")
- "반도체 시장 뉴스" → get_investment_news("semiconductor")
- "미국 금리 관련 뉴스" → get_investment_news("fed interest rate")

**감성 분석 설명:**
- POSITIVE: 주가 상승, 실적 호전, 신제품 출시 등 긍정적 내용
- NEUTRAL: 단순 정보 전달, 중립적 시장 분석
- NEGATIVE: 실적 부진, 리스크 요인, 규제 이슈 등 부정적 내용

**주의사항:**
- 뉴스 데이터 5분 캐싱
- 영문 검색어가 더 많은 결과 반환`,
  {
    query: z.string().min(1).describe("검색 키워드. 종목명(apple, samsung), 산업(semiconductor), 시장(stock market) 등. 영문 권장."),
    limit: z.number().min(1).max(20).optional().default(5).describe("조회할 뉴스 개수. 기본값 5, 최대 20. 더 많은 뉴스가 필요하면 증가."),
  },
  async ({ query, limit }) => {
    const startTime = Date.now();
    log.info('Tool called: get_investment_news', { query, limit });

    try {
      const news = await getInvestmentNews(query, limit);
      const durationMs = Date.now() - startTime;

      log.logToolCall('get_investment_news', { query, limit }, true, durationMs);

      // Format response for AI
      const formattedResponse = formatNewsResponse(news);

      return {
        content: [
          {
            type: "text" as const,
            text: formattedResponse,
          },
        ],
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      log.logToolCall('get_investment_news', { query, limit }, false, durationMs, error as Error);

      return {
        content: [
          {
            type: "text" as const,
            text: formatErrorForAI(error),
          },
        ],
        isError: true,
      };
    }
  }
);

/**
 * Tool: get_exchange_rate
 * Fetches current exchange rate with conversion calculator
 */
server.tool(
  "get_exchange_rate",
  `두 통화 간의 현재 환율을 조회하고 환전 계산을 제공합니다.

**지원 통화 (10개):**
- USD: 미국 달러 ($)
- KRW: 한국 원 (₩)
- EUR: 유로 (€)
- JPY: 일본 엔 (¥)
- CNY: 중국 위안 (¥)
- GBP: 영국 파운드 (£)
- CHF: 스위스 프랑
- CAD: 캐나다 달러 (C$)
- AUD: 호주 달러 (A$)
- HKD: 홍콩 달러 (HK$)

**제공 정보:**
- 현재 환율 및 역환율
- 전일 대비 변동률
- 환전 금액 계산표 (양방향)
- AI 투자 시사점 (원화 강세/약세 분석)

**사용 예시:**
- "달러 환율 알려줘" → get_exchange_rate("USD", "KRW")
- "엔화 환율" → get_exchange_rate("JPY", "KRW")
- "유로 대 달러" → get_exchange_rate("EUR", "USD")

**활용 시나리오:**
- "100달러 환전하면 얼마야?" → get_exchange_rate("USD", "KRW")
- "해외주식 투자할 때 환율은?" → get_exchange_rate("USD", "KRW")
- "여행 경비 계산" → 해당 국가 통화 환율 조회

**주의사항:**
- 환율 데이터 1분 캐싱
- 실시간 은행 환율과 다를 수 있음
- 통화 코드는 반드시 3자리 대문자 (예: USD, KRW)`,
  {
    from: z.string().length(3).describe("기준 통화의 3자리 코드. 예: USD(달러), KRW(원), EUR(유로), JPY(엔)"),
    to: z.string().length(3).describe("환산 대상 통화의 3자리 코드. 예: KRW(원), USD(달러), EUR(유로), JPY(엔)"),
  },
  async ({ from, to }) => {
    const startTime = Date.now();
    log.info('Tool called: get_exchange_rate', { from, to });

    try {
      const rate = await getExchangeRate(from, to);
      const durationMs = Date.now() - startTime;

      log.logToolCall('get_exchange_rate', { from, to }, true, durationMs);

      // Format response for AI
      const formattedResponse = formatExchangeRateResponse(rate);

      return {
        content: [
          {
            type: "text" as const,
            text: formattedResponse,
          },
        ],
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      log.logToolCall('get_exchange_rate', { from, to }, false, durationMs, error as Error);

      return {
        content: [
          {
            type: "text" as const,
            text: formatErrorForAI(error),
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================================
// Response Formatters - AI-Optimized Structured Output
// ============================================================================

import type { StockPrice, PortfolioAnalysis, NewsResponse, ExchangeRate } from './shared/types/index.js';

/**
 * AI-optimized response format for stock prices
 * Provides structured data with clear sections for AI comprehension
 */
function formatStockPriceResponse(stock: StockPrice): string {
  const changeSign = stock.change >= 0 ? '+' : '';
  const trend = stock.change > 0 ? 'UP' : stock.change < 0 ? 'DOWN' : 'UNCHANGED';
  const trendKorean = stock.change > 0 ? '상승' : stock.change < 0 ? '하락' : '보합';

  const currencySymbol = stock.currency === 'KRW' ? '₩' : '$';
  const priceFormat = stock.currency === 'KRW'
    ? stock.currentPrice.toLocaleString('ko-KR')
    : stock.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Structured response for AI parsing
  let response = `# Stock Price Report: ${stock.symbol}\n\n`;

  // Quick summary for AI context
  response += `> **Summary**: ${stock.name}의 현재가는 ${currencySymbol}${priceFormat}이며, 전일 대비 ${changeSign}${stock.changePercent.toFixed(2)}% ${trendKorean}했습니다.\n\n`;

  // Core metrics section
  response += `## Core Metrics\n`;
  response += `| Metric | Value | Note |\n`;
  response += `|--------|-------|------|\n`;
  response += `| Symbol | ${stock.symbol} | ${stock.exchange} 거래소 |\n`;
  response += `| Name | ${stock.name} | - |\n`;
  response += `| Current Price | ${currencySymbol}${priceFormat} | ${stock.currency} |\n`;
  response += `| Previous Close | ${currencySymbol}${stock.previousClose.toLocaleString()} | 전일 종가 |\n`;
  response += `| Change | ${changeSign}${stock.change.toLocaleString()} | ${trend} |\n`;
  response += `| Change % | ${changeSign}${stock.changePercent.toFixed(2)}% | ${trendKorean} |\n`;
  response += `| Volume | ${stock.volume.toLocaleString()} | 거래량(주) |\n`;

  // Additional metrics
  if (stock.marketCap || stock.dayHigh || stock.high52Week) {
    response += `\n## Additional Metrics\n`;

    if (stock.marketCap) {
      const marketCapDisplay = stock.currency === 'KRW'
        ? `${(stock.marketCap / 1e12).toFixed(2)}조원`
        : `$${(stock.marketCap / 1e9).toFixed(2)}B`;
      response += `- **Market Cap**: ${marketCapDisplay}\n`;
    }

    if (stock.dayHigh && stock.dayLow) {
      const dayRange = ((stock.currentPrice - stock.dayLow) / (stock.dayHigh - stock.dayLow) * 100).toFixed(0);
      response += `- **Day Range**: ${currencySymbol}${stock.dayLow.toLocaleString()} - ${currencySymbol}${stock.dayHigh.toLocaleString()} (현재가 위치: ${dayRange}%)\n`;
    }

    if (stock.high52Week && stock.low52Week) {
      const yearRange = ((stock.currentPrice - stock.low52Week) / (stock.high52Week - stock.low52Week) * 100).toFixed(0);
      const distanceFromHigh = ((stock.high52Week - stock.currentPrice) / stock.high52Week * 100).toFixed(1);
      response += `- **52 Week Range**: ${currencySymbol}${stock.low52Week.toLocaleString()} - ${currencySymbol}${stock.high52Week.toLocaleString()} (현재가 위치: ${yearRange}%)\n`;
      response += `- **52주 신고가 대비**: -${distanceFromHigh}%\n`;
    }
  }

  // AI Analysis hints
  response += `\n## AI Analysis Hints\n`;
  response += `- **Trend**: ${trend} (${trendKorean})\n`;
  response += `- **Volatility Signal**: ${Math.abs(stock.changePercent) > 3 ? 'HIGH' : Math.abs(stock.changePercent) > 1 ? 'MODERATE' : 'LOW'}\n`;

  if (stock.high52Week && stock.low52Week) {
    const positionPercent = ((stock.currentPrice - stock.low52Week) / (stock.high52Week - stock.low52Week) * 100);
    response += `- **52W Position**: ${positionPercent > 80 ? 'NEAR_HIGH' : positionPercent < 20 ? 'NEAR_LOW' : 'MIDDLE_RANGE'}\n`;
  }

  response += `\n---\n`;
  response += `Exchange: ${stock.exchange} | Currency: ${stock.currency} | Timestamp: ${new Date(stock.timestamp).toLocaleString('ko-KR')}`;

  return response;
}

/**
 * AI-optimized response format for portfolio analysis
 * Provides comprehensive insights with risk assessment and recommendations
 */
function formatPortfolioResponse(analysis: PortfolioAnalysis): string {
  const currencySymbol = analysis.currency === 'KRW' ? '₩' : '$';
  const returnSign = analysis.totalReturn >= 0 ? '+' : '';
  const returnStatus = analysis.totalReturn >= 0 ? 'PROFIT' : 'LOSS';
  const returnStatusKorean = analysis.totalReturn >= 0 ? '수익' : '손실';

  // Performance classification
  const performanceGrade = analysis.totalReturnPercent > 20 ? 'EXCELLENT' :
                           analysis.totalReturnPercent > 10 ? 'GOOD' :
                           analysis.totalReturnPercent > 0 ? 'MODERATE' :
                           analysis.totalReturnPercent > -10 ? 'BELOW_AVERAGE' : 'POOR';

  let response = `# Portfolio Analysis Report\n\n`;

  // Executive Summary for AI
  response += `> **Executive Summary**: 총 ${analysis.holdings.length}개 종목, 평가금액 ${currencySymbol}${analysis.totalValue.toLocaleString()}, `;
  response += `총수익률 ${returnSign}${analysis.totalReturnPercent.toFixed(2)}% (${returnStatusKorean}). `;
  response += `분산투자 점수 ${analysis.riskMetrics.diversificationScore}/10, 주요 섹터: ${analysis.riskMetrics.sectorConcentration}.\n\n`;

  // Core Metrics
  response += `## Portfolio Summary\n`;
  response += `| Metric | Value | Status |\n`;
  response += `|--------|-------|--------|\n`;
  response += `| Total Value | ${currencySymbol}${analysis.totalValue.toLocaleString()} | 현재 평가금액 |\n`;
  response += `| Total Cost | ${currencySymbol}${analysis.totalCost.toLocaleString()} | 총 투자금액 |\n`;
  response += `| Total Return | ${returnSign}${currencySymbol}${Math.abs(analysis.totalReturn).toLocaleString()} | ${returnStatus} |\n`;
  response += `| Return % | ${returnSign}${analysis.totalReturnPercent.toFixed(2)}% | ${performanceGrade} |\n`;
  response += `| Holdings Count | ${analysis.holdings.length} | - |\n`;
  response += `| Currency | ${analysis.currency} | - |\n`;

  // Holdings Detail
  response += `\n## Holdings Detail (${analysis.holdings.length} positions)\n`;
  response += `| Symbol | Name | Qty | Avg Price | Current | Return % | Weight | Status |\n`;
  response += `|--------|------|-----|-----------|---------|----------|--------|--------|\n`;

  for (const holding of analysis.holdings) {
    const holdingSign = holding.returnPercent >= 0 ? '+' : '';
    const holdingStatus = holding.returnPercent > 10 ? 'WINNING' :
                          holding.returnPercent > 0 ? 'PROFIT' :
                          holding.returnPercent > -10 ? 'LOSS' : 'LOSING';
    response += `| ${holding.symbol} | ${holding.name.substring(0, 15)} | ${holding.quantity} | ${holding.avgPrice.toLocaleString()} | ${holding.currentPrice.toLocaleString()} | ${holdingSign}${holding.returnPercent.toFixed(1)}% | ${holding.weight.toFixed(1)}% | ${holdingStatus} |\n`;
  }

  // Winners and Losers
  const winners = analysis.holdings.filter(h => h.returnPercent > 0).sort((a, b) => b.returnPercent - a.returnPercent);
  const losers = analysis.holdings.filter(h => h.returnPercent < 0).sort((a, b) => a.returnPercent - b.returnPercent);

  response += `\n## Performance Breakdown\n`;
  response += `### Top Performers\n`;
  if (winners.length > 0) {
    winners.slice(0, 3).forEach((h, i) => {
      response += `${i + 1}. **${h.symbol}**: +${h.returnPercent.toFixed(2)}% (비중 ${h.weight.toFixed(1)}%)\n`;
    });
  } else {
    response += `- 수익 종목 없음\n`;
  }

  response += `\n### Underperformers\n`;
  if (losers.length > 0) {
    losers.slice(0, 3).forEach((h, i) => {
      response += `${i + 1}. **${h.symbol}**: ${h.returnPercent.toFixed(2)}% (비중 ${h.weight.toFixed(1)}%)\n`;
    });
  } else {
    response += `- 손실 종목 없음\n`;
  }

  // Sector Allocation
  response += `\n## Sector Allocation\n`;
  response += `| Sector | Weight | Status |\n`;
  response += `|--------|--------|--------|\n`;
  const sortedSectors = Object.entries(analysis.allocation).sort((a, b) => b[1] - a[1]);
  for (const [sector, weight] of sortedSectors) {
    const concentration = weight > 40 ? 'HIGH_CONCENTRATION' : weight > 25 ? 'MODERATE' : 'BALANCED';
    response += `| ${sector} | ${weight.toFixed(1)}% | ${concentration} |\n`;
  }

  // Risk Assessment
  response += `\n## Risk Assessment\n`;
  response += `| Risk Metric | Value | Assessment |\n`;
  response += `|-------------|-------|------------|\n`;

  const divScore = analysis.riskMetrics.diversificationScore;
  const divAssessment = divScore >= 7 ? 'WELL_DIVERSIFIED' : divScore >= 5 ? 'MODERATE' : 'CONCENTRATED';
  response += `| Diversification Score | ${divScore}/10 | ${divAssessment} |\n`;

  const topWeight = analysis.riskMetrics.topHoldingWeight;
  const concentrationRisk = topWeight > 30 ? 'HIGH' : topWeight > 20 ? 'MODERATE' : 'LOW';
  response += `| Top Holding Weight | ${topWeight.toFixed(1)}% | ${concentrationRisk} RISK |\n`;

  response += `| Main Sector | ${analysis.riskMetrics.sectorConcentration} | 주요 집중 섹터 |\n`;

  // AI Recommendations
  response += `\n## AI Analysis Hints\n`;
  response += `- **Performance Grade**: ${performanceGrade}\n`;
  response += `- **Diversification**: ${divAssessment}\n`;
  response += `- **Concentration Risk**: ${concentrationRisk}\n`;

  if (divScore < 5) {
    response += `- **Suggestion**: 분산투자 확대 권장 (현재 ${analysis.holdings.length}개 종목)\n`;
  }
  if (topWeight > 30) {
    response += `- **Suggestion**: 최대 비중 종목(${analysis.holdings[0]?.symbol}) 비중 조절 검토\n`;
  }
  if (sortedSectors[0] && sortedSectors[0][1] > 50) {
    response += `- **Suggestion**: ${sortedSectors[0][0]} 섹터 비중 과다 (${sortedSectors[0][1].toFixed(1)}%)\n`;
  }

  response += `\n---\n`;
  response += `Analysis Time: ${new Date(analysis.analyzedAt).toLocaleString('ko-KR')} | Currency: ${analysis.currency}`;

  return response;
}

/**
 * AI-optimized response format for news
 * Includes sentiment analysis summary and relevance scoring
 */
function formatNewsResponse(news: NewsResponse): string {
  let response = `# Investment News Report: "${news.query}"\n\n`;

  if (news.articles.length === 0) {
    response += `> **Notice**: "${news.query}"에 대한 관련 뉴스를 찾지 못했습니다.\n\n`;
    response += `## Suggestions\n`;
    response += `- 다른 검색어를 사용해 보세요 (예: 회사명, 종목코드, 산업분야)\n`;
    response += `- 영문 검색어를 시도해 보세요\n`;
    return response;
  }

  // Sentiment Summary for AI
  const positiveCount = news.articles.filter(a => a.sentiment === 'positive').length;
  const negativeCount = news.articles.filter(a => a.sentiment === 'negative').length;
  const neutralCount = news.articles.filter(a => a.sentiment === 'neutral').length;

  const overallSentiment = positiveCount > negativeCount ? 'POSITIVE' :
                           negativeCount > positiveCount ? 'NEGATIVE' : 'NEUTRAL';
  const sentimentScore = news.articles.length > 0
    ? ((positiveCount - negativeCount) / news.articles.length * 100).toFixed(0)
    : '0';

  response += `> **Summary**: "${news.query}" 관련 ${news.articles.length}건의 뉴스. `;
  response += `전체 감성: ${overallSentiment} (긍정 ${positiveCount}, 중립 ${neutralCount}, 부정 ${negativeCount}). `;
  response += `감성 점수: ${sentimentScore}%\n\n`;

  // Sentiment Overview
  response += `## Sentiment Analysis\n`;
  response += `| Metric | Value | Assessment |\n`;
  response += `|--------|-------|------------|\n`;
  response += `| Total Articles | ${news.articles.length} / ${news.totalCount} | 조회됨 / 전체 |\n`;
  response += `| Positive | ${positiveCount} | 긍정적 뉴스 |\n`;
  response += `| Neutral | ${neutralCount} | 중립적 뉴스 |\n`;
  response += `| Negative | ${negativeCount} | 부정적 뉴스 |\n`;
  response += `| Overall Sentiment | ${overallSentiment} | 종합 감성 |\n`;
  response += `| Sentiment Score | ${sentimentScore}% | -100(매우부정) ~ +100(매우긍정) |\n`;

  // Articles List
  response += `\n## News Articles\n\n`;

  for (let i = 0; i < news.articles.length; i++) {
    const article = news.articles[i];
    if (!article) continue;

    const sentimentTag = article.sentiment === 'positive' ? '[POSITIVE]' :
                         article.sentiment === 'negative' ? '[NEGATIVE]' : '[NEUTRAL]';
    const sentimentKorean = article.sentiment === 'positive' ? '긍정' :
                            article.sentiment === 'negative' ? '부정' : '중립';

    const publishedDate = new Date(article.publishedAt).toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Calculate recency
    const hoursAgo = Math.round((Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60));
    const recencyTag = hoursAgo < 1 ? 'BREAKING' : hoursAgo < 6 ? 'RECENT' : hoursAgo < 24 ? 'TODAY' : 'OLDER';

    response += `### ${i + 1}. ${article.title}\n`;
    response += `**Source**: ${article.source} | **Time**: ${publishedDate} (${hoursAgo}h ago) | **Sentiment**: ${sentimentTag} ${sentimentKorean}\n\n`;
    response += `${article.summary}\n\n`;
    response += `- Recency: ${recencyTag}\n`;
    response += `- URL: [${article.source} - 원문보기](${article.url})\n\n`;
  }

  // AI Analysis Hints
  response += `## AI Analysis Hints\n`;
  response += `- **Query**: "${news.query}"\n`;
  response += `- **Overall Market Sentiment**: ${overallSentiment}\n`;
  response += `- **News Recency**: ${news.articles.some(a => (Date.now() - new Date(a.publishedAt).getTime()) < 6 * 60 * 60 * 1000) ? 'FRESH' : 'DATED'}\n`;

  if (overallSentiment === 'POSITIVE') {
    response += `- **Implication**: 긍정적 뉴스 우세 - 시장 심리 호전 가능성\n`;
  } else if (overallSentiment === 'NEGATIVE') {
    response += `- **Implication**: 부정적 뉴스 우세 - 리스크 요인 모니터링 권장\n`;
  } else {
    response += `- **Implication**: 혼조세 뉴스 - 추가 분석 필요\n`;
  }

  response += `\n---\n`;
  response += `Fetched: ${new Date(news.fetchedAt).toLocaleString('ko-KR')} | Articles: ${news.articles.length}/${news.totalCount}`;

  return response;
}

/**
 * AI-optimized response format for exchange rates
 * Includes conversion calculator and trend analysis
 */
function formatExchangeRateResponse(rate: ExchangeRate): string {
  let response = `# Exchange Rate Report: ${rate.from}/${rate.to}\n\n`;

  // Format rate based on magnitude
  const formattedRate = rate.rate >= 100
    ? rate.rate.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : rate.rate.toFixed(4);

  // Determine trend
  const trend = rate.change !== null
    ? (rate.change > 0 ? 'UP' : rate.change < 0 ? 'DOWN' : 'STABLE')
    : 'UNKNOWN';
  const trendKorean = rate.change !== null
    ? (rate.change > 0 ? '상승' : rate.change < 0 ? '하락' : '보합')
    : '-';

  // Currency symbols
  const fromSymbol = getCurrencySymbol(rate.from);
  const toSymbol = getCurrencySymbol(rate.to);

  // Summary for AI
  response += `> **Summary**: 1 ${rate.from} = ${formattedRate} ${rate.to}. `;
  if (rate.changePercent !== null) {
    const changeSign = rate.changePercent >= 0 ? '+' : '';
    response += `전일대비 ${changeSign}${rate.changePercent.toFixed(2)}% (${trendKorean}).\n\n`;
  } else {
    response += `\n\n`;
  }

  // Core Data
  response += `## Exchange Rate Data\n`;
  response += `| Metric | Value | Note |\n`;
  response += `|--------|-------|------|\n`;
  response += `| From Currency | ${rate.from} | ${getCurrencyName(rate.from)} |\n`;
  response += `| To Currency | ${rate.to} | ${getCurrencyName(rate.to)} |\n`;
  response += `| Current Rate | ${formattedRate} | 1 ${rate.from} 기준 |\n`;
  response += `| Inverse Rate | ${(1/rate.rate).toFixed(6)} | 1 ${rate.to} 기준 |\n`;

  if (rate.change !== null && rate.changePercent !== null) {
    const changeSign = rate.change >= 0 ? '+' : '';
    response += `| Change | ${changeSign}${rate.change.toFixed(4)} | ${trend} |\n`;
    response += `| Change % | ${changeSign}${rate.changePercent.toFixed(2)}% | ${trendKorean} |\n`;
  }

  // Conversion Calculator
  response += `\n## Quick Conversion\n`;
  const amounts = rate.from === 'USD' ? [100, 500, 1000, 5000, 10000] :
                  rate.from === 'KRW' ? [100000, 500000, 1000000, 5000000, 10000000] :
                  [100, 500, 1000, 5000, 10000];

  response += `| ${rate.from} Amount | ${rate.to} Value |\n`;
  response += `|----------|------------|\n`;
  for (const amount of amounts) {
    const converted = amount * rate.rate;
    const formattedAmount = amount.toLocaleString();
    const formattedConverted = converted >= 100
      ? converted.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : converted.toFixed(4);
    response += `| ${fromSymbol}${formattedAmount} | ${toSymbol}${formattedConverted} |\n`;
  }

  // Reverse conversion
  response += `\n### Reverse Conversion\n`;
  const reverseAmounts = rate.to === 'USD' ? [100, 500, 1000] :
                         rate.to === 'KRW' ? [100000, 500000, 1000000] :
                         [100, 500, 1000];

  response += `| ${rate.to} Amount | ${rate.from} Value |\n`;
  response += `|----------|------------|\n`;
  for (const amount of reverseAmounts) {
    const converted = amount / rate.rate;
    const formattedAmount = amount.toLocaleString();
    const formattedConverted = converted >= 100
      ? converted.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : converted.toFixed(4);
    response += `| ${toSymbol}${formattedAmount} | ${fromSymbol}${formattedConverted} |\n`;
  }

  // AI Analysis Hints
  response += `\n## AI Analysis Hints\n`;
  response += `- **Currency Pair**: ${rate.from}/${rate.to}\n`;
  response += `- **Trend**: ${trend} (${trendKorean})\n`;

  if (rate.changePercent !== null) {
    const volatility = Math.abs(rate.changePercent) > 1 ? 'HIGH' :
                       Math.abs(rate.changePercent) > 0.3 ? 'MODERATE' : 'LOW';
    response += `- **Volatility**: ${volatility}\n`;

    // Implications for investors
    if (rate.from === 'USD' && rate.to === 'KRW') {
      if (rate.change !== null && rate.change > 0) {
        response += `- **Implication**: 원화 약세 - 달러 자산 보유자 환차익, 해외 투자 시 환손실 위험 증가\n`;
      } else if (rate.change !== null && rate.change < 0) {
        response += `- **Implication**: 원화 강세 - 해외 투자 시 환차익 기회, 수출기업 실적 압박 가능\n`;
      }
    }
  }

  response += `\n---\n`;
  response += `Timestamp: ${new Date(rate.timestamp).toLocaleString('ko-KR')}`;

  return response;
}

/**
 * Get currency symbol
 */
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    'USD': '$',
    'KRW': '₩',
    'EUR': '€',
    'JPY': '¥',
    'GBP': '£',
    'CNY': '¥',
    'CHF': 'CHF ',
    'CAD': 'C$',
    'AUD': 'A$',
    'HKD': 'HK$',
  };
  return symbols[currency.toUpperCase()] || '';
}

/**
 * Get currency full name
 */
function getCurrencyName(currency: string): string {
  const names: Record<string, string> = {
    'USD': 'US Dollar (미국 달러)',
    'KRW': 'Korean Won (한국 원)',
    'EUR': 'Euro (유로)',
    'JPY': 'Japanese Yen (일본 엔)',
    'GBP': 'British Pound (영국 파운드)',
    'CNY': 'Chinese Yuan (중국 위안)',
    'CHF': 'Swiss Franc (스위스 프랑)',
    'CAD': 'Canadian Dollar (캐나다 달러)',
    'AUD': 'Australian Dollar (호주 달러)',
    'HKD': 'Hong Kong Dollar (홍콩 달러)',
  };
  return names[currency.toUpperCase()] || currency;
}

// ============================================================================
// Server Startup
// ============================================================================

async function main() {
  log.info('Starting Investment MCP Server', {
    version: '1.0.0',
    availableMockSymbols: getAvailableMockSymbols(),
    supportedCurrencies: getSupportedCurrencies(),
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  log.info('Investment MCP Server running on stdio');
  console.error('Investment MCP Server running on stdio');
}

main().catch((error) => {
  log.error('Failed to start server', error);
  console.error('Failed to start server:', error);
  process.exit(1);
});
