'use client';

import { ReactNode } from 'react';
import { classNames } from '@/lib/utils';
import { Button } from './Button';
import {
  Search,
  Inbox,
  FileX,
  TrendingUp,
  Briefcase,
  AlertTriangle,
  Wifi,
  WifiOff,
  ServerCrash,
  RefreshCw,
} from 'lucide-react';

interface EmptyStateProps {
  /** 아이콘 */
  icon?: ReactNode;
  /** 제목 */
  title: string;
  /** 설명 */
  description?: string;
  /** 액션 버튼 */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'outline';
  };
  /** 보조 액션 */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** 크기 */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const sizeConfig = {
    sm: {
      container: 'py-8',
      icon: 'w-10 h-10',
      title: 'text-base',
      description: 'text-sm',
    },
    md: {
      container: 'py-12',
      icon: 'w-14 h-14',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'w-20 h-20',
      title: 'text-xl',
      description: 'text-base',
    },
  };

  const config = sizeConfig[size];

  return (
    <div
      className={classNames(
        'text-center',
        config.container,
        className
      )}
      role="status"
      aria-live="polite"
    >
      {icon && (
        <div
          className={classNames(
            'mx-auto text-gray-300 dark:text-gray-600 mb-4',
            config.icon
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h3
        className={classNames(
          'font-semibold text-gray-900 dark:text-white mb-2',
          config.title
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={classNames(
            'text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6',
            config.description
          )}
        >
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {action && (
            <Button
              variant={action.variant || 'primary'}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// 사전 정의된 빈 상태들

export function NoSearchResults({
  query,
  onClear,
}: {
  query?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={<Search className="w-full h-full" />}
      title="검색 결과가 없습니다"
      description={
        query
          ? `"${query}"에 대한 검색 결과를 찾을 수 없습니다. 다른 검색어로 시도해보세요.`
          : '검색어를 입력하여 원하는 정보를 찾아보세요.'
      }
      action={
        onClear
          ? {
              label: '검색 초기화',
              onClick: onClear,
              variant: 'outline',
            }
          : undefined
      }
    />
  );
}

export function NoData({
  message = '데이터가 없습니다',
  onRefresh,
}: {
  message?: string;
  onRefresh?: () => void;
}) {
  return (
    <EmptyState
      icon={<Inbox className="w-full h-full" />}
      title={message}
      description="아직 표시할 데이터가 없습니다."
      action={
        onRefresh
          ? {
              label: '새로고침',
              onClick: onRefresh,
              variant: 'outline',
            }
          : undefined
      }
    />
  );
}

export function NoStocks({ onSearch }: { onSearch?: () => void }) {
  return (
    <EmptyState
      icon={<TrendingUp className="w-full h-full" />}
      title="관심 종목이 없습니다"
      description="관심 있는 종목을 추가하여 시세를 추적해보세요."
      action={
        onSearch
          ? {
              label: '종목 검색하기',
              onClick: onSearch,
            }
          : undefined
      }
    />
  );
}

export function NoPortfolio({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={<Briefcase className="w-full h-full" />}
      title="포트폴리오가 비어있습니다"
      description="보유 중인 종목을 추가하여 포트폴리오를 구성하고 수익률을 추적해보세요."
      action={
        onAdd
          ? {
              label: '종목 추가하기',
              onClick: onAdd,
            }
          : undefined
      }
    />
  );
}

export function FileNotFound({ onBack }: { onBack?: () => void }) {
  return (
    <EmptyState
      icon={<FileX className="w-full h-full" />}
      title="페이지를 찾을 수 없습니다"
      description="요청하신 페이지가 존재하지 않거나 이동되었습니다."
      action={
        onBack
          ? {
              label: '뒤로 가기',
              onClick: onBack,
              variant: 'outline',
            }
          : undefined
      }
    />
  );
}

// 에러 상태 컴포넌트들

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = '오류가 발생했습니다',
  description = '잠시 후 다시 시도해주세요. 문제가 지속되면 고객센터에 문의해주세요.',
  onRetry,
  retryLabel = '다시 시도',
  className = '',
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={<AlertTriangle className="w-full h-full text-amber-400" />}
      title={title}
      description={description}
      action={
        onRetry
          ? {
              label: retryLabel,
              onClick: onRetry,
              variant: 'outline',
            }
          : undefined
      }
      className={className}
    />
  );
}

export function NetworkError({
  onRetry,
  className = '',
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={classNames('text-center py-12', className)}>
      <div className="relative inline-block mb-4">
        <WifiOff className="w-16 h-16 text-gray-300 dark:text-gray-600" aria-hidden="true" />
        <div className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-gray-800 rounded-full">
          <AlertTriangle className="w-6 h-6 text-amber-500" aria-hidden="true" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        네트워크 연결 오류
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
        인터넷 연결을 확인해주세요. Wi-Fi 또는 모바일 데이터가 켜져 있는지 확인하고 다시 시도해주세요.
      </p>
      {onRetry && (
        <Button
          variant="outline"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          다시 시도
        </Button>
      )}
    </div>
  );
}

export function ServerError({
  onRetry,
  errorCode,
  className = '',
}: {
  onRetry?: () => void;
  errorCode?: string | number;
  className?: string;
}) {
  return (
    <div className={classNames('text-center py-12', className)}>
      <ServerCrash
        className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
        aria-hidden="true"
      />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        서버 오류가 발생했습니다
        {errorCode && (
          <span className="ml-2 text-sm font-normal text-gray-500">
            (오류 코드: {errorCode})
          </span>
        )}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
        일시적인 서버 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
        문제가 지속되면 고객센터에 문의해주세요.
      </p>
      {onRetry && (
        <Button
          variant="outline"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          다시 시도
        </Button>
      )}
    </div>
  );
}

// 인라인 에러 메시지
interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({ message, onRetry, className = '' }: InlineErrorProps) {
  return (
    <div
      className={classNames(
        'flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg',
        className
      )}
      role="alert"
    >
      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" aria-hidden="true" />
      <p className="text-sm text-red-700 dark:text-red-300 flex-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}

// 성공 메시지
interface SuccessMessageProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function SuccessMessage({ message, onDismiss, className = '' }: SuccessMessageProps) {
  return (
    <div
      className={classNames(
        'flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg',
        className
      )}
      role="status"
    >
      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
        <svg
          className="w-3 h-3 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-sm text-emerald-700 dark:text-emerald-300 flex-1">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          aria-label="닫기"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
