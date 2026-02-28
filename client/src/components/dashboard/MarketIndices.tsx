'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Loading';
import { TrendBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getMarketIndices } from '@/lib/api';
import { MarketIndex } from '@/types';
import { formatNumber, formatPercent, getChangeColor, classNames } from '@/lib/utils';

export function MarketIndices() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchIndices = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const data = await getMarketIndices();
      setIndices(data);
    } catch (error) {
      console.error('Failed to fetch market indices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIndices();
    const interval = setInterval(() => fetchIndices(), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader
          title="시장 지수"
          icon={<Activity className="w-5 h-5 text-blue-500" aria-hidden="true" />}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
            >
              <Skeleton className="h-4 w-16 mb-3" />
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="시장 지수"
        titleAs="h2"
        subtitle="실시간 주요 지수 현황"
        icon={<Activity className="w-5 h-5 text-blue-500" aria-hidden="true" />}
        action={
          <Button
            variant="ghost"
            size="xs"
            onClick={() => fetchIndices(true)}
            loading={refreshing}
            aria-label="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        }
      />
      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4"
        role="list"
        aria-label="주요 시장 지수"
      >
        {indices.map((index, i) => {
          const isPositive = index.changePercent >= 0;
          return (
            <div
              key={index.symbol}
              role="listitem"
              className={classNames(
                'group relative p-3 sm:p-4 rounded-xl',
                'bg-gray-50 dark:bg-gray-800/50',
                'hover:bg-gray-100 dark:hover:bg-gray-700/50',
                'transition-all duration-200',
                'cursor-default'
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Top accent bar on hover */}
              <div
                className={classNames(
                  'absolute top-0 left-4 right-4 h-0.5 rounded-b',
                  'transform scale-x-0 group-hover:scale-x-100',
                  'transition-transform duration-200 origin-center',
                  isPositive ? 'bg-emerald-500' : 'bg-red-500'
                )}
                aria-hidden="true"
              />

              {/* Index name */}
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 truncate">
                {index.name}
              </p>

              {/* Value */}
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 font-tabular">
                {formatNumber(index.value, { maximumFractionDigits: 0 })}
              </p>

              {/* Change */}
              <div className="flex items-center gap-2">
                <div
                  className={classNames(
                    'flex items-center gap-1 text-sm font-medium',
                    getChangeColor(index.changePercent)
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    {isPositive ? '상승' : '하락'}
                  </span>
                </div>
                <TrendBadge
                  value={parseFloat(index.changePercent.toFixed(2))}
                  size="sm"
                />
              </div>

              {/* Accessibility: full info in sr-only */}
              <span className="sr-only">
                {index.name}: {formatNumber(index.value, { maximumFractionDigits: 0 })},
                {isPositive ? '상승' : '하락'} {formatPercent(index.changePercent)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
