'use client';

import { ReactNode } from 'react';
import { classNames } from '@/lib/utils';
import { X } from 'lucide-react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'xs' | 'sm' | 'md';
  /** 점 아이콘 표시 */
  dot?: boolean;
  /** 아이콘 (좌측) */
  icon?: ReactNode;
  /** 닫기 버튼 */
  onClose?: () => void;
  /** 외곽선 스타일 */
  outline?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  icon,
  onClose,
  outline = false,
  className = '',
}: BadgeProps) {
  const baseClasses = classNames(
    'inline-flex items-center font-medium rounded-full',
    'transition-colors duration-150'
  );

  const solidVariantClasses = {
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  };

  const outlineVariantClasses = {
    default: 'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
    primary: 'border border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300',
    success: 'border border-emerald-300 text-emerald-700 dark:border-emerald-600 dark:text-emerald-300',
    warning: 'border border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-300',
    danger: 'border border-red-300 text-red-700 dark:border-red-600 dark:text-red-300',
    info: 'border border-sky-300 text-sky-700 dark:border-sky-600 dark:text-sky-300',
  };

  const dotColorClasses = {
    default: 'bg-gray-500',
    primary: 'bg-blue-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-sky-500',
  };

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs gap-1',
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-sm gap-1.5',
  };

  const dotSizeClasses = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
  };

  return (
    <span
      className={classNames(
        baseClasses,
        outline ? outlineVariantClasses[variant] : solidVariantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {dot && (
        <span
          className={classNames('rounded-full', dotColorClasses[variant], dotSizeClasses[size])}
          aria-hidden="true"
        />
      )}
      {icon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 ml-0.5 -mr-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label="삭제"
        >
          <X className="w-3 h-3" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

// 숫자 배지 (카운터)
interface CountBadgeProps {
  count: number;
  /** 최대 표시 숫자 */
  max?: number;
  variant?: 'default' | 'primary' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}

export function CountBadge({
  count,
  max = 99,
  variant = 'danger',
  size = 'sm',
  className = '',
}: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;

  const variantClasses = {
    default: 'bg-gray-500 text-white',
    primary: 'bg-blue-500 text-white',
    danger: 'bg-red-500 text-white',
  };

  const sizeClasses = {
    sm: 'min-w-[18px] h-[18px] text-[10px] px-1',
    md: 'min-w-[22px] h-[22px] text-xs px-1.5',
  };

  if (count <= 0) return null;

  return (
    <span
      className={classNames(
        'inline-flex items-center justify-center font-semibold rounded-full',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      aria-label={`${count}개`}
    >
      {displayCount}
    </span>
  );
}

// 상태 배지
interface StatusBadgeProps {
  status: 'online' | 'offline' | 'away' | 'busy';
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({
  status,
  showLabel = false,
  size = 'sm',
  className = '',
}: StatusBadgeProps) {
  const statusConfig = {
    online: { label: '온라인', color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
    offline: { label: '오프라인', color: 'bg-gray-400', textColor: 'text-gray-500 dark:text-gray-400' },
    away: { label: '자리 비움', color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' },
    busy: { label: '바쁨', color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400' },
  };

  const config = statusConfig[status];

  const dotSizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  };

  return (
    <span className={classNames('inline-flex items-center gap-1.5', className)}>
      <span
        className={classNames('rounded-full', config.color, dotSizeClasses[size])}
        aria-hidden="true"
      />
      {showLabel && (
        <span className={classNames('text-sm font-medium', config.textColor)}>
          {config.label}
        </span>
      )}
      <span className="sr-only">{config.label}</span>
    </span>
  );
}

// 트렌드 배지 (상승/하락)
interface TrendBadgeProps {
  value: number;
  /** 퍼센트 형식으로 표시 */
  percent?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function TrendBadge({
  value,
  percent = true,
  size = 'sm',
  className = '',
}: TrendBadgeProps) {
  const isPositive = value >= 0;
  const isZero = value === 0;

  const baseClasses = classNames(
    'inline-flex items-center font-medium rounded',
    isZero
      ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
      : isPositive
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
  );

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-0.5 text-sm',
  };

  const displayValue = percent ? `${isPositive ? '+' : ''}${value}%` : `${isPositive ? '+' : ''}${value}`;

  return (
    <span className={classNames(baseClasses, sizeClasses[size], className)}>
      <span aria-hidden="true">
        {isZero ? '=' : isPositive ? '\u25B2' : '\u25BC'}
      </span>
      <span className="ml-0.5">{displayValue}</span>
    </span>
  );
}
