'use client';

import Link from 'next/link';
import { Shield, TrendingUp, CheckCircle2, ChevronRight } from 'lucide-react';
import { RecommendedStock } from '@/types';
import { classNames, isKoreanStock } from '@/lib/utils';

interface RecommendationCardProps {
  stock: RecommendedStock;
  rank: number;
}

function MetricBadge({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={classNames(
        'flex flex-col items-center px-3 py-2 rounded-lg',
        highlight
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
          : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700'
      )}
    >
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      <span
        className={classNames(
          'text-sm font-bold mt-0.5',
          highlight
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-gray-800 dark:text-gray-200'
        )}
      >
        {value}
      </span>
    </div>
  );
}

const RANK_COLORS: Record<number, string> = {
  1: 'bg-yellow-400 text-yellow-900',
  2: 'bg-gray-300 text-gray-800',
  3: 'bg-amber-600 text-amber-50',
};

export function RecommendationCard({ stock, rank }: RecommendationCardProps) {
  const isKorean = isKoreanStock(stock.symbol);
  const rankColor = RANK_COLORS[rank] ?? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';

  return (
    <Link href={`/stocks/${encodeURIComponent(stock.symbol)}`}>
      <div
        className={classNames(
          'group relative flex flex-col gap-4 p-5 rounded-2xl',
          'bg-white dark:bg-gray-800',
          'border border-gray-200 dark:border-gray-700',
          'hover:border-blue-300 dark:hover:border-blue-600',
          'hover:shadow-lg dark:hover:shadow-blue-900/20',
          'transition-all duration-200 cursor-pointer',
          'overflow-hidden'
        )}
      >
        {/* Rank & Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={classNames(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold flex-shrink-0',
                rankColor
              )}
            >
              {rank}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                  {stock.name}
                </h3>
                <span
                  className={classNames(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    isKorean
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                  )}
                >
                  {isKorean ? 'KRX' : 'US'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400 dark:text-gray-500">{stock.symbol}</span>
                <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {stock.sector}
                </span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-1 group-hover:text-blue-400 transition-colors" />
        </div>

        {/* Moat Description */}
        <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2.5">
          <Shield className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{stock.moat}</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-2">
          <MetricBadge label="ROE" value={`${stock.metrics.roe.toFixed(1)}%`} highlight />
          <MetricBadge
            label="PER할인"
            value={`-${stock.metrics.perDiscount.toFixed(0)}%`}
            highlight
          />
          <MetricBadge
            label="PBR할인"
            value={`-${stock.metrics.pbrDiscount.toFixed(0)}%`}
            highlight
          />
          <MetricBadge
            label="EPS CAGR"
            value={`${stock.metrics.epsCAGR.toFixed(1)}%`}
            highlight
          />
        </div>

        {/* Criteria Passed */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              통과 기준
            </span>
          </div>
          {stock.passedCriteria.map((criteria, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
                {criteria}
              </span>
            </div>
          ))}
        </div>

        {/* Hover gradient bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
