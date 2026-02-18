'use client';

import { ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUIStore, initializeStores } from '@/lib/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

interface ProvidersProps {
  children: ReactNode;
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useUIStore();

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return <>{children}</>;
}

export function Providers({ children }: ProvidersProps) {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initializeStores().then(() => setDbReady(true));
  }, []);

  if (!dbReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
