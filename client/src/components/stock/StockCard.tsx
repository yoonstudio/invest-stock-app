'use client';

import Link from 'next/link';
import { Star, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge, TrendBadge } from '@/components/ui/Badge';
import { StockPrice } from '@/types';
import { useWatchlistStore } from '@/lib/store';
import {
  formatCurrency,
  formatPercent,
  getChangeColor,
  classNames,
  getStockCurrency,
  isKoreanStock,
} from '@/lib/utils';

interface StockCardProps {
  stock: StockPrice;
  /** 컴팩트 모드 */
  compact?: boolean;
}

export function StockCard({ stock, compact = false }: StockCardProps) {
  const { isWatching, addSymbol, removeSymbol } = useWatchlistStore();
  const watching = isWatching(stock.symbol);
  const currency = getStockCurrency(stock.symbol);
  const isPositive = stock.changePercent >= 0;

  const handleToggleWatch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (watching) {
      removeSymbol(stock.symbol);
    } else {
      addSymbol(stock.symbol);
    }
  };

  if (compact) {
    return (
      <Link href={`/stocks/${encodeURIComponent(stock.symbol)}`}>
        <div
          className={classNames(
            'group flex items-center gap-4 p-3 rounded-xl',
            'bg-white dark:bg-gray-800',
            'border border-gray-200 dark:border-gray-700',
            'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600',
            'transition-all duration-200',
            'focus-visible:ring-2 focus-visible:ring-blue-500'
          )}
        >
          {/* Stock info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 dark:text-white truncate">
                {stock.name}
              </p>
              {isKoreanStock(stock.symbol) && (
                <Badge variant="info" size="xs">KRX</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stock.symbol}</p>
          </div>

          {/* Price */}
          <div className="text-right">
            <p className="font-semibold text-gray-900 dark:text-white font-tabular">
              {formatCurrency(stock.currentPrice, currency)}
            </p>
            <div className={classNames('flex items-center justify-end gap-1 text-sm', getChangeColor(stock.changePercent))}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{formatPercent(stock.changePercent)}</span>
            </div>
          </div>

          {/* Arrow */}
          <ArrowRight
            className="w-4 h-4 text-gray-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
            aria-hidden="true"
          />
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/stocks/${encodeURIComponent(stock.symbol)}`}>
      <Card
        hover
        interactive
        className="h-full group"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {stock.name}
              </h3>
              <Badge variant={isKoreanStock(stock.symbol) ? 'info' : 'default'} size="xs">
                {isKoreanStock(stock.symbol) ? 'KRX' : 'US'}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {stock.symbol}
            </p>
          </div>

          {/* Watch button */}
          <button
            onClick={handleToggleWatch}
            className={classNames(
              'p-2 rounded-full transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              watching
                ? 'text-amber-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                : 'text-gray-300 hover:text-gray-400 hover:bg-gray-100 dark:text-gray-600 dark:hover:text-gray-500 dark:hover:bg-gray-700'
            )}
            aria-label={watching ? '관심 종목에서 제거' : '관심 종목에 추가'}
            aria-pressed={watching}
          >
            <Star
              className={classNames('w-5 h-5 transition-transform', watching && 'fill-current scale-110')}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Current Price */}
        <div className="mb-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white font-tabular">
            {formatCurrency(stock.currentPrice, currency)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div
              className={classNames(
                'flex items-center gap-1 text-sm font-medium',
                getChangeColor(stock.changePercent)
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-4 h-4" aria-hidden="true" />
              ) : (
                <TrendingDown className="w-4 h-4" aria-hidden="true" />
              )}
              <span className="font-tabular">
                {isPositive ? '+' : ''}
                {formatCurrency(stock.change, currency)}
              </span>
            </div>
            <TrendBadge value={parseFloat(stock.changePercent.toFixed(2))} size="sm" />
          </div>
        </div>

        {/* 52-week range */}
        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">52주 최고</span>
            <span className="font-medium text-gray-900 dark:text-white font-tabular">
              {formatCurrency(stock.high52Week, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">52주 최저</span>
            <span className="font-medium text-gray-900 dark:text-white font-tabular">
              {formatCurrency(stock.low52Week, currency)}
            </span>
          </div>

          {/* Price position indicator */}
          <div className="pt-2">
            <div className="relative h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-400 via-gray-300 to-emerald-400 dark:from-red-500 dark:via-gray-500 dark:to-emerald-500"
                style={{ width: '100%' }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                style={{
                  left: `${Math.min(Math.max(((stock.currentPrice - stock.low52Week) / (stock.high52Week - stock.low52Week)) * 100, 0), 100)}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                aria-hidden="true"
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center">
              52주 가격 범위 내 현재 위치
            </p>
          </div>
        </div>

        {/* Hover indicator */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-b-xl"
          aria-hidden="true"
        />
      </Card>
    </Link>
  );
}

// 주식 리스트 아이템 (테이블 행 스타일)
interface StockListItemProps {
  stock: StockPrice;
  showWatchButton?: boolean;
}

export function StockListItem({ stock, showWatchButton = true }: StockListItemProps) {
  const { isWatching, addSymbol, removeSymbol } = useWatchlistStore();
  const watching = isWatching(stock.symbol);
  const currency = getStockCurrency(stock.symbol);

  const handleToggleWatch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (watching) {
      removeSymbol(stock.symbol);
    } else {
      addSymbol(stock.symbol);
    }
  };

  return (
    <Link href={`/stocks/${encodeURIComponent(stock.symbol)}`}>
      <div
        className={classNames(
          'group flex items-center gap-4 px-4 py-3 -mx-4',
          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          'transition-colors',
          'border-b border-gray-100 dark:border-gray-800 last:border-0'
        )}
      >
        {/* Watch button */}
        {showWatchButton && (
          <button
            onClick={handleToggleWatch}
            className={classNames(
              'p-1.5 rounded-full transition-colors flex-shrink-0',
              watching
                ? 'text-amber-400'
                : 'text-gray-300 dark:text-gray-600 group-hover:text-gray-400'
            )}
            aria-label={watching ? '관심 종목에서 제거' : '관심 종목에 추가'}
          >
            <Star className={classNames('w-4 h-4', watching && 'fill-current')} />
          </button>
        )}

        {/* Stock info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate">
            {stock.name}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{stock.symbol}</p>
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0">
          <p className="font-semibold text-gray-900 dark:text-white font-tabular">
            {formatCurrency(stock.currentPrice, currency)}
          </p>
          <p className={classNames('text-sm font-tabular', getChangeColor(stock.changePercent))}>
            {formatPercent(stock.changePercent)}
          </p>
        </div>

        {/* Arrow */}
        <ArrowRight
          className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
