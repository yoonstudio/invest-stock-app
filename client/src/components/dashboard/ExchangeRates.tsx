'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Loading';
import { getMainExchangeRates } from '@/lib/api';
import { ExchangeRate } from '@/types';
import { formatNumber, formatPercent, getChangeColor, classNames } from '@/lib/utils';

const currencyFlags: Record<string, string> = {
  USD: 'US',
  EUR: 'EU',
  JPY: 'JP',
  CNY: 'CN',
  GBP: 'GB',
};

const currencyNames: Record<string, string> = {
  USD: '미국 달러',
  EUR: '유로',
  JPY: '일본 엔',
  CNY: '중국 위안',
  GBP: '영국 파운드',
};

export function ExchangeRates() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const data = await getMainExchangeRates();
        setRates(data);
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader title="환율" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="환율"
        subtitle="원화 기준 실시간 환율"
        action={
          <Link href="/exchange">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              더보기
            </Button>
          </Link>
        }
      />

      <div className="space-y-2">
        {rates.map((rate) => (
          <div
            key={`${rate.from}-${rate.to}`}
            className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg">
                {rate.from === 'USD' && '$'}
                {rate.from === 'EUR' && '\u20AC'}
                {rate.from === 'JPY' && '\u00A5'}
                {rate.from === 'CNY' && '\u00A5'}
                {rate.from === 'GBP' && '\u00A3'}
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {rate.from}/{rate.to}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {currencyNames[rate.from]}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-900 dark:text-white">
                {formatNumber(rate.rate, { maximumFractionDigits: 2 })}
              </div>
              <div
                className={classNames(
                  'flex items-center justify-end gap-1 text-sm',
                  getChangeColor(rate.changePercent)
                )}
              >
                {rate.changePercent >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {formatPercent(rate.changePercent)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
