'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader } from '@/components/ui/Card';

interface AllocationChartProps {
  allocation: Record<string, number>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const sectorNames: Record<string, string> = {
  technology: '기술',
  finance: '금융',
  healthcare: '헬스케어',
  consumer: '소비재',
  energy: '에너지',
  industrials: '산업재',
  materials: '소재',
  utilities: '유틸리티',
};

export function AllocationChart({ allocation }: AllocationChartProps) {
  const data = Object.entries(allocation).map(([key, value]) => ({
    name: sectorNames[key] || key,
    value,
  }));

  return (
    <Card>
      <CardHeader title="자산 배분" subtitle="섹터별 투자 비중" />

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, value }) => `${name} ${value}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                color: '#F9FAFB',
              }}
              formatter={(value) => [`${value}%`, '비중']}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
