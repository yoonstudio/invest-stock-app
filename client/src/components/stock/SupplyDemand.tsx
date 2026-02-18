'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Badge } from '@/components/ui/Badge';
import { getSupplyDemand } from '@/lib/api';
import { SupplyDemand as SupplyDemandType } from '@/types';
import { formatLargeNumber, classNames } from '@/lib/utils';
import { Users } from 'lucide-react';

interface SupplyDemandProps {
  symbol: string;
}

export function SupplyDemand({ symbol }: SupplyDemandProps) {
  const [data, setData] = useState<SupplyDemandType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getSupplyDemand(symbol);
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
        <CardHeader title="Supply & Demand" icon={<Users className="w-5 h-5 text-orange-500" />} />
        <div className="flex justify-center py-8">
          <Loading size="md" />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader title="Supply & Demand" icon={<Users className="w-5 h-5 text-orange-500" />} />
        <p className="text-gray-500 dark:text-gray-400 text-sm py-4">
          {error || 'MCP server not connected. Supply/demand data requires the analyzer MCP server.'}
        </p>
      </Card>
    );
  }

  const renderInvestorRow = (
    label: string,
    investorData?: { buyVolume?: number; sellVolume?: number; netVolume?: number }
  ) => {
    if (!investorData) return null;
    const net = investorData.netVolume ?? 0;

    return (
      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          <span className={classNames(
            'text-sm font-bold',
            net > 0 ? 'text-green-600 dark:text-green-400' :
            net < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'
          )}>
            {net > 0 ? '+' : ''}{formatLargeNumber(net)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Buy</p>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              {investorData.buyVolume !== undefined ? formatLargeNumber(investorData.buyVolume) : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sell</p>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {investorData.sellVolume !== undefined ? formatLargeNumber(investorData.sellVolume) : '-'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader
        title="Supply & Demand"
        icon={<Users className="w-5 h-5 text-orange-500" />}
        action={
          data.trend ? (
            <Badge variant={
              data.trend.toLowerCase().includes('buy') ? 'success' :
              data.trend.toLowerCase().includes('sell') ? 'danger' : 'default'
            }>
              {data.trend}
            </Badge>
          ) : undefined
        }
      />

      <div className="space-y-3">
        {renderInvestorRow('Foreign Investors', data.foreign)}
        {renderInvestorRow('Institutional', data.institutional)}
        {renderInvestorRow('Individual', data.individual)}
      </div>

      {data.summary && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          {data.summary}
        </p>
      )}
    </Card>
  );
}
