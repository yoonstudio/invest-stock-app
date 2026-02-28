'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { getMcpStatus } from '@/lib/api';
import { McpStatus as McpStatusType } from '@/types';
import { classNames } from '@/lib/utils';
import { Server, Wifi, WifiOff } from 'lucide-react';

export function McpStatus({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<McpStatusType | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getMcpStatus();
        setStatus(data);
        setError(false);
      } catch {
        setError(true);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Compact mode: inline badges for header
  if (compact) {
    const jjConnected = status?.jjlabs?.connected ?? false;
    const analyzerConnected = status?.analyzer?.connected ?? false;
    const allConnected = jjConnected && analyzerConnected;

    if (error) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-600 dark:text-red-400">
          <WifiOff className="w-3.5 h-3.5" />
          <span>MCP Offline</span>
        </div>
      );
    }

    return (
      <div className={classNames(
        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs',
        allConnected
          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
          : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
      )}>
        <Server className="w-3.5 h-3.5" />
        <span>MCP</span>
        <span className={classNames(
          'w-2 h-2 rounded-full',
          jjConnected ? 'bg-green-500' : 'bg-red-400'
        )} title={`KRX/DART: ${jjConnected ? 'Connected' : 'Disconnected'}`} />
        <span className={classNames(
          'w-2 h-2 rounded-full',
          analyzerConnected ? 'bg-green-500' : 'bg-red-400'
        )} title={`Analyzer: ${analyzerConnected ? 'Connected' : 'Disconnected'}`} />
      </div>
    );
  }

  // Full card mode
  const renderServerStatus = (
    name: string,
    label: string,
    serverStatus?: { connected: boolean; lastError: string | null; connectedAt: string | null }
  ) => {
    const connected = serverStatus?.connected ?? false;

    return (
      <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        </div>
        <span className={classNames(
          'text-xs font-medium px-2 py-0.5 rounded-full',
          connected
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        )}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    );
  };

  if (error) {
    return (
      <Card>
        <CardHeader title="MCP Servers" icon={<Server className="w-5 h-5 text-gray-400" />} />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          REST API server not reachable
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="MCP Servers" icon={<Server className="w-5 h-5 text-blue-500" />} />
      <div className="space-y-2">
        {renderServerStatus('jjlabs', 'KRX/DART (jjlabs)', status?.jjlabs)}
        {renderServerStatus('analyzer', 'Analyzer (mrbaeksang)', status?.analyzer)}
      </div>
    </Card>
  );
}
