/**
 * Stock Recommendation Screening Service
 */

import { logger } from '../shared/logger/index.js';

const log = logger.child('RecommendationService');

// ============================================================================
// Country & Sector Metadata  (exported for API consumers)
// ============================================================================

export interface CountryMeta {
  code: string;   // 'KR' | 'US' | ...
  label: string;  // '대한민국' | '미국' | ...
  flag: string;   // emoji flag
}

export interface SectorGroup {
  group: string;
  sectors: string[];
}

export const AVAILABLE_COUNTRIES: CountryMeta[] = [
  { code: 'KR', label: '대한민국', flag: '🇰🇷' },
  { code: 'US', label: '미국',     flag: '🇺🇸' },
];

/** Sectors grouped by theme — order matters for UI display */
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

/** Flat list of all sectors for convenience */
export const ALL_SECTORS: string[] = SECTOR_GROUPS.flatMap((g) => g.sectors);

// ============================================================================
// Screening Criteria
// ============================================================================

export interface ScreeningCriteria {
  roeMin: number;        // ROE >= roeMin%
  perRatioMax: number;   // PER < industryPER * (perRatioMax / 100)
  pbrRatioMax: number;   // PBR < industryPBR * (pbrRatioMax / 100)
  epsMin: number;        // EPS CAGR >= epsMin%
  requireMoat: boolean;
  countries: string[];   // [] = all countries
  sectors: string[];     // [] = all sectors
}

export const DEFAULT_CRITERIA: ScreeningCriteria = {
  roeMin: 15,
  perRatioMax: 90,
  pbrRatioMax: 80,
  epsMin: 15,
  requireMoat: true,
  countries: [],
  sectors: [],
};

// ============================================================================
// Response Types
// ============================================================================

export interface RecommendedStock {
  symbol: string;
  name: string;
  sector: string;
  country: string;       // 'KR' | 'US'
  moat: string;
  hasMoat: boolean;
  metrics: {
    roe: number;
    per: number;
    industryPER: number;
    pbr: number;
    industryPBR: number;
    epsCAGR: number;
    perDiscount: number;
    pbrDiscount: number;
  };
  score: number;
  passedCriteria: string[];
}

// ============================================================================
// Candidate Pool
// ============================================================================

interface StockCandidate {
  symbol: string;
  name: string;
  sector: string;
  country: string;
  roe: number;
  per: number;
  industryPER: number;
  pbr: number;
  industryPBR: number;
  epsCAGR: number;
  moat: string;
  hasMoat: boolean;
  rank: number;
}

const KOREAN_CANDIDATES: StockCandidate[] = [
  // ── 반도체 ──────────────────────────────────────────────────────────
  {
    symbol: '000660.KS', name: 'SK하이닉스', sector: '반도체', country: 'KR',
    roe: 22.1, per: 8.9, industryPER: 18.0,
    pbr: 1.9, industryPBR: 2.5, epsCAGR: 45.2,
    moat: 'HBM 메모리 글로벌 선도, AI 반도체 핵심 공급', hasMoat: true, rank: 1,
  },
  {
    symbol: '005930.KS', name: '삼성전자', sector: '반도체', country: 'KR',
    roe: 8.5, per: 33.9, industryPER: 18.0,
    pbr: 2.9, industryPBR: 2.5, epsCAGR: -5.2,
    moat: '글로벌 반도체 1위, 메모리·파운드리', hasMoat: true, rank: 18,
  },
  // ── 자동차 ──────────────────────────────────────────────────────────
  {
    symbol: '000270.KS', name: '기아', sector: '자동차', country: 'KR',
    roe: 25.3, per: 5.8, industryPER: 9.0,
    pbr: 0.7, industryPBR: 1.0, epsCAGR: 28.7,
    moat: 'SUV 글로벌 선도, 현대-기아 시너지', hasMoat: true, rank: 2,
  },
  {
    symbol: '005380.KS', name: '현대차', sector: '자동차', country: 'KR',
    roe: 17.8, per: 7.2, industryPER: 9.0,
    pbr: 0.6, industryPBR: 1.0, epsCAGR: 22.4,
    moat: '글로벌 3위 완성차, EV 전환 선도', hasMoat: true, rank: 3,
  },
  // ── IT 플랫폼 ────────────────────────────────────────────────────────
  {
    symbol: '035420.KS', name: 'NAVER', sector: 'IT플랫폼', country: 'KR',
    roe: 18.5, per: 24.1, industryPER: 35.0,
    pbr: 3.2, industryPBR: 5.0, epsCAGR: 16.2,
    moat: '국내 검색 독점, 커머스·클라우드 확장', hasMoat: true, rank: 4,
  },
  {
    symbol: '035720.KS', name: '카카오', sector: 'IT플랫폼', country: 'KR',
    roe: 7.2, per: 42.0, industryPER: 35.0,
    pbr: 2.1, industryPBR: 5.0, epsCAGR: 8.5,
    moat: '국내 메신저 기반, 플랫폼 경쟁력 약화 중', hasMoat: false, rank: 19,
  },
  // ── 2차전지 ──────────────────────────────────────────────────────────
  {
    symbol: '006400.KS', name: '삼성SDI', sector: '2차전지', country: 'KR',
    roe: 15.8, per: 11.2, industryPER: 22.0,
    pbr: 1.4, industryPBR: 2.8, epsCAGR: 18.3,
    moat: '전고체 배터리 기술 선도, 글로벌 OEM 납품', hasMoat: true, rank: 5,
  },
  {
    symbol: '373220.KS', name: 'LG에너지솔루션', sector: '2차전지', country: 'KR',
    roe: 8.4, per: 58.0, industryPER: 22.0,
    pbr: 3.8, industryPBR: 2.8, epsCAGR: 12.0,
    moat: '글로벌 배터리 2위, GM·현대차 공급', hasMoat: false, rank: 20,
  },
  // ── 화학/소재 ────────────────────────────────────────────────────────
  {
    symbol: '051910.KS', name: 'LG화학', sector: '화학/소재', country: 'KR',
    roe: 16.2, per: 14.5, industryPER: 20.0,
    pbr: 1.2, industryPBR: 2.0, epsCAGR: 15.8,
    moat: '배터리 소재 글로벌 top3, 석유화학 국내 1위', hasMoat: true, rank: 6,
  },
  // ── 바이오/헬스케어 ──────────────────────────────────────────────────
  {
    symbol: '207940.KS', name: '삼성바이오로직스', sector: '바이오CDMO', country: 'KR',
    roe: 15.2, per: 45.0, industryPER: 65.0,
    pbr: 5.8, industryPBR: 9.0, epsCAGR: 25.3,
    moat: '글로벌 CDMO 3위, 수직계열화', hasMoat: true, rank: 7,
  },
  {
    symbol: '068270.KS', name: '셀트리온', sector: '바이오시밀러', country: 'KR',
    roe: 16.8, per: 28.0, industryPER: 45.0,
    pbr: 3.4, industryPBR: 5.5, epsCAGR: 18.2,
    moat: '글로벌 바이오시밀러 선도, 직판 체계', hasMoat: true, rank: 8,
  },
  // ── 금융 ────────────────────────────────────────────────────────────
  {
    symbol: '105560.KS', name: 'KB금융', sector: '금융지주', country: 'KR',
    roe: 10.8, per: 6.2, industryPER: 9.5,
    pbr: 0.65, industryPBR: 1.0, epsCAGR: 15.2,
    moat: '국내 1위 금융지주, 밸류업 프로그램', hasMoat: true, rank: 9,
  },
  {
    symbol: '055550.KS', name: '신한지주', sector: '금융지주', country: 'KR',
    roe: 10.2, per: 6.5, industryPER: 9.5,
    pbr: 0.60, industryPBR: 1.0, epsCAGR: 15.0,
    moat: '동남아 금융 확장, 디지털 전환', hasMoat: true, rank: 10,
  },
  // ── 지주/다각화 ──────────────────────────────────────────────────────
  {
    symbol: '003550.KS', name: 'LG', sector: '지주회사', country: 'KR',
    roe: 15.5, per: 12.0, industryPER: 16.0,
    pbr: 0.9, industryPBR: 1.5, epsCAGR: 15.2,
    moat: '전자·화학·통신 다각화, 자회사 가치', hasMoat: true, rank: 12,
  },
  // ── 방산/항공 ─────────────────────────────────────────────────────────
  {
    symbol: '012450.KS', name: '한화에어로스페이스', sector: '방산/항공', country: 'KR',
    roe: 24.5, per: 16.8, industryPER: 28.0,
    pbr: 3.2, industryPBR: 4.5, epsCAGR: 32.0,
    moat: '국내 방산 1위, K9 자주포 글로벌 수출 선도', hasMoat: true, rank: 13,
  },
  // ── 조선 ────────────────────────────────────────────────────────────
  {
    symbol: '009540.KS', name: 'HD한국조선해양', sector: '조선', country: 'KR',
    roe: 18.5, per: 13.2, industryPER: 20.0,
    pbr: 1.6, industryPBR: 2.2, epsCAGR: 38.5,
    moat: 'LNG선·초대형유조선 글로벌 1위, 친환경 선박 선도', hasMoat: true, rank: 14,
  },
  // ── 게임 ────────────────────────────────────────────────────────────
  {
    symbol: '259960.KS', name: '크래프톤', sector: '게임', country: 'KR',
    roe: 22.8, per: 14.5, industryPER: 22.0,
    pbr: 2.4, industryPBR: 3.5, epsCAGR: 20.5,
    moat: 'PUBG 글로벌 배틀로얄 1위, 인도 시장 독점적 지위', hasMoat: true, rank: 17,
  },
];

const GLOBAL_CANDIDATES: StockCandidate[] = [
  // ── AI/반도체 ────────────────────────────────────────────────────────
  {
    symbol: 'NVDA', name: 'NVIDIA', sector: 'AI반도체', country: 'US',
    roe: 115.2, per: 48.5, industryPER: 70.0,
    pbr: 38.5, industryPBR: 55.0, epsCAGR: 85.2,
    moat: 'AI GPU 시장 독점(80%), CUDA 생태계 락인', hasMoat: true, rank: 1,
  },
  {
    symbol: 'AVGO', name: 'Broadcom', sector: 'AI반도체', country: 'US',
    roe: 42.5, per: 32.0, industryPER: 45.0,
    pbr: 12.8, industryPBR: 18.0, epsCAGR: 28.4,
    moat: 'AI 커스텀칩(ASIC) 1위, 네트워킹 반도체 독점', hasMoat: true, rank: 6,
  },
  // ── 클라우드/소프트웨어 ────────────────────────────────────────────────
  {
    symbol: 'MSFT', name: 'Microsoft', sector: '클라우드/AI', country: 'US',
    roe: 35.4, per: 33.2, industryPER: 42.0,
    pbr: 12.4, industryPBR: 16.0, epsCAGR: 16.8,
    moat: 'Azure 클라우드 2위, OpenAI 독점 파트너, 오피스 생태계', hasMoat: true, rank: 2,
  },
  {
    symbol: 'CRM', name: 'Salesforce', sector: 'CRM/SaaS', country: 'US',
    roe: 10.5, per: 38.0, industryPER: 52.0,
    pbr: 4.2, industryPBR: 6.5, epsCAGR: 22.0,
    moat: 'CRM 시장 1위, Agentforce AI 선도', hasMoat: true, rank: 15,
  },
  // ── 소비자/플랫폼 ────────────────────────────────────────────────────
  {
    symbol: 'AAPL', name: 'Apple', sector: '소비자전자', country: 'US',
    roe: 160.0, per: 31.5, industryPER: 40.0,
    pbr: 45.2, industryPBR: 60.0, epsCAGR: 18.5,
    moat: '애플 생태계 락인 18억대 기기, 서비스 고마진 성장', hasMoat: true, rank: 3,
  },
  {
    symbol: 'GOOGL', name: 'Alphabet', sector: '인터넷/AI', country: 'US',
    roe: 28.5, per: 23.8, industryPER: 35.0,
    pbr: 6.4, industryPBR: 10.0, epsCAGR: 15.8,
    moat: '검색 독점(90%), 광고 플랫폼, GCP + Gemini AI', hasMoat: true, rank: 4,
  },
  {
    symbol: 'META', name: 'Meta', sector: '소셜미디어', country: 'US',
    roe: 35.8, per: 26.2, industryPER: 35.0,
    pbr: 9.2, industryPBR: 12.0, epsCAGR: 22.4,
    moat: '32억 DAU 네트워크 효과, 광고 자동화 + Llama AI', hasMoat: true, rank: 5,
  },
  {
    symbol: 'AMZN', name: 'Amazon', sector: '이커머스/클라우드', country: 'US',
    roe: 23.8, per: 38.0, industryPER: 55.0,
    pbr: 8.5, industryPBR: 12.0, epsCAGR: 32.0,
    moat: 'AWS 클라우드 1위, 프라임 구독 고착화', hasMoat: true, rank: 7,
  },
  // ── 금융/핀테크 ──────────────────────────────────────────────────────
  {
    symbol: 'V', name: 'Visa', sector: '결제네트워크', country: 'US',
    roe: 45.2, per: 31.5, industryPER: 40.0,
    pbr: 14.8, industryPBR: 20.0, epsCAGR: 15.5,
    moat: '글로벌 결제 네트워크 1위, 복수 수익원 구조', hasMoat: true, rank: 8,
  },
  {
    symbol: 'MA', name: 'Mastercard', sector: '결제네트워크', country: 'US',
    roe: 185.0, per: 38.5, industryPER: 50.0,
    pbr: 58.0, industryPBR: 75.0, epsCAGR: 18.0,
    moat: '글로벌 결제 네트워크 2위, 양면 시장 진입장벽', hasMoat: true, rank: 9,
  },
  // ── 헬스케어 ────────────────────────────────────────────────────────
  {
    symbol: 'LLY', name: 'Eli Lilly', sector: '헬스케어/제약', country: 'US',
    roe: 58.5, per: 42.0, industryPER: 58.0,
    pbr: 28.5, industryPBR: 42.0, epsCAGR: 52.0,
    moat: 'GLP-1 비만치료제(Zepbound/Mounjaro) 시장 선도', hasMoat: true, rank: 11,
  },
  // ── 소비재 ──────────────────────────────────────────────────────────
  {
    symbol: 'COST', name: 'Costco', sector: '멤버십리테일', country: 'US',
    roe: 28.5, per: 52.0, industryPER: 30.0,
    pbr: 14.2, industryPBR: 8.0, epsCAGR: 14.5,
    moat: '멤버십 락인 효과, 저마진 충성도 모델', hasMoat: false, rank: 21,
  },
];

const ALL_CANDIDATES: StockCandidate[] = [
  ...KOREAN_CANDIDATES,
  ...GLOBAL_CANDIDATES,
];

// ============================================================================
// Screening Logic
// ============================================================================

function screenCandidate(
  stock: StockCandidate,
  criteria: ScreeningCriteria,
): RecommendedStock | null {
  // Pre-filter: country & sector  (empty array = include all)
  if (criteria.countries.length > 0 && !criteria.countries.includes(stock.country)) return null;
  if (criteria.sectors.length > 0 && !criteria.sectors.includes(stock.sector)) return null;

  // Economic moat filter
  if (criteria.requireMoat && !stock.hasMoat) return null;

  const passedCriteria: string[] = [];

  const passROE = stock.roe >= criteria.roeMin;
  if (passROE) passedCriteria.push(`ROE ${stock.roe.toFixed(1)}% ≥ ${criteria.roeMin}%`);

  const perThreshold = stock.industryPER * (criteria.perRatioMax / 100);
  const passPER = stock.per < perThreshold;
  if (passPER) passedCriteria.push(
    `PER ${stock.per.toFixed(1)}x < 업종평균의 ${criteria.perRatioMax}% (${perThreshold.toFixed(1)}x)`,
  );

  const pbrThreshold = stock.industryPBR * (criteria.pbrRatioMax / 100);
  const passPBR = stock.pbr < pbrThreshold;
  if (passPBR) passedCriteria.push(
    `PBR ${stock.pbr.toFixed(2)}x < 업종평균의 ${criteria.pbrRatioMax}% (${pbrThreshold.toFixed(2)}x)`,
  );

  const passEPS = stock.epsCAGR >= criteria.epsMin;
  if (passEPS) passedCriteria.push(`EPS CAGR ${stock.epsCAGR.toFixed(1)}% ≥ ${criteria.epsMin}%`);

  if (!passROE || !passPER || !passPBR || !passEPS) return null;

  const perDiscount = ((stock.industryPER - stock.per) / stock.industryPER) * 100;
  const pbrDiscount = ((stock.industryPBR - stock.pbr) / stock.industryPBR) * 100;

  return {
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    country: stock.country,
    moat: stock.moat,
    hasMoat: stock.hasMoat,
    metrics: {
      roe: stock.roe,
      per: stock.per,
      industryPER: stock.industryPER,
      pbr: stock.pbr,
      industryPBR: stock.industryPBR,
      epsCAGR: stock.epsCAGR,
      perDiscount: parseFloat(perDiscount.toFixed(1)),
      pbrDiscount: parseFloat(pbrDiscount.toFixed(1)),
    },
    score: 100,
    passedCriteria,
  };
}

function computeTiebreakerScore(stock: StockCandidate, criteria: ScreeningCriteria): number {
  const perDiscount = (stock.industryPER - stock.per) / stock.industryPER;
  const pbrDiscount = (stock.industryPBR - stock.pbr) / stock.industryPBR;
  const roeRef = Math.max(criteria.roeMin, 1);
  const epsRef = Math.max(criteria.epsMin, 1);
  return (
    Math.log2(1 + stock.roe / roeRef) * 25 +
    perDiscount * 25 +
    pbrDiscount * 25 +
    Math.log2(1 + stock.epsCAGR / epsRef) * 25
  );
}

// ============================================================================
// Cache
// ============================================================================

interface CacheEntry {
  data: RecommendedStock[];
  expiresAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function criteriaKey(c: ScreeningCriteria): string {
  return [
    c.roeMin, c.perRatioMax, c.pbrRatioMax, c.epsMin,
    c.requireMoat,
    [...c.countries].sort().join(','),
    [...c.sectors].sort().join(','),
  ].join('|');
}

// ============================================================================
// Public API
// ============================================================================

export async function getRecommendedStocks(
  limit: number = 10,
  criteria: ScreeningCriteria = DEFAULT_CRITERIA,
): Promise<RecommendedStock[]> {
  const now = Date.now();
  const key = criteriaKey(criteria);

  const cached = cache.get(key);
  if (cached && now < cached.expiresAt) {
    log.debug('Returning cached recommendations', { key, count: cached.data.length });
    return cached.data.slice(0, limit);
  }

  log.info('Running stock recommendation screening', { criteria, candidateCount: ALL_CANDIDATES.length });

  const passed: Array<{ stock: StockCandidate; result: RecommendedStock }> = [];
  for (const candidate of ALL_CANDIDATES) {
    const result = screenCandidate(candidate, criteria);
    if (result !== null) passed.push({ stock: candidate, result });
  }

  log.info('Screening complete', { total: ALL_CANDIDATES.length, passed: passed.length });

  passed.sort((a, b) => computeTiebreakerScore(b.stock, criteria) - computeTiebreakerScore(a.stock, criteria));
  const recommendations = passed.map((p) => p.result);
  cache.set(key, { data: recommendations, expiresAt: now + CACHE_TTL_MS });

  return recommendations.slice(0, limit);
}

export function invalidateRecommendationCache(): void {
  cache.clear();
  log.info('Recommendation cache invalidated');
}
