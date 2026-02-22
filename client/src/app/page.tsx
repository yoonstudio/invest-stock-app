'use client';

import { useState, useEffect } from 'react';
import { MarketIndices } from '@/components/dashboard/MarketIndices';
import { Watchlist } from '@/components/dashboard/Watchlist';
import { PortfolioSummary } from '@/components/dashboard/PortfolioSummary';
import { ExchangeRates } from '@/components/dashboard/ExchangeRates';
import { NewsWidget } from '@/components/dashboard/NewsWidget';
import { PageHeader } from '@/components/layout/MainLayout';
import { TrendingUp, Clock } from 'lucide-react';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
  }, []);

  const greeting = now ? getGreeting(now.getHours()) : '안녕하세요';
  const formattedDate = now
    ? now.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      })
    : '';

  return (
    <div className="space-y-6">
      {/* Page Header with greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <time dateTime={now?.toISOString()}>{formattedDate}</time>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {greeting}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            오늘의 투자 현황을 확인하세요.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm">
          <TrendingUp className="w-4 h-4" aria-hidden="true" />
          <span>시장이 개장 중입니다</span>
        </div>
      </div>

      {/* Market Indices - Full width */}
      <section aria-labelledby="market-indices-heading">
        <h2 id="market-indices-heading" className="sr-only">
          시장 지수
        </h2>
        <MarketIndices />
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Watchlist and Portfolio */}
        <div className="lg:col-span-2 space-y-6">
          {/* Watchlist and Portfolio Summary side by side on medium screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section aria-labelledby="watchlist-heading">
              <Watchlist />
            </section>
            <section aria-labelledby="portfolio-summary-heading">
              <PortfolioSummary />
            </section>
          </div>

          {/* News Widget */}
          <section aria-labelledby="news-heading">
            <NewsWidget />
          </section>
        </div>

        {/* Right Column - Exchange Rates */}
        <aside aria-labelledby="exchange-rates-heading">
          <ExchangeRates />
        </aside>
      </div>
    </div>
  );
}

function getGreeting(hour: number): string {
  if (hour < 6) return '좋은 밤입니다';
  if (hour < 12) return '좋은 아침입니다';
  if (hour < 18) return '좋은 오후입니다';
  return '좋은 저녁입니다';
}
