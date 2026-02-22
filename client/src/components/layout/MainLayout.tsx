'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { classNames } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="skip-link"
      >
        본문 바로가기
      </a>

      {/* Top Navigation */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <Header />

        {/* Page content */}
        <main
          id="main-content"
          className={classNames(
            'flex-1',
            'p-4 sm:p-6 lg:p-8',
            'animate-fadeIn'
          )}
          tabIndex={-1}
        >
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-4 border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
              <p>
                Investment MCP - AI 기반 투자 정보 서비스
              </p>
              <div className="flex items-center gap-4">
                <span>Made with Next.js</span>
                <span className="hidden sm:inline">|</span>
                <span className="hidden sm:inline">v1.0.0</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// 페이지 헤더 컴포넌트 (각 페이지 상단에 사용)
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  backLink?: {
    href: string;
    label: string;
  };
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  backLink,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={classNames('mb-6', className)}>
      {backLink && (
        <a
          href={backLink.href}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {backLink.label}
        </a>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}

// 섹션 헤더 컴포넌트
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={classNames('flex items-center justify-between gap-4 mb-4', className)}>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// 그리드 레이아웃 컴포넌트
interface GridLayoutProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function GridLayout({
  children,
  columns = 3,
  gap = 'md',
  className = '',
}: GridLayoutProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8',
  };

  return (
    <div className={classNames('grid', columnClasses[columns], gapClasses[gap], className)}>
      {children}
    </div>
  );
}

// 컨테이너 컴포넌트
interface ContainerProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export function Container({
  children,
  size = 'lg',
  className = '',
}: ContainerProps) {
  const sizeClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full',
  };

  return (
    <div className={classNames('mx-auto px-4 sm:px-6 lg:px-8', sizeClasses[size], className)}>
      {children}
    </div>
  );
}

// 분할 레이아웃 (사이드바 + 메인)
interface SplitLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  /** 사이드바 너비 */
  sidebarWidth?: 'sm' | 'md' | 'lg';
  /** 사이드바 위치 */
  sidebarPosition?: 'left' | 'right';
  className?: string;
}

export function SplitLayout({
  sidebar,
  main,
  sidebarWidth = 'md',
  sidebarPosition = 'right',
  className = '',
}: SplitLayoutProps) {
  const widthClasses = {
    sm: 'lg:w-72',
    md: 'lg:w-80',
    lg: 'lg:w-96',
  };

  return (
    <div
      className={classNames(
        'flex flex-col lg:flex-row gap-6',
        sidebarPosition === 'right' && 'lg:flex-row-reverse',
        className
      )}
    >
      <aside className={classNames('w-full flex-shrink-0', widthClasses[sidebarWidth])}>
        {sidebar}
      </aside>
      <div className="flex-1 min-w-0">{main}</div>
    </div>
  );
}
