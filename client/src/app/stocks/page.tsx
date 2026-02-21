'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, TrendingUp, Award, ShieldCheck, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { StockCard } from '@/components/stock/StockCard';
import { RecommendationCard } from '@/components/stock/RecommendationCard';
import { ScreeningModal } from '@/components/stock/ScreeningModal';
import { CardSkeleton } from '@/components/ui/Loading';
import { getMultipleStockPrices, searchStocks, getRecommendedStocks } from '@/lib/api';
import { useSearchHistoryStore } from '@/lib/store';
import { StockPrice, StockSearchResult, RecommendedStock, ScreeningCriteria, DEFAULT_SCREENING_CRITERIA, AVAILABLE_COUNTRIES } from '@/types';
import { classNames } from '@/lib/utils';

function CriteriaBadge({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
        active
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-300 dark:ring-blue-700'
          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      )}
    >
      <ShieldCheck className="w-3 h-3" />
      {label}
    </span>
  );
}

function RecommendationSkeleton() {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        </div>
      </div>
      <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl" />
      <div className="grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
      <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-700">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-full" />
        ))}
      </div>
    </div>
  );
}

/** 현재 criteria가 기본값인지 확인 */
function isDefaultCriteria(c: ScreeningCriteria): boolean {
  const d = DEFAULT_SCREENING_CRITERIA;
  return (
    c.roeMin === d.roeMin &&
    c.perRatioMax === d.perRatioMax &&
    c.pbrRatioMax === d.pbrRatioMax &&
    c.epsMin === d.epsMin &&
    c.requireMoat === d.requireMoat &&
    c.countries.length === 0 &&
    c.sectors.length === 0
  );
}

function StocksContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [stocks, setStocks] = useState<StockPrice[]>([]);
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [recLoading, setRecLoading] = useState(true);
  const [searchMode, setSearchMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [criteria, setCriteria] = useState<ScreeningCriteria>({ ...DEFAULT_SCREENING_CRITERIA });
  const { history, addToHistory } = useSearchHistoryStore();

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch recommendations whenever criteria change
  const fetchRecommendations = useCallback(async (c: ScreeningCriteria) => {
    setRecLoading(true);
    try {
      const data = await getRecommendedStocks(10, c);
      setRecommendations(data);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setRecLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations(criteria);
  }, [criteria, fetchRecommendations]);

  // Handle criteria apply from modal
  const handleApplyCriteria = (newCriteria: ScreeningCriteria) => {
    setCriteria(newCriteria);
  };

  // Search / stock fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (debouncedQuery.trim()) {
          addToHistory(debouncedQuery.trim());
          const results = await searchStocks(debouncedQuery.trim());
          setSearchResults(results);
          setSearchMode(true);
          if (results.length > 0) {
            try {
              const prices = await getMultipleStockPrices(results.map((r) => r.symbol));
              setStocks(prices);
            } catch {
              setStocks([]);
            }
          } else {
            setStocks([]);
          }
        } else {
          setSearchMode(false);
          setSearchResults([]);
          setStocks([]);
        }
      } catch (error) {
        console.error('Failed to fetch stocks:', error);
        setStocks([]);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [debouncedQuery]);

  const customized = !isDefaultCriteria(criteria);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">종목 검색</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            관심 있는 종목을 검색하고 상세 정보를 확인하세요.
          </p>
        </div>

        {/* 조건검색 버튼 */}
        <button
          onClick={() => setModalOpen(true)}
          className={classNames(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold',
            'border transition-all shadow-sm flex-shrink-0',
            customized
              ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-blue-100 dark:shadow-blue-900/30'
              : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750',
            customized
              ? ''
              : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600',
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          조건검색
          {customized && (
            <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">
              커스텀
            </span>
          )}
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={(e) => e.preventDefault()}>
        <Input
          type="text"
          placeholder="종목명 또는 종목 코드를 입력하세요 (예: 삼성전자, AAPL)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<Search className="w-5 h-5" />}
        />
      </form>

      {/* Recent Searches */}
      {history.length > 0 && !query && (
        <Card padding="sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500 dark:text-gray-400">최근 검색:</span>
            {history.slice(0, 5).map((item) => (
              <button
                key={item}
                onClick={() => setQuery(item)}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {item}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* ======================================================
          검색 모드
          ====================================================== */}
      {searchMode ? (
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : searchResults.length > 0 && stocks.length === 0 ? (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Search className="w-4 h-4" />
              <span>&ldquo;{debouncedQuery}&rdquo; 검색 결과 ({searchResults.length}개)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((result) => (
                <a
                  key={result.symbol}
                  href={`/stocks/${encodeURIComponent(result.symbol)}`}
                  className="block p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                  <div className="font-semibold text-gray-900 dark:text-white">{result.symbol}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{result.name}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {result.exchange} · {result.type}
                  </div>
                </a>
              ))}
            </div>
          </>
        ) : stocks.length > 0 ? (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <TrendingUp className="w-4 h-4" />
              <span>&ldquo;{debouncedQuery}&rdquo; 검색 결과 ({stocks.length}개)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stocks.map((stock) => <StockCard key={stock.symbol} stock={stock} />)}
            </div>
          </>
        ) : (
          <Card className="text-center py-12">
            <Search className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              검색 결과가 없습니다
            </h3>
            <p className="text-gray-500 dark:text-gray-400">다른 종목명이나 코드로 검색해보세요.</p>
          </Card>
        )
      ) : (
        /* ======================================================
           기본 모드: 퀀트 스크리닝 TOP 10
           ====================================================== */
        <section className="space-y-5">
          {/* Section Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                퀀트 스크리닝 추천 종목 TOP 10
              </h2>
              {customized && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-medium">
                  커스텀 조건
                </span>
              )}
            </div>
            <button
              onClick={() => fetchRecommendations(criteria)}
              disabled={recLoading}
              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={classNames('w-3.5 h-3.5', recLoading ? 'animate-spin' : '')} />
              새로고침
            </button>
          </div>

          {/* Criteria Badges */}
          <div className="flex flex-wrap gap-2">
            {/* Country badges */}
            {criteria.countries.length === 0 ? (
              <CriteriaBadge label="전체 국가" active={false} />
            ) : (
              criteria.countries.map((code) => {
                const meta = AVAILABLE_COUNTRIES.find((c) => c.code === code);
                return (
                  <CriteriaBadge
                    key={code}
                    label={meta ? `${meta.flag} ${meta.label}` : code}
                    active={true}
                  />
                );
              })
            )}
            {/* Sector badges */}
            {criteria.sectors.length > 0 && criteria.sectors.map((sector) => (
              <CriteriaBadge key={sector} label={sector} active={true} />
            ))}
            <CriteriaBadge
              label={`ROE ≥ ${criteria.roeMin}%`}
              active={criteria.roeMin !== DEFAULT_SCREENING_CRITERIA.roeMin}
            />
            <CriteriaBadge
              label={`PER 업종평균 ${criteria.perRatioMax}% 이하`}
              active={criteria.perRatioMax !== DEFAULT_SCREENING_CRITERIA.perRatioMax}
            />
            <CriteriaBadge
              label={`PBR 업종평균 ${criteria.pbrRatioMax}% 이하`}
              active={criteria.pbrRatioMax !== DEFAULT_SCREENING_CRITERIA.pbrRatioMax}
            />
            <CriteriaBadge
              label={`EPS ≥ ${criteria.epsMin}%`}
              active={criteria.epsMin !== DEFAULT_SCREENING_CRITERIA.epsMin}
            />
            <CriteriaBadge
              label={criteria.requireMoat ? '경제적 해자 있음' : '해자 무관'}
              active={criteria.requireMoat !== DEFAULT_SCREENING_CRITERIA.requireMoat}
            />
          </div>

          {/* Recommendation Grid */}
          {recLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(10)].map((_, i) => <RecommendationSkeleton key={i} />)}
            </div>
          ) : recommendations.length === 0 ? (
            <Card className="text-center py-12">
              <SlidersHorizontal className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                조건에 맞는 종목이 없습니다
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                스크리닝 조건을 완화해 보세요.
              </p>
              <button
                onClick={() => setCriteria({ ...DEFAULT_SCREENING_CRITERIA })}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                기본값으로 초기화
              </button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((stock, index) => (
                <RecommendationCard key={stock.symbol} stock={stock} rank={index + 1} />
              ))}
            </div>
          )}

          {!recLoading && recommendations.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-2">
              * 2025 회계연도 애널리스트 컨센서스 데이터 기반 · 1시간 캐시 적용
            </p>
          )}
        </section>
      )}

      {/* Screening Modal */}
      <ScreeningModal
        isOpen={modalOpen}
        current={criteria}
        onApply={handleApplyCriteria}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

export default function StocksPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <CardSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(10)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      }
    >
      <StocksContent />
    </Suspense>
  );
}
