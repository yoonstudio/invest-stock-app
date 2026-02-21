'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { StockChart } from '@/components/stock/StockChart';
import { StockInfo } from '@/components/stock/StockInfo';
import { StockNews } from '@/components/stock/StockNews';
import { TechnicalAnalysis } from '@/components/stock/TechnicalAnalysis';
import { EquityAnalysis } from '@/components/stock/EquityAnalysis';
import { SupplyDemand } from '@/components/stock/SupplyDemand';
import { getStockPrice } from '@/lib/api';
import { useWatchlistStore } from '@/lib/store';
import { StockPrice } from '@/types';
import {
  formatCurrency,
  formatPercent,
  getChangeColor,
  classNames,
  getStockCurrency,
  isKoreanStock,
} from '@/lib/utils';

type TabKey = 'overview' | 'technical' | 'supply' | 'guru' | 'news';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'technical', label: 'Technical' },
  { key: 'supply', label: 'Supply/Demand' },
  { key: 'guru', label: 'Guru Analysis' },
  { key: 'news', label: 'News' },
];

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = decodeURIComponent(params.symbol as string);

  const [stock, setStock] = useState<StockPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const { isWatching, addSymbol, removeSymbol } = useWatchlistStore();
  const watching = isWatching(symbol);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const data = await getStockPrice(symbol);
        setStock(data);
      } catch (error) {
        console.error('Failed to fetch stock:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
    const interval = setInterval(fetchStock, 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  const handleToggleWatch = () => {
    if (watching) {
      removeSymbol(symbol);
    } else {
      addSymbol(symbol);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${stock?.name} (${symbol})`,
          text: `${stock?.name}: ${formatCurrency(stock?.currentPrice || 0, getStockCurrency(symbol))}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loading size="lg" />
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Stock not found
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Could not load data for {symbol}.
        </p>
        <Button onClick={() => router.push('/stocks')}>
          Back to Search
        </Button>
      </div>
    );
  }

  const currency = getStockCurrency(symbol);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Stock Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {stock.name}
            </h1>
            <Badge variant={isKoreanStock(symbol) ? 'info' : 'default'}>
              {isKoreanStock(symbol) ? 'KRX' : 'US'}
            </Badge>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{symbol}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={watching ? 'primary' : 'outline'}
            size="sm"
            onClick={handleToggleWatch}
            leftIcon={
              <Star
                className={classNames('w-4 h-4', watching && 'fill-current')}
              />
            }
          >
            {watching ? 'Watching' : 'Watch'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Current Price */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(stock.currentPrice, currency)}
            </div>
            <div
              className={classNames(
                'flex items-center gap-2 mt-2 text-lg font-medium',
                getChangeColor(stock.changePercent)
              )}
            >
              <span>
                {stock.change >= 0 ? '+' : ''}
                {formatCurrency(stock.change, currency)}
              </span>
              <span>({formatPercent(stock.changePercent)})</span>
            </div>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {new Date(stock.timestamp).toLocaleString('ko-KR')}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <nav className="flex gap-0 min-w-max" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={classNames(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <StockChart symbol={symbol} />
            </div>
            <div>
              <StockInfo stock={stock} />
            </div>
          </div>
        )}

        {activeTab === 'technical' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TechnicalAnalysis symbol={symbol} />
          </div>
        )}

        {activeTab === 'supply' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SupplyDemand symbol={symbol} />
          </div>
        )}

        {activeTab === 'guru' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EquityAnalysis symbol={symbol} />
          </div>
        )}

        {activeTab === 'news' && (
          <div className="max-w-3xl">
            <StockNews query={stock.name} />
          </div>
        )}
      </div>
    </div>
  );
}
