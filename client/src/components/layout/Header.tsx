'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Moon, Sun, X, Clock, Server, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useUIStore, useSearchHistoryStore } from '@/lib/store';
import { classNames } from '@/lib/utils';
import { CountBadge } from '@/components/ui/Badge';
import { getMcpStatus, reconnectMcp } from '@/lib/api';
import { McpStatus } from '@/types';

export function Header() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useUIStore();
  const { history, addToHistory, removeFromHistory } = useSearchHistoryStore();
  const [mcpStatus, setMcpStatus] = useState<McpStatus | null>(null);
  const [mcpError, setMcpError] = useState(false);
  const [mcpReconnecting, setMcpReconnecting] = useState(false);

  // MCP 상태 폴링
  useEffect(() => {
    const fetchMcp = async () => {
      try {
        const data = await getMcpStatus();
        setMcpStatus(data);
        setMcpError(false);
      } catch {
        setMcpError(true);
      }
    };
    fetchMcp();
    const interval = setInterval(fetchMcp, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMcpReconnect = async () => {
    setMcpReconnecting(true);
    try {
      const data = await reconnectMcp();
      setMcpStatus(data.status);
      setMcpError(false);
      const allConnected = Object.values(data.results).every(Boolean);
      if (allConnected) {
        window.location.reload();
      }
    } catch {
      setMcpError(true);
    } finally {
      setMcpReconnecting(false);
    }
  };

  const mcpIsOffline = mcpError ||
    (mcpStatus && (!mcpStatus.jjlabs?.connected || !mcpStatus.analyzer?.connected));

  // 검색창 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      addToHistory(searchQuery.trim());
      router.push(`/stocks?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleSelectHistory = (query: string) => {
    addToHistory(query);
    router.push(`/stocks?q=${encodeURIComponent(query)}`);
    setSearchQuery('');
    setSearchFocused(false);
  };

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  };

  const showDropdown = searchFocused && history.length > 0 && !searchQuery;

  return (
    <header
      className={classNames(
        'sticky top-0 z-30 h-16',
        'bg-white/95 dark:bg-gray-900/95',
        'backdrop-blur-md',
        'border-b border-gray-200 dark:border-gray-800',
        'transition-colors duration-200'
      )}
    >
      <div className="flex items-center justify-between h-full px-4 gap-4">
        {/* Left side - Search */}
        <div className="flex items-center gap-4 flex-1">
          {/* Search bar with dropdown */}
          <div ref={searchRef} className="hidden sm:block relative max-w-md flex-1">
            <form onSubmit={handleSearch}>
              <Input
                ref={inputRef}
                type="text"
                placeholder="종목 검색 (예: 삼성전자, AAPL)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                leftIcon={<Search className="w-4 h-4" />}
                rightIcon={
                  searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label="검색어 지우기"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : undefined
                }
                aria-label="종목 검색"
                aria-expanded={showDropdown}
                aria-controls="search-history"
              />
            </form>

            {/* Search history dropdown */}
            {showDropdown && (
              <div
                id="search-history"
                className={classNames(
                  'absolute top-full left-0 right-0 mt-2',
                  'bg-white dark:bg-gray-800',
                  'border border-gray-200 dark:border-gray-700',
                  'rounded-xl shadow-lg',
                  'overflow-hidden',
                  'animate-fadeInDown'
                )}
                role="listbox"
              >
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      최근 검색
                    </span>
                    <button
                      onClick={() => {
                        history.forEach((item) => removeFromHistory(item));
                      }}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      전체 삭제
                    </button>
                  </div>
                </div>
                <ul className="max-h-60 overflow-y-auto">
                  {history.slice(0, 8).map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        onClick={() => handleSelectHistory(item)}
                        className={classNames(
                          'w-full flex items-center gap-3 px-3 py-2.5',
                          'text-left text-sm',
                          'text-gray-700 dark:text-gray-300',
                          'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                          'transition-colors'
                        )}
                        role="option"
                      >
                        <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
                        <span className="flex-1 truncate">{item}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromHistory(item);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                          aria-label={`${item} 삭제`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right side - MCP Status + Actions */}
        <div className="flex items-center gap-1">
          {/* MCP Server Status */}
          {mcpError ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-600 dark:text-red-400 mr-1">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden md:inline">MCP Offline</span>
              <button
                onClick={handleMcpReconnect}
                disabled={mcpReconnecting}
                className="ml-1 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-800/30 transition-colors disabled:opacity-50"
                title="MCP 재연결"
              >
                <RefreshCw className={classNames('w-3.5 h-3.5', mcpReconnecting && 'animate-spin')} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs mr-1">
              <Server className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden md:inline text-gray-600 dark:text-gray-300 font-medium">MCP</span>
              <div className="flex items-center gap-1" title="KRX/DART (jjlabs)">
                {mcpStatus?.jjlabs?.connected ? (
                  <Wifi className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-red-400" />
                )}
                <span className="hidden lg:inline text-gray-500 dark:text-gray-400">jjlabs</span>
              </div>
              <div className="flex items-center gap-1" title="Analyzer (mrbaeksang)">
                {mcpStatus?.analyzer?.connected ? (
                  <Wifi className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-red-400" />
                )}
                <span className="hidden lg:inline text-gray-500 dark:text-gray-400">analyzer</span>
              </div>
              {mcpIsOffline && (
                <button
                  onClick={handleMcpReconnect}
                  disabled={mcpReconnecting}
                  className="ml-1 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  title="MCP 재연결"
                >
                  <RefreshCw className={classNames('w-3.5 h-3.5 text-orange-500', mcpReconnecting && 'animate-spin')} />
                </button>
              )}
            </div>
          )}

          {/* Mobile search button */}
          <button
            onClick={() => router.push('/stocks')}
            className={classNames(
              'sm:hidden p-2.5 rounded-lg',
              'text-gray-500 hover:text-gray-700',
              'dark:text-gray-400 dark:hover:text-gray-200',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
            )}
            aria-label="검색"
          >
            <Search className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={classNames(
              'p-2.5 rounded-lg',
              'text-gray-500 hover:text-gray-700',
              'dark:text-gray-400 dark:hover:text-gray-200',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
            )}
            aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 transition-transform hover:rotate-45" aria-hidden="true" />
            ) : (
              <Moon className="w-5 h-5 transition-transform hover:-rotate-12" aria-hidden="true" />
            )}
          </button>

          {/* Notifications */}
          <button
            className={classNames(
              'relative p-2.5 rounded-lg',
              'text-gray-500 hover:text-gray-700',
              'dark:text-gray-400 dark:hover:text-gray-200',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
            )}
            aria-label="알림 3개"
          >
            <Bell className="w-5 h-5" aria-hidden="true" />
            <span className="absolute top-1 right-1">
              <CountBadge count={3} size="sm" />
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
