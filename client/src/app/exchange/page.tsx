'use client';

import { DollarSign } from 'lucide-react';
import { CurrencyConverter } from '@/components/exchange/CurrencyConverter';
import { ExchangeRateList } from '@/components/exchange/ExchangeRateList';
import { Card, CardHeader } from '@/components/ui/Card';

export default function ExchangePage() {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          환율 정보
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          실시간 환율 조회 및 통화 변환
        </p>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              환율 정보 안내
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              표시되는 환율은 실시간 시장 환율을 기반으로 합니다.
              실제 거래 시 적용되는 환율과 다를 수 있으며, 은행 및 환전소마다
              수수료와 스프레드가 다르게 적용됩니다.
            </p>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Currency Converter */}
        <div className="lg:col-span-1">
          <CurrencyConverter />
        </div>

        {/* Exchange Rate List */}
        <div className="lg:col-span-2">
          <ExchangeRateList />
        </div>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="미국 연준" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            기준금리: 5.25% - 5.50%
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            달러 강세가 이어지고 있습니다.
          </p>
        </Card>
        <Card>
          <CardHeader title="한국은행" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            기준금리: 3.50%
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            금리 동결 기조 유지 중입니다.
          </p>
        </Card>
        <Card>
          <CardHeader title="일본은행" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            기준금리: 0.10%
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            초저금리 정책이 지속되고 있습니다.
          </p>
        </Card>
      </div>
    </div>
  );
}
