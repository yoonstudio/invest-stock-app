'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Holding } from '@/types';

interface AddHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (holding: Holding) => void;
}

export function AddHoldingModal({ isOpen, onClose, onAdd }: AddHoldingModalProps) {
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!symbol.trim()) {
      newErrors.symbol = '종목 코드를 입력해주세요';
    }
    if (!quantity || Number(quantity) <= 0) {
      newErrors.quantity = '유효한 수량을 입력해주세요';
    }
    if (!avgPrice || Number(avgPrice) <= 0) {
      newErrors.avgPrice = '유효한 평균 단가를 입력해주세요';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onAdd({
      symbol: symbol.toUpperCase().trim(),
      quantity: Number(quantity),
      avgPrice: Number(avgPrice),
    });

    // Reset form
    setSymbol('');
    setQuantity('');
    setAvgPrice('');
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setSymbol('');
    setQuantity('');
    setAvgPrice('');
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            종목 추가
          </h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="종목 코드"
            placeholder="예: AAPL, 005930.KS"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            error={errors.symbol}
          />

          <Input
            label="수량"
            type="number"
            placeholder="보유 수량"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            error={errors.quantity}
          />

          <Input
            label="평균 매수가"
            type="number"
            step="0.01"
            placeholder="평균 매수 단가"
            value={avgPrice}
            onChange={(e) => setAvgPrice(e.target.value)}
            error={errors.avgPrice}
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={handleClose}
            >
              취소
            </Button>
            <Button type="submit" fullWidth>
              추가
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
