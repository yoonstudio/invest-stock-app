/**
 * News service - Google News RSS 기반 실시간 뉴스
 * Google News RSS를 통해 종목 관련 최신 뉴스를 가져옵니다.
 */

import { XMLParser } from 'fast-xml-parser';
import type { NewsArticle, NewsResponse } from '../shared/types/index.js';
import { newsCache } from '../shared/cache/index.js';
import { logger } from '../shared/logger/index.js';
import { ValidationError } from '../shared/errors/index.js';

const log = logger.child('NewsService');

const CACHE_TTL = 3 * 60 * 1000; // 3분 캐시 (뉴스는 짧게)
const FETCH_TIMEOUT = 10000;

// 감성 분석용 키워드 (금융 뉴스 특화)
const POSITIVE_KW = ['상승', '급등', '호실적', '최고', '상회', '성장', '흑자', '신고가', '매수', '강세', '개선', '증가', '확대', '돌파', '수주', '호재', '기대', '회복', '반등', '잭팟', '선택', '돌아왔다', '1위', '신기록', '호조', '수혜', '기회', '혁신', '채택'];
const NEGATIVE_KW = ['하락', '급락', '부진', '최저', '하회', '감소', '적자', '신저가', '매도', '약세', '악화', '우려', '위기', '축소', '손실', '리스크', '경고', '하향', '대란', '불안', '하락세', '저조', '경계', '폭락', '주의', '실망', '타격', '피해'];

function detectSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  let score = 0;
  for (const kw of POSITIVE_KW) if (text.includes(kw)) score++;
  for (const kw of NEGATIVE_KW) if (text.includes(kw)) score--;
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').trim();
}

function parseSourceFromTitle(title: string): { cleanTitle: string; source: string } {
  // Google News RSS 제목 형식: "기사 제목 - 출처명"
  const match = title.match(/^(.*?)\s*-\s*([^-]+)$/);
  if (match) {
    return { cleanTitle: match[1].trim(), source: match[2].trim() };
  }
  return { cleanTitle: title, source: 'Google 뉴스' };
}

function parseGoogleNewsRss(xml: string, limit: number): NewsArticle[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const result = parser.parse(xml);

  const items: Record<string, unknown>[] = result?.rss?.channel?.item ?? [];
  const arr = Array.isArray(items) ? items : [items];

  return arr.slice(0, limit).map((item) => {
    const rawTitle = String(item.title ?? '');
    const { cleanTitle, source } = parseSourceFromTitle(rawTitle);

    // description 구조: "{title}  {source}{관련기사1}  {source1}{관련기사2}..."
    const rawDesc = String(item.description ?? '');
    const stripped = stripHtml(rawDesc);
    const segments = stripped.split(/\xa0{2,}|\s{3,}/).map((s: string) => s.trim()).filter(Boolean);
    // segments[0]=제목, segments[1]=출처, segments[2+]=관련기사들 (추가 컨텍스트로 활용)
    const related = segments.slice(2).filter((s: string) => s.length > 10 && s !== source);
    const summary = related.slice(0, 2).join(' | ').slice(0, 150);

    const pubDate = item.pubDate ? new Date(String(item.pubDate)).toISOString() : new Date().toISOString();
    const link = String(item.link ?? item.guid ?? '');
    const sentiment = detectSentiment(cleanTitle + ' ' + summary);

    return {
      title: cleanTitle,
      source,
      publishedAt: pubDate,
      summary,
      url: link,
      sentiment,
    };
  });
}

async function fetchGoogleNewsRss(query: string, limit: number): Promise<NewsResponse | null> {
  const encoded = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${encoded}&hl=ko&gl=KR&ceid=KR:ko`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!res.ok) {
      log.warn('Google News RSS returned non-OK', { status: res.status, query });
      return null;
    }

    const xml = await res.text();
    if (!xml || !xml.includes('<rss')) {
      log.warn('Google News RSS returned unexpected content', { query });
      return null;
    }

    const articles = parseGoogleNewsRss(xml, limit);
    log.info('Google News RSS fetched', { query, count: articles.length });

    return {
      query,
      articles,
      totalCount: articles.length,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      log.warn('Google News RSS timed out', { query });
    } else {
      log.warn('Google News RSS fetch failed', { query, error: String(error) });
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 종목 관련 실시간 뉴스 조회
 */
export async function getInvestmentNews(query: string, limit: number = 5): Promise<NewsResponse> {
  if (!query || query.trim().length === 0) {
    throw new ValidationError('Search query is required');
  }

  if (limit < 1 || limit > 20) {
    throw new ValidationError('Limit must be between 1 and 20');
  }

  const normalizedQuery = query.trim();
  const cacheKey = `news:${normalizedQuery.toLowerCase()}:${limit}`;

  const cached = newsCache.get<NewsResponse>(cacheKey);
  if (cached) {
    log.debug('Cache hit for news', { query: normalizedQuery });
    return cached;
  }

  log.debug('Fetching news from Google RSS', { query: normalizedQuery });

  const response = await fetchGoogleNewsRss(normalizedQuery, limit);
  if (response && response.articles.length > 0) {
    newsCache.set(cacheKey, response, CACHE_TTL);
    return response;
  }

  // 빈 응답
  const empty: NewsResponse = {
    query: normalizedQuery,
    articles: [],
    totalCount: 0,
    fetchedAt: new Date().toISOString(),
  };
  return empty;
}

/**
 * 시장 트렌드 뉴스
 */
export async function getTrendingNews(limit: number = 5): Promise<NewsResponse> {
  return getInvestmentNews('한국 주식 증시', limit);
}
