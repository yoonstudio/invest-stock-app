'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { StockCard } from '@/components/stock/StockCard';
import { CardSkeleton } from '@/components/ui/Loading';
import { getMultipleStockPrices, searchStocks } from '@/lib/api';
import { useSearchHistoryStore } from '@/lib/store';
import { StockPrice, StockSearchResult } from '@/types';

// Popular stocks for initial display
const popularSymbols = [
  '005930.KS', '000660.KS', '035420.KS', '035720.KS',
  'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA',
];

function StocksContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [stocks, setStocks] = useState<StockPrice[]>([]);
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState(false);
  const { history, addToHistory } = useSearchHistoryStore();

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (debouncedQuery.trim()) {
          addToHistory(debouncedQuery.trim());
          // Use search API (MCP first → Yahoo fallback)
          const results = await searchStocks(debouncedQuery.trim());
          setSearchResults(results);
          setSearchMode(true);

          // Also fetch price data for search results
          if (results.length > 0) {
            const symbols = results.map((r) => r.symbol);
            try {
              const prices = await getMultipleStockPrices(symbols);
              setStocks(prices);
            } catch {
              // Price fetch failed, still show search results
              setStocks([]);
            }
          } else {
            setStocks([]);
          }
        } else {
          // No query: show popular stocks
          setSearchMode(false);
          setSearchResults([]);
          const data = await getMultipleStockPrices(popularSymbols);
          setStocks(data);
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          종목 검색
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          관심 있는 종목을 검색하고 상세 정보를 확인하세요.
        </p>
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
            <span className="text-sm text-gray-500 dark:text-gray-400">
              최근 검색:
            </span>
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

      {/* Stock Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : searchMode && searchResults.length > 0 && stocks.length === 0 ? (
        // Search results found but no price data yet - show results as list
        <>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Search className="w-4 h-4" />
            <span>"{debouncedQuery}" 검색 결과 ({searchResults.length}개)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((result) => (
              <a
                key={result.symbol}
                href={`/stocks/${encodeURIComponent(result.symbol)}`}
                className="block p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              >
                <div className="font-semibold text-gray-900 dark:text-white">
                  {result.symbol}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {result.name}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {result.exchange} · {result.type}
                </div>
              </a>
            ))}
          </div>
        </>
      ) : stocks.length === 0 ? (
        <Card className="text-center py-12">
          <Search className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            검색 결과가 없습니다
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            다른 종목명이나 코드로 검색해보세요.
          </p>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-4 h-4" />
            <span>
              {debouncedQuery ? `"${debouncedQuery}" 검색 결과` : '인기 종목'} ({stocks.length}개)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stocks.map((stock) => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function StocksPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <CardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    }>
      <StocksContent />
    </Suspense>
  );
}
