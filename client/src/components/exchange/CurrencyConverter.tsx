'use client';

import { useState, useEffect } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getExchangeRate } from '@/lib/api';
import { formatNumber } from '@/lib/utils';

const currencies = [
  { code: 'USD', name: '미국 달러', symbol: '$' },
  { code: 'KRW', name: '한국 원', symbol: '₩' },
  { code: 'EUR', name: '유로', symbol: '€' },
  { code: 'JPY', name: '일본 엔', symbol: '¥' },
  { code: 'CNY', name: '중국 위안', symbol: '¥' },
  { code: 'GBP', name: '영국 파운드', symbol: '£' },
];

export function CurrencyConverter() {
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('KRW');
  const [amount, setAmount] = useState('1');
  const [result, setResult] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const convert = async () => {
    setLoading(true);
    try {
      const data = await getExchangeRate(fromCurrency, toCurrency);
      setRate(data.rate);
      setResult(Number(amount) * data.rate);
    } catch (error) {
      console.error('Failed to convert:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    convert();
  }, [fromCurrency, toCurrency]);

  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (rate) {
      setResult(Number(value) * rate);
    }
  };

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const getSymbol = (code: string) =>
    currencies.find((c) => c.code === code)?.symbol || '';

  return (
    <Card>
      <CardHeader
        title="환율 계산기"
        subtitle="실시간 환율을 적용한 통화 변환"
      />

      <div className="space-y-4">
        {/* From Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            변환할 통화
          </label>
          <div className="flex gap-3">
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-32 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
            <Input
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              leftIcon={
                <span className="text-gray-500">{getSymbol(fromCurrency)}</span>
              }
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSwap}
            className="rounded-full"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* To Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            변환 결과
          </label>
          <div className="flex gap-3">
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="w-32 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
            <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 mr-2">{getSymbol(toCurrency)}</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {result !== null
                  ? formatNumber(result, {
                      minimumFractionDigits: toCurrency === 'KRW' ? 0 : 2,
                      maximumFractionDigits: toCurrency === 'KRW' ? 0 : 2,
                    })
                  : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Exchange Rate Info */}
        {rate && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            1 {fromCurrency} = {formatNumber(rate)} {toCurrency}
          </div>
        )}
      </div>
    </Card>
  );
}
