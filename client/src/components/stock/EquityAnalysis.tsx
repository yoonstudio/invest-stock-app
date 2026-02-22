'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Badge } from '@/components/ui/Badge';
import { analyzeEquity } from '@/lib/api';
import { EquityAnalysis as EquityAnalysisType } from '@/types';
import { classNames } from '@/lib/utils';
import { Brain } from 'lucide-react';

interface EquityAnalysisProps {
  symbol: string;
}

export function EquityAnalysis({ symbol }: EquityAnalysisProps) {
  const [data, setData] = useState<EquityAnalysisType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await analyzeEquity(symbol);
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
        <CardHeader title="Guru Analysis" icon={<Brain className="w-5 h-5 text-purple-500" />} />
        <div className="flex justify-center py-8">
          <Loading size="md" />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader title="Guru Analysis" icon={<Brain className="w-5 h-5 text-purple-500" />} />
        <p className="text-gray-500 dark:text-gray-400 text-sm py-4">
          {error || 'MCP server not connected. Guru analysis requires the analyzer MCP server.'}
        </p>
      </Card>
    );
  }

  const getVerdictColor = (verdict?: string) => {
    const v = (verdict ?? '').toLowerCase();
    if (v.includes('buy') || v.includes('pass') || v.includes('positive')) return 'success';
    if (v.includes('sell') || v.includes('fail') || v.includes('negative')) return 'danger';
    return 'warning';
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card>
      <CardHeader
        title="Guru Analysis"
        icon={<Brain className="w-5 h-5 text-purple-500" />}
        action={
          data.overallVerdict ? (
            <Badge variant={getVerdictColor(data.overallVerdict) as 'success' | 'danger' | 'warning'}>
              {data.overallVerdict}
            </Badge>
          ) : undefined
        }
      />

      {/* Overall Score */}
      {data.overallScore !== undefined && (
        <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Overall Score</p>
          <p className={classNames('text-4xl font-bold', getScoreColor(data.overallScore))}>
            {data.overallScore}
            <span className="text-lg text-gray-400">/100</span>
          </p>
        </div>
      )}

      {/* Individual Guru Analyses */}
      {data.analyses && data.analyses.length > 0 && (
        <div className="space-y-3">
          {data.analyses.map((analysis, idx) => (
            <div
              key={idx}
              className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {analysis.guru}
                </span>
                <div className="flex items-center gap-2">
                  {analysis.score !== undefined && (
                    <span className={classNames('text-sm font-bold', getScoreColor(analysis.score))}>
                      {analysis.score}
                    </span>
                  )}
                  {analysis.verdict && (
                    <Badge
                      variant={getVerdictColor(analysis.verdict) as 'success' | 'danger' | 'warning'}
                      size="sm"
                    >
                      {analysis.verdict}
                    </Badge>
                  )}
                </div>
              </div>
              {/* Score bar */}
              {analysis.score !== undefined && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                  <div
                    className={classNames(
                      'h-1.5 rounded-full',
                      analysis.score >= 70 ? 'bg-green-500' :
                      analysis.score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                    )}
                    style={{ width: `${Math.min(100, analysis.score)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary text - rendered as preformatted markdown lines */}
      {data.summary && (
        <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          {data.summary.split('\n').map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={i} className="h-2" />;
            if (trimmed.startsWith('# ')) {
              return <p key={i} className="text-base font-bold text-gray-900 dark:text-white mb-1">{trimmed.replace(/^#+\s*/, '')}</p>;
            }
            if (trimmed.startsWith('## ')) {
              return <p key={i} className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-2 mb-1">{trimmed.replace(/^#+\s*/, '')}</p>;
            }
            const formatted = trimmed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            return (
              <p
                key={i}
                className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatted }}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}
