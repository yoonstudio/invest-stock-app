/**
 * MCP Stock Service - jjlabsio/korea-stock-mcp wrapper
 *
 * Available tools:
 * - get_corp_code: Find DART corp code by company name
 * - get_disclosure_list: Search DART disclosures
 * - get_disclosure: Get disclosure document content
 * - get_financial_statement: XBRL financial statements
 * - get_market_type: Stock market type (Y/K/N/E)
 * - get_stock_base_info: KRX stock basic info (name, listing date, etc.)
 * - get_stock_trade_info: KRX daily trading data (close, volume, market cap, etc.)
 * - get_today_date: Today's date in KST/UTC
 */

import { callTool, isConnected } from './mcpClientManager.js';
import { logger } from '../shared/logger/index.js';

const log = logger.child('McpStockService');

const SERVER: 'jjlabs' = 'jjlabs';

function ensureConnected(): void {
  if (!isConnected(SERVER)) {
    throw new Error('jjlabs MCP server is not connected');
  }
}

/**
 * Get today's date in YYYYMMDD format (KST)
 */
function getTodayKST(): string {
  const now = new Date();
  // KST = UTC + 9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * Get KRX stock trading info (close price, volume, market cap, etc.)
 * Uses get_stock_trade_info tool with basDdList, market, codeList
 */
export async function getKrxStockInfo(symbol: string): Promise<unknown> {
  ensureConnected();
  const code = symbol.replace(/\.KS$/i, '');
  const today = getTodayKST();
  log.debug('getKrxStockInfo', { code, today });

  // Try KOSPI first, then KOSDAQ
  for (const market of ['KOSPI', 'KOSDAQ'] as const) {
    try {
      const result = await callTool(SERVER, 'get_stock_trade_info', {
        basDdList: [today],
        market,
        codeList: [code],
      }) as Record<string, Array<Record<string, unknown>>>;

      // Result format: { "YYYYMMDD": [{ ISU_CD, TDD_CLSPRC, ... }] }
      const dayData = result[today];
      if (dayData && dayData.length > 0) {
        const stock = dayData[0];
        return {
          name: stock.ISU_ABBRV ?? stock.ISU_NM ?? code,
          currentPrice: Number(stock.TDD_CLSPRC ?? 0),
          previousClose: Number(stock.TDD_CLSPRC ?? 0) - Number(stock.CMPPREVDD_PRC ?? 0),
          price: Number(stock.TDD_CLSPRC ?? 0),
          close: Number(stock.TDD_CLSPRC ?? 0),
          prevClose: Number(stock.TDD_CLSPRC ?? 0) - Number(stock.CMPPREVDD_PRC ?? 0),
          volume: Number(stock.ACC_TRDVOL ?? 0),
          tradingVolume: Number(stock.ACC_TRDVOL ?? 0),
          marketCap: Number(stock.MKTCAP ?? 0),
          high: Number(stock.TDD_HGPRC ?? 0),
          low: Number(stock.TDD_LWPRC ?? 0),
          dayHigh: Number(stock.TDD_HGPRC ?? 0),
          dayLow: Number(stock.TDD_LWPRC ?? 0),
          open: Number(stock.TDD_OPNPRC ?? 0),
          change: Number(stock.CMPPREVDD_PRC ?? 0),
          changePercent: Number(stock.FLUC_RT ?? 0),
          exchange: market === 'KOSPI' ? 'KRX' : 'KOSDAQ',
        };
      }
    } catch (error) {
      log.debug(`Market ${market} lookup failed for ${code}`, { error: String(error) });
    }
  }

  // If today has no data (weekend/holiday), try going back up to 5 business days
  for (let daysBack = 1; daysBack <= 5; daysBack++) {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    for (const market of ['KOSPI', 'KOSDAQ'] as const) {
      try {
        const result = await callTool(SERVER, 'get_stock_trade_info', {
          basDdList: [dateStr],
          market,
          codeList: [code],
        }) as Record<string, Array<Record<string, unknown>>>;

        const dayData = result[dateStr];
        if (dayData && dayData.length > 0) {
          const stock = dayData[0];
          return {
            name: stock.ISU_ABBRV ?? stock.ISU_NM ?? code,
            currentPrice: Number(stock.TDD_CLSPRC ?? 0),
            previousClose: Number(stock.TDD_CLSPRC ?? 0) - Number(stock.CMPPREVDD_PRC ?? 0),
            price: Number(stock.TDD_CLSPRC ?? 0),
            close: Number(stock.TDD_CLSPRC ?? 0),
            prevClose: Number(stock.TDD_CLSPRC ?? 0) - Number(stock.CMPPREVDD_PRC ?? 0),
            volume: Number(stock.ACC_TRDVOL ?? 0),
            tradingVolume: Number(stock.ACC_TRDVOL ?? 0),
            marketCap: Number(stock.MKTCAP ?? 0),
            high: Number(stock.TDD_HGPRC ?? 0),
            low: Number(stock.TDD_LWPRC ?? 0),
            dayHigh: Number(stock.TDD_HGPRC ?? 0),
            dayLow: Number(stock.TDD_LWPRC ?? 0),
            open: Number(stock.TDD_OPNPRC ?? 0),
            change: Number(stock.CMPPREVDD_PRC ?? 0),
            changePercent: Number(stock.FLUC_RT ?? 0),
            exchange: market === 'KOSPI' ? 'KRX' : 'KOSDAQ',
          };
        }
      } catch {
        // continue
      }
    }
  }

  throw new Error(`No KRX data found for ${code}`);
}

/**
 * Get KRX stock base info (name, listing date, face value, etc.)
 */
export async function getKrxBaseInfo(symbol: string, market: 'KOSPI' | 'KOSDAQ' = 'KOSPI'): Promise<unknown> {
  ensureConnected();
  const code = symbol.replace(/\.KS$/i, '');
  const today = getTodayKST();
  log.debug('getKrxBaseInfo', { code, market, today });
  return callTool(SERVER, 'get_stock_base_info', {
    basDdList: [today],
    market,
    codeList: [code],
  });
}

/**
 * Search DART disclosures
 */
export async function getDartDisclosures(
  corpCode: string,
  options?: {
    beginDate?: string;
    endDate?: string;
    disclosureType?: string;
  }
): Promise<unknown> {
  ensureConnected();
  log.debug('getDartDisclosures', { corpCode, options });
  return callTool(SERVER, 'get_disclosure_list', {
    corp_code: corpCode,
    ...(options?.beginDate ? { bgn_de: options.beginDate } : {}),
    ...(options?.endDate ? { end_de: options.endDate } : {}),
    ...(options?.disclosureType ? { pblntf_ty: options.disclosureType } : {}),
  });
}

/**
 * Get DART XBRL financial statements
 */
export async function getDartFinancials(
  corpCode: string,
  year?: string,
  reportCode: '11013' | '11012' | '11014' | '11011' = '11011',
  fsDiv: 'OFS' | 'CFS' = 'CFS'
): Promise<unknown> {
  ensureConnected();
  const bsnsYear = year ?? String(new Date().getFullYear() - 1);
  log.debug('getDartFinancials', { corpCode, bsnsYear, reportCode, fsDiv });
  return callTool(SERVER, 'get_financial_statement', {
    corp_code: corpCode,
    bsns_year: bsnsYear,
    reprt_code: reportCode,
    fs_div: fsDiv,
  });
}

/**
 * Get DART corp code by company name
 */
export async function getDartCorpCode(companyName: string): Promise<unknown> {
  ensureConnected();
  log.debug('getDartCorpCode', { companyName });
  return callTool(SERVER, 'get_corp_code', { corp_name: companyName });
}
