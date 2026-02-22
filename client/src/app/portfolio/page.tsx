'use client';

import { useEffect, useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Briefcase, RefreshCw } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Loading';
import { HoldingsTable } from '@/components/portfolio/HoldingsTable';
import { AllocationChart } from '@/components/portfolio/AllocationChart';
import { PerformanceChart } from '@/components/portfolio/PerformanceChart';
import { AddHoldingModal } from '@/components/portfolio/AddHoldingModal';
import { analyzePortfolio } from '@/lib/api';
import { usePortfolioStore } from '@/lib/store';
import { PortfolioAnalysis, Holding } from '@/types';
import {
  formatCurrency,
  formatPercent,
  getChangeColor,
  classNames,
} from '@/lib/utils';

export default function PortfolioPage() {
  const { holdings, addHolding, removeHolding } = usePortfolioStore();
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchAnalysis = async () => {
    if (holdings.length === 0) {
      setAnalysis(null);
      setLoading(false);
      return;
    }
    try {
      const data = await analyzePortfolio(holdings);
      setAnalysis(data);
    } catch (error) {
      console.error('Failed to analyze portfolio:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [holdings]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalysis();
  };

  const handleAddHolding = (holding: Holding) => {
    addHolding(holding);
  };

  const handleRemoveHolding = (symbol: string) => {
    if (confirm(`${symbol} 종목을 포트폴리오에서 삭제하시겠습니까?`)) {
      removeHolding(symbol);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (holdings.length === 0 || !analysis) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            포트폴리오
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            보유 종목을 관리하고 수익률을 추적하세요.
          </p>
        </div>

        {/* Empty State */}
        <Card className="text-center py-16">
          <Briefcase className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-6" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            포트폴리오가 비어있습니다
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            보유 중인 종목을 추가하여 포트폴리오를 구성하고 수익률을 추적해보세요.
          </p>
          <Button
            onClick={() => setShowAddModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            종목 추가하기
          </Button>
        </Card>

        <AddHoldingModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddHolding}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            포트폴리오
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            보유 종목을 관리하고 수익률을 추적하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            새로고침
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            종목 추가
          </Button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-sm text-gray-500 dark:text-gray-400">총 평가 금액</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {formatCurrency(analysis.totalValue)}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500 dark:text-gray-400">투자 원금</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {formatCurrency(analysis.totalCost)}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500 dark:text-gray-400">총 손익</div>
          <div
            className={classNames(
              'flex items-center gap-2 text-2xl font-bold mt-1',
              getChangeColor(analysis.totalReturn)
            )}
          >
            {analysis.totalReturn >= 0 ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
            {formatCurrency(analysis.totalReturn)}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500 dark:text-gray-400">수익률</div>
          <div
            className={classNames(
              'flex items-center gap-2 text-2xl font-bold mt-1',
              getChangeColor(analysis.totalReturnPercent)
            )}
          >
            {analysis.totalReturnPercent >= 0 ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
            {formatPercent(analysis.totalReturnPercent)}
          </div>
        </Card>
      </div>

      {/* Risk Metrics */}
      <Card>
        <CardHeader title="리스크 지표" />
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">베타</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {(analysis.riskMetrics.beta ?? 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {(analysis.riskMetrics.beta ?? 0) > 1
                ? '시장 대비 높은 변동성'
                : '시장 대비 낮은 변동성'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              변동성 (연간)
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {(analysis.riskMetrics.volatility ?? 0).toFixed(1)}%
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {(analysis.riskMetrics.volatility ?? 0) > 20
                ? '높은 변동성'
                : '적정 변동성'}
            </p>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AllocationChart allocation={analysis.allocation} />
        <PerformanceChart holdings={analysis.holdings} />
      </div>

      {/* Holdings Table */}
      <HoldingsTable
        holdings={analysis.holdings}
        onRemove={handleRemoveHolding}
      />

      {/* Add Holding Modal */}
      <AddHoldingModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddHolding}
      />
    </div>
  );
}
