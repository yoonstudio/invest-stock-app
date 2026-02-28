'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Badge } from '@/components/ui/Badge';
import { getSupplyDemand } from '@/lib/api';
import { classNames } from '@/lib/utils';
import { Users } from 'lucide-react';

interface SupplyDemandProps {
  symbol: string;
}

interface PeriodData {
  net5d: number;
  net20d: number;
  net60d: number;
}

interface SupplyDemandData {
  foreign: PeriodData;
  institutional: PeriodData;
  individual: PeriodData;
  trend: string;
  summary?: string;
}

function NetValue({ value }: { value: number }) {
  const color =
    value > 0 ? 'text-blue-600 dark:text-blue-400' :
    value < 0 ? 'text-red-600 dark:text-red-400' :
    'text-gray-500 dark:text-gray-400';
  const sign = value > 0 ? '+' : '';
  return (
    <span className={classNames('text-sm font-semibold tabular-nums', color)}>
      {sign}{value.toLocaleString('ko-KR')}
    </span>
  );
}

function InvestorRow({ label, data }: { label: string; data: PeriodData }) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-gray-400 mb-1">5일</p>
          <NetValue value={data.net5d} />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">20일</p>
          <NetValue value={data.net20d} />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">60일</p>
          <NetValue value={data.net60d} />
        </div>
      </div>
    </div>
  );
}

export function SupplyDemand({ symbol }: SupplyDemandProps) {
  const [data, setData] = useState<SupplyDemandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getSupplyDemand(symbol);
        setData(result as unknown as SupplyDemandData);
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
        <CardHeader title="수급 분석" icon={<Users className="w-5 h-5 text-orange-500" />} />
        <div className="flex justify-center py-8">
          <Loading size="md" />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader title="수급 분석" icon={<Users className="w-5 h-5 text-orange-500" />} />
        <p className="text-gray-500 dark:text-gray-400 text-sm py-4">
          {error || 'MCP 서버에서 수급 데이터를 불러올 수 없습니다.'}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="수급 분석"
        icon={<Users className="w-5 h-5 text-orange-500" />}
        action={
          data.trend ? (
            <Badge variant={
              data.trend.toLowerCase() === 'buy' ? 'success' :
              data.trend.toLowerCase() === 'sell' ? 'danger' : 'default'
            }>
              {data.trend === 'Buy' ? '매수 우세' : data.trend === 'Sell' ? '매도 우세' : '중립'}
            </Badge>
          ) : undefined
        }
      />

      <div className="mb-3 grid grid-cols-3 gap-2 text-center px-1">
        {['5일', '20일', '60일'].map((label) => (
          <p key={label} className="text-xs font-medium text-gray-400">{label} 순매수(원)</p>
        ))}
      </div>

      <div className="space-y-3">
        <InvestorRow label="외국인" data={data.foreign} />
        <InvestorRow label="기관" data={data.institutional} />
        <InvestorRow label="개인" data={data.individual} />
      </div>

      {data.summary && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          {data.summary}
        </p>
      )}
    </Card>
  );
}
