'use client';

import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { HoldingAnalysis } from '@/types';
import {
  formatCurrency,
  formatPercent,
  getChangeColor,
  classNames,
  getStockCurrency,
} from '@/lib/utils';

interface HoldingsTableProps {
  holdings: HoldingAnalysis[];
  onRemove: (symbol: string) => void;
}

export function HoldingsTable({ holdings, onRemove }: HoldingsTableProps) {
  return (
    <Card>
      <CardHeader
        title="보유 종목"
        subtitle={`${holdings.length}개 종목`}
      />

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                종목
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                수량
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                평균 단가
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                현재가
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                평가 금액
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                손익
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                비중
              </th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => {
              const currency = getStockCurrency(holding.symbol);
              return (
                <tr
                  key={holding.symbol}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {holding.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {holding.symbol}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right text-gray-900 dark:text-white">
                    {holding.quantity.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-right text-gray-900 dark:text-white">
                    {formatCurrency(holding.avgPrice, currency)}
                  </td>
                  <td className="py-4 px-4 text-right text-gray-900 dark:text-white">
                    {formatCurrency(holding.currentPrice, currency)}
                  </td>
                  <td className="py-4 px-4 text-right font-medium text-gray-900 dark:text-white">
                    {formatCurrency(holding.value, currency)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div
                      className={classNames(
                        'flex items-center justify-end gap-1 font-medium',
                        getChangeColor(holding.returnPercent)
                      )}
                    >
                      {holding.returnPercent >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <div>
                        <div>{formatCurrency(holding.return, currency)}</div>
                        <div className="text-sm">
                          {formatPercent(holding.returnPercent)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right text-gray-900 dark:text-white">
                    {holding.weight.toFixed(1)}%
                  </td>
                  <td className="py-4 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(holding.symbol)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
