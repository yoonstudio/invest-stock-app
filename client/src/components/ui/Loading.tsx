'use client';

import { classNames } from '@/lib/utils';
import { ReactNode } from 'react';

interface LoadingProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** 로딩 텍스트 (접근성용) */
  label?: string;
  /** 색상 변형 */
  variant?: 'primary' | 'white' | 'gray';
}

export function Loading({
  size = 'md',
  className = '',
  label = '로딩 중...',
  variant = 'primary',
}: LoadingProps) {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const variantClasses = {
    primary: 'text-blue-600 dark:text-blue-400',
    white: 'text-white',
    gray: 'text-gray-400 dark:text-gray-500',
  };

  return (
    <div
      className={classNames('flex items-center justify-center', className)}
      role="status"
      aria-live="polite"
    >
      <svg
        className={classNames('animate-spin', sizeClasses[size], variantClasses[variant])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

// 점 애니메이션 로딩
interface DotsLoadingProps {
  className?: string;
  label?: string;
}

export function DotsLoading({ className = '', label = '로딩 중...' }: DotsLoadingProps) {
  return (
    <div
      className={classNames('flex items-center justify-center gap-1', className)}
      role="status"
      aria-live="polite"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

// 로딩 오버레이
interface LoadingOverlayProps {
  message?: string;
  /** 배경 블러 효과 */
  blur?: boolean;
}

export function LoadingOverlay({
  message = '로딩 중...',
  blur = true,
}: LoadingOverlayProps) {
  return (
    <div
      className={classNames(
        'fixed inset-0 z-50 flex items-center justify-center',
        blur ? 'bg-white/80 backdrop-blur-sm dark:bg-gray-900/80' : 'bg-white/95 dark:bg-gray-900/95'
      )}
      role="dialog"
      aria-modal="true"
      aria-label="로딩 중"
    >
      <div className="text-center animate-fadeIn">
        <Loading size="lg" className="mb-4" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">{message}</p>
      </div>
    </div>
  );
}

// 스켈레톤 로더
interface SkeletonProps {
  className?: string;
  /** 애니메이션 활성화 */
  animate?: boolean;
  /** 원형 스켈레톤 */
  circle?: boolean;
  /** 인라인 스타일 */
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', animate = true, circle = false, style }: SkeletonProps) {
  return (
    <div
      className={classNames(
        'bg-gray-200 dark:bg-gray-700',
        circle ? 'rounded-full' : 'rounded',
        animate && 'animate-shimmer',
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

// 카드 스켈레톤
interface CardSkeletonProps {
  /** 라인 수 */
  lines?: number;
  /** 아바타/아이콘 표시 */
  showAvatar?: boolean;
}

export function CardSkeleton({ lines = 3, showAvatar = false }: CardSkeletonProps) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
      aria-hidden="true"
    >
      <div className="flex items-start gap-4">
        {showAvatar && <Skeleton className="w-12 h-12 flex-shrink-0" circle />}
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-1/3" />
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-4"
              style={{ width: `${85 - i * 15}%` } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// 테이블 행 스켈레톤
interface TableRowSkeletonProps {
  columns?: number;
  rows?: number;
}

export function TableRowSkeleton({ columns = 5, rows = 5 }: TableRowSkeletonProps) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 px-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className="h-4 flex-1"
              style={{ animationDelay: `${(rowIndex * columns + colIndex) * 50}ms` } as React.CSSProperties}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// 리스트 스켈레톤
interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
}

export function ListSkeleton({ items = 5, showAvatar = true }: ListSkeletonProps) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          {showAvatar && <Skeleton className="w-10 h-10 flex-shrink-0" circle />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

// 인라인 로딩 (텍스트와 함께 표시)
interface InlineLoadingProps {
  children?: ReactNode;
  loading: boolean;
  className?: string;
}

export function InlineLoading({ children, loading, className = '' }: InlineLoadingProps) {
  if (!loading) return <>{children}</>;

  return (
    <span className={classNames('inline-flex items-center gap-2', className)}>
      <Loading size="xs" variant="gray" />
      {children}
    </span>
  );
}

// 프로그레스 바
interface ProgressBarProps {
  /** 진행률 (0-100) */
  value: number;
  /** 최대값 */
  max?: number;
  /** 레이블 표시 */
  showLabel?: boolean;
  /** 크기 */
  size?: 'sm' | 'md' | 'lg';
  /** 색상 변형 */
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  variant = 'primary',
  className = '',
}: ProgressBarProps) {
  const percent = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantClasses = {
    primary: 'bg-blue-600 dark:bg-blue-500',
    success: 'bg-emerald-600 dark:bg-emerald-500',
    warning: 'bg-amber-500 dark:bg-amber-400',
    danger: 'bg-red-600 dark:bg-red-500',
  };

  return (
    <div className={className}>
      <div
        className={classNames(
          'w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${percent.toFixed(0)}% 완료`}
      >
        <div
          className={classNames(
            'h-full rounded-full transition-all duration-500 ease-out',
            variantClasses[variant]
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-right">
          {percent.toFixed(0)}%
        </p>
      )}
    </div>
  );
}
