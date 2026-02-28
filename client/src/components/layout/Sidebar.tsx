'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  Briefcase,
  DollarSign,
  Settings,
  TrendingUp,
  X,
  Menu,
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import { useUIStore } from '@/lib/store';

const navigation = [
  { name: '대시보드', href: '/', icon: LayoutDashboard },
  { name: '종목 검색', href: '/stocks', icon: Search },
  { name: '포트폴리오', href: '/portfolio', icon: Briefcase },
  { name: '환율', href: '/exchange', icon: DollarSign },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSidebarOpen(false);
    }
  };

  return (
    <nav
      className={classNames(
        'sticky top-0 z-50 w-full',
        'bg-white/95 dark:bg-gray-900/95',
        'backdrop-blur-md',
        'border-b border-gray-200 dark:border-gray-800',
        'transition-colors duration-200'
      )}
      aria-label="메인 네비게이션"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-6">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 flex-shrink-0 group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
              <TrendingUp className="w-4.5 h-4.5 text-white" aria-hidden="true" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                Investment
              </span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400 ml-0.5">
                MCP
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <ul className="hidden md:flex items-center gap-1 flex-1" role="list">
            {navigation.map((item) => {
              const isActive = item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={classNames(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                      'transition-all duration-200',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon
                      className={classNames(
                        'w-4 h-4',
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 dark:text-gray-400'
                      )}
                      aria-hidden="true"
                    />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/settings"
                className={classNames(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                  'transition-all duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  pathname === '/settings'
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                )}
                aria-current={pathname === '/settings' ? 'page' : undefined}
              >
                <Settings
                  className={classNames(
                    'w-4 h-4',
                    pathname === '/settings'
                      ? 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-400'
                  )}
                  aria-hidden="true"
                />
                <span>설정</span>
              </Link>
            </li>
          </ul>

          {/* Mobile hamburger button */}
          <div className="md:hidden flex-1 flex justify-end">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={classNames(
                'p-2.5 rounded-lg',
                'text-gray-500 hover:text-gray-700',
                'dark:text-gray-400 dark:hover:text-gray-200',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
              )}
              aria-label={sidebarOpen ? '메뉴 닫기' : '메뉴 열기'}
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label="메뉴 닫기"
          />
          <div
            className={classNames(
              'absolute top-16 left-0 right-0 z-50 md:hidden',
              'bg-white dark:bg-gray-900',
              'border-b border-gray-200 dark:border-gray-800',
              'shadow-lg',
              'animate-fadeInDown'
            )}
          >
            <ul className="px-4 py-3 space-y-1" role="list">
              {navigation.map((item) => {
                const isActive = item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={classNames(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                        'transition-all duration-200',
                        isActive
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <item.icon
                        className={classNames(
                          'w-5 h-5',
                          isActive
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-500 dark:text-gray-400'
                        )}
                        aria-hidden="true"
                      />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
              <li className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <Link
                  href="/settings"
                  onClick={() => setSidebarOpen(false)}
                  className={classNames(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                    'transition-all duration-200',
                    pathname === '/settings'
                      ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                  )}
                  aria-current={pathname === '/settings' ? 'page' : undefined}
                >
                  <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                  <span>설정</span>
                </Link>
              </li>
            </ul>
          </div>
        </>
      )}
    </nav>
  );
}
