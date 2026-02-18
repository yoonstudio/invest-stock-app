'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { getFinancialData } from '@/lib/api';
import { FinancialData } from '@/types';
import { formatNumber, formatLargeNumber, classNames } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';

interface FinancialMetricsProps {
  symbol: string;
}

export function FinancialMetrics({ symbol }: FinancialMetricsProps) {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getFinancialData(symbol);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [symbol]);

  if (loading) {
    return (
      <Card>
        <CardHeader title="Financial Data" icon={<BarChart3 className="w-5 h-5 text-emerald-500" />} />
        <div className="flex justify-center py-8">
          <Loading size="md" />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader title="Financial Data" icon={<BarChart3 className="w-5 h-5 text-emerald-500" />} />
        <p className="text-gray-500 dark:text-gray-400 text-sm py-4">
          {error || 'MCP server not connected. Financial data requires the analyzer MCP server.'}
        </p>
      </Card>
    );
  }

  const metrics = [
    { label: 'PER', value: data.per, format: (v: number) => formatNumber(v, { maximumFractionDigits: 1 }) + 'x' },
    { label: 'PBR', value: data.pbr, format: (v: number) => formatNumber(v, { maximumFractionDigits: 2 }) + 'x' },
    { label: 'EPS', value: data.eps, format: (v: number) => formatNumber(v, { maximumFractionDigits: 0 }) },
    { label: 'ROE', value: data.roe, format: (v: number) => formatNumber(v, { maximumFractionDigits: 1 }) + '%' },
    { label: 'ROA', value: data.roa, format: (v: number) => formatNumber(v, { maximumFractionDigits: 1 }) + '%' },
    { label: 'Debt Ratio', value: data.debtRatio, format: (v: number) => formatNumber(v, { maximumFractionDigits: 1 }) + '%' },
    { label: 'Operating Margin', value: data.operatingMargin, format: (v: number) => formatNumber(v, { maximumFractionDigits: 1 }) + '%' },
    { label: 'Net Margin', value: data.netMargin, format: (v: number) => formatNumber(v, { maximumFractionDigits: 1 }) + '%' },
    { label: 'Dividend Yield', value: data.dividendYield, format: (v: number) => formatNumber(v, { maximumFractionDigits: 2 }) + '%' },
  ].filter(m => m.value !== undefined && m.value !== null);

  return (
    <Card>
      <CardHeader title="Financial Data" icon={<BarChart3 className="w-5 h-5 text-emerald-500" />} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{metric.label}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {metric.format(metric.value!)}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue / Profit */}
      {(data.revenue || data.operatingProfit || data.netIncome) && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Income Statement</p>
          <div className="space-y-2">
            {data.revenue !== undefined && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Revenue</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatLargeNumber(data.revenue)}</span>
              </div>
            )}
            {data.operatingProfit !== undefined && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Operating Profit</span>
                <span className={classNames(
                  'text-sm font-medium',
                  data.operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {formatLargeNumber(data.operatingProfit)}
                </span>
              </div>
            )}
            {data.netIncome !== undefined && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Net Income</span>
                <span className={classNames(
                  'text-sm font-medium',
                  data.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {formatLargeNumber(data.netIncome)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {data.summary && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          {data.summary}
        </p>
      )}
    </Card>
  );
}
