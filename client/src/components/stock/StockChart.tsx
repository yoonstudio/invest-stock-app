'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Loading';
import { getStockChart } from '@/lib/api';
import { ChartDataPoint } from '@/types';
import { formatCurrency, classNames, getStockCurrency } from '@/lib/utils';

interface StockChartProps {
  symbol: string;
}

const periods = [
  { label: '1일', value: '1d' },
  { label: '1주', value: '5d' },
  { label: '1개월', value: '1mo' },
  { label: '3개월', value: '3mo' },
  { label: '1년', value: '1y' },
];

export function StockChart({ symbol }: StockChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('1mo');

  useEffect(() => {
    const fetchChart = async () => {
      setLoading(true);
      try {
        const chartData = await getStockChart(symbol, period);
        setData(chartData);
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChart();
  }, [symbol, period]);

  const currency = getStockCurrency(symbol);
  const isPositive = data.length > 0 && data[data.length - 1].close >= data[0].close;

  if (loading) {
    return (
      <Card>
        <CardHeader title="가격 차트" />
        <Skeleton className="h-[300px] w-full" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="가격 차트"
        action={
          <div className="flex gap-1">
            {periods.map((p) => (
              <Button
                key={p.value}
                variant={period === p.value ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        }
      />

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={isPositive ? '#10B981' : '#EF4444'}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={isPositive ? '#10B981' : '#EF4444'}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                currency === 'KRW'
                  ? `${(value / 1000).toFixed(0)}K`
                  : `$${value.toFixed(0)}`
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: '#F9FAFB',
              }}
              formatter={(value) => [
                formatCurrency(Number(value), currency),
                '종가',
              ]}
              labelFormatter={(label) => `날짜: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke={isPositive ? '#10B981' : '#EF4444'}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPrice)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
