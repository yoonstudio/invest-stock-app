'use client';

import { useState, useEffect, useCallback } from 'react';
import { Moon, Sun, Monitor, Bell, Trash2, Server, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useUIStore, useWatchlistStore, usePortfolioStore, useSearchHistoryStore } from '@/lib/store';
import { classNames } from '@/lib/utils';
import { getMcpStatus, reconnectMcp, restartServer } from '@/lib/api';
import { McpStatus } from '@/types';

export default function SettingsPage() {
  const { theme, setTheme } = useUIStore();
  const { symbols, removeSymbol } = useWatchlistStore();
  const { holdings, clearPortfolio } = usePortfolioStore();
  const { history, clearHistory } = useSearchHistoryStore();

  const [notifications, setNotifications] = useState({
    priceAlert: true,
    newsAlert: false,
    portfolioUpdate: true,
  });

  const [mcpStatus, setMcpStatus] = useState<McpStatus | null>(null);
  const [mcpLoading, setMcpLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState<Record<string, boolean>>({});

  const fetchMcpStatus = useCallback(async () => {
    try {
      const data = await getMcpStatus();
      setMcpStatus(data);
    } catch {
      setMcpStatus(null);
    } finally {
      setMcpLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMcpStatus();
    const interval = setInterval(fetchMcpStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchMcpStatus]);

  const [backendRestarting, setBackendRestarting] = useState(false);

  const handleReconnectServer = async (serverName: string) => {
    setReconnecting(prev => ({ ...prev, [serverName]: true }));
    try {
      await reconnectMcp();
      await fetchMcpStatus();
      window.location.reload();
    } catch {
      await fetchMcpStatus();
    } finally {
      setReconnecting(prev => ({ ...prev, [serverName]: false }));
    }
  };

  const handleRestartBackend = async () => {
    setBackendRestarting(true);
    try {
      await restartServer();
      window.location.reload();
    } catch {
      alert('백엔드 서버 재시작에 실패했습니다.');
      setBackendRestarting(false);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', systemDark);
    }
  };

  const handleClearAllData = () => {
    if (confirm('모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      clearPortfolio();
      clearHistory();
      symbols.forEach(s => removeSymbol(s));
      alert('모든 데이터가 삭제되었습니다.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-3xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          설정
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          앱 설정을 관리합니다.
        </p>
      </div>

      {/* Theme Settings */}
      <Card>
        <CardHeader title="테마" subtitle="앱의 색상 테마를 설정합니다." />
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleThemeChange('light')}
            className={classNames(
              'flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors',
              theme === 'light'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <Sun className="w-5 h-5" />
            <span>라이트</span>
          </button>
          <button
            onClick={() => handleThemeChange('dark')}
            className={classNames(
              'flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors',
              theme === 'dark'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <Moon className="w-5 h-5" />
            <span>다크</span>
          </button>
          <button
            onClick={() => handleThemeChange('system')}
            className={classNames(
              'flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors',
              theme === 'system'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <Monitor className="w-5 h-5" />
            <span>시스템</span>
          </button>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader title="알림" subtitle="알림 설정을 관리합니다." />
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  가격 알림
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  관심 종목 가격 변동 시 알림
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifications.priceAlert}
              onChange={(e) =>
                setNotifications({ ...notifications, priceAlert: e.target.checked })
              }
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  뉴스 알림
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  관심 종목 관련 뉴스 알림
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifications.newsAlert}
              onChange={(e) =>
                setNotifications({ ...notifications, newsAlert: e.target.checked })
              }
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  포트폴리오 업데이트
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  일일 포트폴리오 성과 요약
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={notifications.portfolioUpdate}
              onChange={(e) =>
                setNotifications({
                  ...notifications,
                  portfolioUpdate: e.target.checked,
                })
              }
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
      </Card>

      {/* Server Management */}
      <Card>
        <CardHeader title="서버 관리" subtitle="MCP 서버 연결 상태를 확인하고 관리합니다." />
        <div className="space-y-3">
          {mcpLoading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
              서버 상태 확인 중...
            </div>
          ) : (
            <>
              {/* jjlabs server */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      KRX/DART (jjlabs)
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {mcpStatus?.jjlabs?.connected ? (
                        <>
                          <Wifi className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400">연결됨</span>
                          {mcpStatus.jjlabs.connectedAt && (
                            <span className="text-xs text-gray-400 ml-1">
                              ({new Date(mcpStatus.jjlabs.connectedAt).toLocaleTimeString('ko-KR')})
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-xs text-red-500 dark:text-red-400">오프라인</span>
                          {mcpStatus?.jjlabs?.lastError && (
                            <span className="text-xs text-gray-400 ml-1 truncate max-w-[200px]">
                              ({mcpStatus.jjlabs.lastError})
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReconnectServer('jjlabs')}
                  disabled={reconnecting['jjlabs']}
                >
                  <RefreshCw className={classNames('w-4 h-4 mr-1.5', reconnecting['jjlabs'] && 'animate-spin')} />
                  {reconnecting['jjlabs'] ? '재연결 중...' : '재시작'}
                </Button>
              </div>

              {/* analyzer server */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      Analyzer (mrbaeksang)
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {mcpStatus?.analyzer?.connected ? (
                        <>
                          <Wifi className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400">연결됨</span>
                          {mcpStatus.analyzer.connectedAt && (
                            <span className="text-xs text-gray-400 ml-1">
                              ({new Date(mcpStatus.analyzer.connectedAt).toLocaleTimeString('ko-KR')})
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-xs text-red-500 dark:text-red-400">오프라인</span>
                          {mcpStatus?.analyzer?.lastError && (
                            <span className="text-xs text-gray-400 ml-1 truncate max-w-[200px]">
                              ({mcpStatus.analyzer.lastError})
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReconnectServer('analyzer')}
                  disabled={reconnecting['analyzer']}
                >
                  <RefreshCw className={classNames('w-4 h-4 mr-1.5', reconnecting['analyzer'] && 'animate-spin')} />
                  {reconnecting['analyzer'] ? '재연결 중...' : '재시작'}
                </Button>
              </div>

              {/* Backend API server */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      Backend API
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {mcpStatus ? (
                        <>
                          <Wifi className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400">연결됨</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-xs text-red-500 dark:text-red-400">오프라인</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestartBackend}
                  disabled={backendRestarting}
                >
                  <RefreshCw className={classNames('w-4 h-4 mr-1.5', backendRestarting && 'animate-spin')} />
                  {backendRestarting ? '재시작 중...' : '재시작'}
                </Button>
              </div>

              {/* Client (Next.js) */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      Client (Next.js)
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Wifi className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-xs text-green-600 dark:text-green-400">실행 중</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  새로고침
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader title="데이터 관리" subtitle="저장된 데이터를 관리합니다." />
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                관심 종목
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {symbols.length}개 종목
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('모든 관심 종목을 삭제하시겠습니까?')) {
                  symbols.forEach(s => removeSymbol(s));
                }
              }}
            >
              초기화
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                포트폴리오
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {holdings.length}개 종목
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('포트폴리오를 초기화하시겠습니까?')) {
                  clearPortfolio();
                }
              }}
            >
              초기화
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                검색 기록
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {history.length}개 기록
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={clearHistory}>
              초기화
            </Button>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader
          title="위험 영역"
          subtitle="주의가 필요한 작업입니다."
        />
        <Button
          variant="danger"
          onClick={handleClearAllData}
          leftIcon={<Trash2 className="w-4 h-4" />}
        >
          모든 데이터 삭제
        </Button>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader title="앱 정보" />
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex justify-between">
            <span>버전</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>빌드 날짜</span>
            <span>2026-02-02</span>
          </div>
          <div className="flex justify-between">
            <span>프레임워크</span>
            <span>Next.js 15</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
