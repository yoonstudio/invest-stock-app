'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, TrendingUp, TrendingDown, Plus, ArrowRight, RefreshCw } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Loading';
import { Badge, TrendBadge } from '@/components/ui/Badge';
import { NoStocks } from '@/components/ui/EmptyState';
import { getMultipleStockPrices } from '@/lib/api';
import { useWatchlistStore } from '@/lib/store';
import { StockPrice } from '@/types';
import {
  formatCurrency,
  formatPercent,
  getChangeColor,
  classNames,
  getStockCurrency,
} from '@/lib/utils';

export function Watchlist() {
  const { symbols, removeSymbol } = useWatchlistStore();
  const [stocks, setStocks] = useState<StockPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStocks = async (showRefresh = false) => {
    if (symbols.length === 0) {
      setLoading(false);
      return;
    }
    if (showRefresh) setRefreshing(true);
    try {
      const data = await getMultipleStockPrices(symbols);
      setStocks(data);
    } catch (error) {
      console.error('Failed to fetch watchlist stocks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(() => fetchStocks(), 30000);
    return () => clearInterval(interval);
  }, [symbols]);

  if (loading) {
    return (
      <Card>
        <CardHeader
          title="관심 종목"
          icon={<Star className="w-5 h-5 text-amber-400" aria-hidden="true" />}
        />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8" circle />
                <div>
                  <Skeleton className="h-4 w-24 mb-1.5" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-20 mb-1.5" />
                <Skeleton className="h-3 w-12 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="관심 종목"
        titleAs="h2"
        icon={<Star className="w-5 h-5 text-amber-400 fill-amber-400" aria-hidden="true" />}
        subtitle={stocks.length > 0 ? `${stocks.length}개 종목` : undefined}
        action={
          <div className="flex items-center gap-1">
            {stocks.length > 0 && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => fetchStocks(true)}
                loading={refreshing}
                aria-label="새로고침"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
            <Link href="/stocks">
              <Button variant="ghost" size="xs" leftIcon={<Plus className="w-4 h-4" />}>
                추가
              </Button>
            </Link>
          </div>
        }
      />

      {stocks.length === 0 ? (
        <NoStocks onSearch={() => window.location.href = '/stocks'} />
      ) : (
        <div className="space-y-2">
          {stocks.map((stock, index) => (
            <Link
              key={stock.symbol}
              href={`/stocks/${encodeURIComponent(stock.symbol)}`}
              className={classNames(
                'group flex items-center gap-3 p-3 rounded-xl',
                'bg-gray-50 dark:bg-gray-800/50',
                'hover:bg-gray-100 dark:hover:bg-gray-700/50',
                'transition-all duration-200',
                'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Star button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeSymbol(stock.symbol);
                }}
                className={classNames(
                  'flex-shrink-0 p-1.5 rounded-full',
                  'text-amber-400 hover:text-amber-500',
                  'hover:bg-amber-50 dark:hover:bg-amber-900/20',
                  'transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-amber-500'
                )}
                aria-label={`${stock.name} 관심 종목에서 제거`}
              >
                <Star className="w-4 h-4 fill-current" aria-hidden="true" />
              </button>

              {/* Stock info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {stock.name}
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {stock.symbol}
                </span>
              </div>

              {/* Price */}
              <div className="text-right flex-shrink-0">
                <div className="font-semibold text-gray-900 dark:text-white font-tabular">
                  {formatCurrency(stock.currentPrice, getStockCurrency(stock.symbol))}
                </div>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <TrendBadge
                    value={parseFloat(stock.changePercent.toFixed(2))}
                    size="sm"
                  />
                </div>
              </div>

              {/* Arrow indicator */}
              <ArrowRight
                className="w-4 h-4 text-gray-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all flex-shrink-0"
                aria-hidden="true"
              />
            </Link>
          ))}

          {/* View all link */}
          <Link
            href="/stocks"
            className={classNames(
              'flex items-center justify-center gap-2 p-3 rounded-xl',
              'text-sm font-medium text-gray-500 dark:text-gray-400',
              'hover:text-gray-700 dark:hover:text-gray-200',
              'hover:bg-gray-50 dark:hover:bg-gray-800/30',
              'transition-colors'
            )}
          >
            <span>모든 종목 보기</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </Card>
  );
}
