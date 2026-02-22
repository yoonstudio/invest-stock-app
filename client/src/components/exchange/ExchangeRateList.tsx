'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Loading';
import { getMainExchangeRates } from '@/lib/api';
import { ExchangeRate } from '@/types';
import { formatNumber, formatPercent, getChangeColor, classNames } from '@/lib/utils';

const currencyInfo: Record<string, { name: string; flag: string }> = {
  USD: { name: '미국 달러', flag: 'US' },
  EUR: { name: '유로', flag: 'EU' },
  JPY: { name: '일본 엔', flag: 'JP' },
  CNY: { name: '중국 위안', flag: 'CN' },
  GBP: { name: '영국 파운드', flag: 'GB' },
};

export function ExchangeRateList() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchRates = async () => {
    try {
      const data = await getMainExchangeRates();
      setRates(data);
      setLastUpdated(new Date().toLocaleString('ko-KR'));
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRates();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="주요 환율" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="주요 환율"
        subtitle="원화(KRW) 기준 실시간 환율"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        }
      />

      <div className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                통화
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                환율
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                변동
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                등락률
              </th>
            </tr>
          </thead>
          <tbody>
            {rates.map((rate) => {
              const info = currencyInfo[rate.from];
              return (
                <tr
                  key={`${rate.from}-${rate.to}`}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl">
                        {rate.from === 'USD' && '\uD83C\uDDFA\uD83C\uDDF8'}
                        {rate.from === 'EUR' && '\uD83C\uDDEA\uD83C\uDDFA'}
                        {rate.from === 'JPY' && '\uD83C\uDDEF\uD83C\uDDF5'}
                        {rate.from === 'CNY' && '\uD83C\uDDE8\uD83C\uDDF3'}
                        {rate.from === 'GBP' && '\uD83C\uDDEC\uD83C\uDDE7'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {rate.from}/{rate.to}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {info?.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatNumber(rate.rate, { maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      원
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div
                      className={classNames(
                        'font-medium',
                        getChangeColor(rate.change)
                      )}
                    >
                      {rate.change >= 0 ? '+' : ''}
                      {formatNumber(rate.change, { maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div
                      className={classNames(
                        'flex items-center justify-end gap-1 font-medium',
                        getChangeColor(rate.changePercent)
                      )}
                    >
                      {rate.changePercent >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {formatPercent(rate.changePercent)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {lastUpdated && (
        <div className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
          마지막 업데이트: {lastUpdated}
        </div>
      )}
    </Card>
  );
}
