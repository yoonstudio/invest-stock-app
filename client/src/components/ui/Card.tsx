'use client';

import { ReactNode, HTMLAttributes, forwardRef } from 'react';
import { classNames } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** 호버 시 상승 효과 */
  hover?: boolean;
  /** 테두리 강조 색상 */
  borderColor?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  /** 상단 강조 바 표시 */
  accentTop?: boolean;
  /** 카드 변형 스타일 */
  variant?: 'default' | 'flat' | 'outlined' | 'elevated';
  /** 카드를 클릭 가능한 요소로 표시 */
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className = '',
      padding = 'md',
      hover = false,
      borderColor = 'default',
      accentTop = false,
      variant = 'default',
      interactive = false,
      ...props
    },
    ref
  ) => {
    const paddingClasses = {
      none: '',
      xs: 'p-2',
      sm: 'p-3',
      md: 'p-4 sm:p-6',
      lg: 'p-6 sm:p-8',
      xl: 'p-8 sm:p-10',
    };

    const borderColorClasses = {
      default: 'border-gray-200 dark:border-gray-700',
      primary: 'border-blue-200 dark:border-blue-800',
      success: 'border-emerald-200 dark:border-emerald-800',
      warning: 'border-amber-200 dark:border-amber-800',
      danger: 'border-red-200 dark:border-red-800',
    };

    const accentColorClasses = {
      default: 'before:bg-gray-400 dark:before:bg-gray-500',
      primary: 'before:bg-blue-500 dark:before:bg-blue-400',
      success: 'before:bg-emerald-500 dark:before:bg-emerald-400',
      warning: 'before:bg-amber-500 dark:before:bg-amber-400',
      danger: 'before:bg-red-500 dark:before:bg-red-400',
    };

    const variantClasses = {
      default: classNames(
        'bg-white dark:bg-gray-800',
        'border',
        'shadow-sm',
        borderColorClasses[borderColor]
      ),
      flat: classNames(
        'bg-gray-50 dark:bg-gray-800/50',
        'border-0'
      ),
      outlined: classNames(
        'bg-transparent',
        'border-2',
        borderColorClasses[borderColor]
      ),
      elevated: classNames(
        'bg-white dark:bg-gray-800',
        'border-0',
        'shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50'
      ),
    };

    const hoverClasses = hover
      ? classNames(
          'transition-all duration-200 ease-out',
          'hover:-translate-y-0.5',
          'hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50',
          interactive && 'cursor-pointer'
        )
      : '';

    const interactiveClasses = interactive
      ? classNames(
          'cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          'dark:focus-visible:ring-offset-gray-900',
          'active:scale-[0.99]'
        )
      : '';

    const accentClasses = accentTop
      ? classNames(
          'relative overflow-hidden',
          'before:absolute before:top-0 before:left-0 before:right-0 before:h-1',
          accentColorClasses[borderColor]
        )
      : '';

    return (
      <div
        ref={ref}
        className={classNames(
          'rounded-xl',
          variantClasses[variant],
          paddingClasses[padding],
          hoverClasses,
          interactiveClasses,
          accentClasses,
          className
        )}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'button' : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  titleAs?: 'h2' | 'h3' | 'h4' | 'h5';
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className = '',
  titleAs = 'h3',
}: CardHeaderProps) {
  const TitleTag = titleAs;

  return (
    <div className={classNames('flex items-start justify-between gap-4 mb-4', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <TitleTag className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {title}
          </TitleTag>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
  /** 상단 경계선 표시 */
  border?: boolean;
}

export function CardFooter({ children, className = '', border = true }: CardFooterProps) {
  return (
    <div
      className={classNames(
        'mt-4 pt-4',
        border && 'border-t border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {children}
    </div>
  );
}

// 통계 카드 컴포넌트
interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  className = '',
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white font-tabular">
            {value}
          </p>
          {change !== undefined && (
            <p
              className={classNames(
                'text-sm font-medium flex items-center gap-1',
                isPositive && 'text-emerald-600 dark:text-emerald-400',
                isNegative && 'text-red-600 dark:text-red-400'
              )}
            >
              <span aria-hidden="true">{isPositive ? '+' : ''}{change}%</span>
              {changeLabel && (
                <span className="text-gray-400 dark:text-gray-500 font-normal">
                  {changeLabel}
                </span>
              )}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={classNames(
              'p-3 rounded-lg',
              isPositive && 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
              isNegative && 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
              !change && 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
