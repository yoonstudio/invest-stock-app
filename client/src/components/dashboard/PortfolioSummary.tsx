'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Briefcase, TrendingUp, TrendingDown, ArrowRight, PieChart } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Loading';
import { Badge, TrendBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Loading';
import { NoPortfolio } from '@/components/ui/EmptyState';
import { analyzePortfolio } from '@/lib/api';
import { usePortfolioStore } from '@/lib/store';
import { PortfolioAnalysis } from '@/types';
import {
  formatCurrency,
  formatPercent,
  getChangeColor,
  classNames,
} from '@/lib/utils';

// 고정 색상 팔레트
const COLORS = [
  'hsl(210, 70%, 50%)', // Blue
  'hsl(160, 60%, 45%)', // Green
  'hsl(280, 60%, 55%)', // Purple
  'hsl(30, 80%, 55%)',  // Orange
  'hsl(340, 65%, 55%)', // Pink
  'hsl(190, 70%, 45%)', // Cyan
];

export function PortfolioSummary() {
  const { holdings } = usePortfolioStore();
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (holdings.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const data = await analyzePortfolio(holdings);
        setAnalysis(data);
      } catch (error) {
        console.error('Failed to analyze portfolio:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [holdings]);

  // 색상 인덱스를 메모이제이션
  const holdingColors = useMemo(() => {
    if (!analysis) return {};
    return analysis.holdings.reduce((acc, holding, index) => {
      acc[holding.symbol] = COLORS[index % COLORS.length];
      return acc;
    }, {} as Record<string, string>);
  }, [analysis]);

  if (loading) {
    return (
      <Card>
        <CardHeader
          title="포트폴리오 요약"
          icon={<Briefcase className="w-5 h-5 text-blue-500" aria-hidden="true" />}
        />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8" circle />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!analysis || holdings.length === 0) {
    return (
      <Card>
        <CardHeader
          title="포트폴리오 요약"
          icon={<Briefcase className="w-5 h-5 text-blue-500" aria-hidden="true" />}
        />
        <NoPortfolio onAdd={() => window.location.href = '/portfolio'} />
      </Card>
    );
  }

  const isPositive = analysis.totalReturnPercent >= 0;

  return (
    <Card>
      <CardHeader
        title="포트폴리오 요약"
        titleAs="h2"
        icon={<Briefcase className="w-5 h-5 text-blue-500" aria-hidden="true" />}
        action={
          <Link href="/portfolio">
            <Button variant="ghost" size="xs" rightIcon={<ArrowRight className="w-4 h-4" />}>
              상세
            </Button>
          </Link>
        }
      />

      {/* Total Value Card */}
      <div
        className={classNames(
          'mb-6 p-4 rounded-xl',
          'bg-gradient-to-br',
          isPositive
            ? 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20'
            : 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20'
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">총 평가금액</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white font-tabular">
              {formatCurrency(analysis.totalValue)}
            </p>
          </div>
          <div
            className={classNames(
              'p-2 rounded-lg',
              isPositive
                ? 'bg-emerald-100 dark:bg-emerald-800/30'
                : 'bg-red-100 dark:bg-red-800/30'
            )}
          >
            {isPositive ? (
              <TrendingUp
                className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
            ) : (
              <TrendingDown
                className="w-5 h-5 text-red-600 dark:text-red-400"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TrendBadge
            value={parseFloat(analysis.totalReturnPercent.toFixed(2))}
            size="md"
          />
          <span className={classNames('text-sm font-medium font-tabular', getChangeColor(analysis.totalReturn))}>
            {isPositive ? '+' : ''}{formatCurrency(analysis.totalReturn)}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">투자 원금</p>
          <p className="font-semibold text-gray-900 dark:text-white font-tabular">
            {formatCurrency(analysis.totalCost)}
          </p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">보유 종목</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {analysis.holdings.length}개
          </p>
        </div>
      </div>

      {/* Portfolio Composition Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            자산 구성
          </span>
          <PieChart className="w-4 h-4 text-gray-400" aria-hidden="true" />
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
          {analysis.holdings.map((holding) => (
            <div
              key={holding.symbol}
              className="transition-all duration-500"
              style={{
                width: `${holding.weight}%`,
                backgroundColor: holdingColors[holding.symbol],
              }}
              title={`${holding.name}: ${holding.weight.toFixed(1)}%`}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      {/* Top Holdings */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          상위 보유 종목
        </p>
        <div className="space-y-2">
          {analysis.holdings.slice(0, 3).map((holding) => (
            <Link
              key={holding.symbol}
              href={`/stocks/${encodeURIComponent(holding.symbol)}`}
              className={classNames(
                'group flex items-center gap-3 p-2 rounded-lg -mx-2',
                'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                'transition-colors'
              )}
            >
              {/* Color indicator */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: holdingColors[holding.symbol] }}
                aria-hidden="true"
              >
                {holding.symbol.slice(0, 2).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {holding.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{holding.symbol}</span>
                  <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                  <span>{holding.weight.toFixed(1)}%</span>
                </div>
              </div>

              {/* Return */}
              <div className="text-right flex-shrink-0">
                <TrendBadge
                  value={parseFloat(holding.returnPercent.toFixed(2))}
                  size="sm"
                />
              </div>

              {/* Arrow */}
              <ArrowRight
                className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
