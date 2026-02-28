'use client';

import { Card, CardHeader } from '@/components/ui/Card';
import { StockPrice } from '@/types';
import {
  formatCurrency,
  formatLargeNumber,
  formatNumber,
  getStockCurrency,
} from '@/lib/utils';

interface StockInfoProps {
  stock: StockPrice;
}

export function StockInfo({ stock }: StockInfoProps) {
  const currency = getStockCurrency(stock.symbol);

  const infoItems = [
    {
      label: '현재가',
      value: formatCurrency(stock.currentPrice, currency),
    },
    {
      label: '전일대비',
      value: `${stock.change >= 0 ? '+' : ''}${formatCurrency(stock.change, currency)}`,
    },
    {
      label: '등락률',
      value: `${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%`,
    },
    {
      label: '거래량',
      value: formatLargeNumber(stock.volume),
    },
    {
      label: '시가총액',
      value: formatLargeNumber(stock.marketCap),
    },
    {
      label: '52주 최고',
      value: formatCurrency(stock.high52Week, currency),
    },
    {
      label: '52주 최저',
      value: formatCurrency(stock.low52Week, currency),
    },
    {
      label: '업데이트',
      value: new Date(stock.timestamp).toLocaleTimeString('ko-KR'),
    },
  ];

  return (
    <Card>
      <CardHeader title="종목 정보" />
      <div className="grid grid-cols-2 gap-4">
        {infoItems.map((item) => (
          <div key={item.label} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {item.label}
            </div>
            <div className="font-medium text-gray-900 dark:text-white mt-1">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
