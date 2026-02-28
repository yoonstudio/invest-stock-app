'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Badge } from '@/components/ui/Badge';
import { getTechnicalIndicators } from '@/lib/api';
import { TechnicalIndicators } from '@/types';
import { formatNumber, classNames } from '@/lib/utils';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TechnicalAnalysisProps {
  symbol: string;
}

export function TechnicalAnalysis({ symbol }: TechnicalAnalysisProps) {
  const [data, setData] = useState<TechnicalIndicators | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getTechnicalIndicators(symbol);
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
        <CardHeader title="Technical Analysis" icon={<Activity className="w-5 h-5 text-blue-500" />} />
        <div className="flex justify-center py-8">
          <Loading size="md" />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader title="Technical Analysis" icon={<Activity className="w-5 h-5 text-blue-500" />} />
        <p className="text-gray-500 dark:text-gray-400 text-sm py-4">
          {error || 'MCP server not connected. Technical analysis requires the analyzer MCP server.'}
        </p>
      </Card>
    );
  }

  const signalIcon = (signal?: string) => {
    const s = (signal ?? '').toLowerCase();
    if (s.includes('buy') || s.includes('bullish') || s.includes('positive')) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    }
    if (s.includes('sell') || s.includes('bearish') || s.includes('negative')) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const signalBadge = (signal?: string) => {
    const s = (signal ?? '').toLowerCase();
    if (s.includes('buy') || s.includes('bullish')) return 'success';
    if (s.includes('sell') || s.includes('bearish')) return 'danger';
    return 'default';
  };

  return (
    <Card>
      <CardHeader
        title="Technical Analysis"
        icon={<Activity className="w-5 h-5 text-blue-500" />}
        action={
          data.signal ? (
            <Badge variant={signalBadge(data.signal) as 'success' | 'danger' | 'default'}>
              {data.signal}
            </Badge>
          ) : undefined
        }
      />

      <div className="space-y-4">
        {/* RSI */}
        {data.rsi !== undefined && (
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              {signalIcon(data.rsiSignal)}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">RSI (14)</span>
            </div>
            <div className="text-right">
              <span className={classNames(
                'text-lg font-bold',
                data.rsi > 70 ? 'text-red-500' : data.rsi < 30 ? 'text-green-500' : 'text-gray-900 dark:text-white'
              )}>
                {formatNumber(data.rsi)}
              </span>
              {data.rsiSignal && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{data.rsiSignal}</p>
              )}
            </div>
          </div>
        )}

        {/* MACD */}
        {data.macd && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {signalIcon(data.macd.histogram > 0 ? 'bullish' : 'bearish')}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">MACD</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">MACD</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatNumber(data.macd.macd)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Signal</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatNumber(data.macd.signal)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Histogram</p>
                <p className={classNames(
                  'text-sm font-semibold',
                  data.macd.histogram >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {formatNumber(data.macd.histogram)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Moving Averages */}
        {data.movingAverages && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Moving Averages</p>
            <div className="grid grid-cols-2 gap-2">
              {data.movingAverages.ma5 !== undefined && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">MA5</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(data.movingAverages.ma5)}</span>
                </div>
              )}
              {data.movingAverages.ma20 !== undefined && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">MA20</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(data.movingAverages.ma20)}</span>
                </div>
              )}
              {data.movingAverages.ma60 !== undefined && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">MA60</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(data.movingAverages.ma60)}</span>
                </div>
              )}
              {data.movingAverages.ma120 !== undefined && (
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">MA120</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(data.movingAverages.ma120)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bollinger Bands */}
        {data.bollingerBands && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bollinger Bands</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Upper</span>
                <span className="text-sm font-medium text-red-500">{formatNumber(data.bollingerBands.upper)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Middle</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(data.bollingerBands.middle)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Lower</span>
                <span className="text-sm font-medium text-green-500">{formatNumber(data.bollingerBands.lower)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Volatility */}
        {(data as Record<string, unknown>).volatility && (() => {
          const v = (data as Record<string, unknown>).volatility as Record<string, number>;
          return (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">변동성 & 리스크</p>
              <div className="grid grid-cols-2 gap-2">
                {v.daily !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">일 변동성</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(v.daily)}%</span>
                  </div>
                )}
                {v.annual !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">연 변동성</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(v.annual)}%</span>
                  </div>
                )}
                {v.sharpeRatio !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">샤프비율</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(v.sharpeRatio)}</span>
                  </div>
                )}
                {v.maxDrawdown !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">최대낙폭</span>
                    <span className="text-sm font-medium text-red-500">{formatNumber(v.maxDrawdown)}%</span>
                  </div>
                )}
                {v.beta !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">베타</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(v.beta)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Summary */}
        {data.summary && (
          <p className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            {data.summary}
          </p>
        )}
      </div>
    </Card>
  );
}
