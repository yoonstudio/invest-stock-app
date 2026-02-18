'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardHeader } from '@/components/ui/Card';
import { HoldingAnalysis } from '@/types';
import { formatPercent } from '@/lib/utils';

interface PerformanceChartProps {
  holdings: HoldingAnalysis[];
}

export function PerformanceChart({ holdings }: PerformanceChartProps) {
  const data = holdings
    .map((h) => ({
      name: h.name,
      return: Number(h.returnPercent.toFixed(2)),
    }))
    .sort((a, b) => b.return - a.return);

  return (
    <Card>
      <CardHeader title="종목별 수익률" subtitle="보유 종목 성과 비교" />

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: '#F9FAFB',
              }}
              formatter={(value) => [formatPercent(Number(value)), '수익률']}
            />
            <Bar dataKey="return" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.return >= 0 ? '#10B981' : '#EF4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
