// Utility functions

export function formatCurrency(
  value: number,
  currency: string = 'KRW',
  locale: string = 'ko-KR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'KRW' ? 0 : 2,
    maximumFractionDigits: currency === 'KRW' ? 0 : 2,
  }).format(value);
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  if (value == null || !Number.isFinite(value)) {
    return '-';
  }

  const maxFractionDigits = options?.maximumFractionDigits ?? 2;
  const minFractionDigits = options?.minimumFractionDigits ?? Math.min(2, maxFractionDigits);

  const safeOptions: Intl.NumberFormatOptions = {
    ...options,
    minimumFractionDigits: Math.max(0, Math.min(20, minFractionDigits)),
    maximumFractionDigits: Math.max(0, Math.min(20, maxFractionDigits)),
  };

  // Ensure minimumFractionDigits <= maximumFractionDigits
  if (safeOptions.minimumFractionDigits! > safeOptions.maximumFractionDigits!) {
    safeOptions.minimumFractionDigits = safeOptions.maximumFractionDigits;
  }

  return new Intl.NumberFormat('ko-KR', safeOptions).format(value);
}

export function formatPercent(value: number): string {
  if (value == null || !Number.isFinite(value)) {
    return '-';
  }
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatLargeNumber(value: number): string {
  if (value == null || !Number.isFinite(value)) {
    return '-';
  }
  if (value >= 1e12) {
    return `${(value / 1e12).toFixed(1)}조`;
  }
  if (value >= 1e8) {
    return `${(value / 1e8).toFixed(1)}억`;
  }
  if (value >= 1e4) {
    return `${(value / 1e4).toFixed(1)}만`;
  }
  return value.toLocaleString('ko-KR');
}

export function formatDate(date: string | Date, format: 'full' | 'short' | 'time' = 'short'): string {
  const d = new Date(date);

  switch (format) {
    case 'full':
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    case 'time':
      return new Intl.DateTimeFormat('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    case 'short':
    default:
      return new Intl.DateTimeFormat('ko-KR', {
        month: 'short',
        day: 'numeric',
      }).format(d);
  }
}

export function getChangeColor(value: number): string {
  if (value > 0) return 'text-green-600 dark:text-green-400';
  if (value < 0) return 'text-red-600 dark:text-red-400';
  return 'text-gray-600 dark:text-gray-400';
}

export function getChangeBgColor(value: number): string {
  if (value > 0) return 'bg-green-100 dark:bg-green-900/30';
  if (value < 0) return 'bg-red-100 dark:bg-red-900/30';
  return 'bg-gray-100 dark:bg-gray-800';
}

export function getSentimentColor(sentiment: 'positive' | 'neutral' | 'negative'): string {
  switch (sentiment) {
    case 'positive':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'negative':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
  }
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function isKoreanStock(symbol: string): boolean {
  return symbol.endsWith('.KS') || symbol.endsWith('.KQ');
}

export function getStockCurrency(symbol: string): string {
  return isKoreanStock(symbol) ? 'KRW' : 'USD';
}
