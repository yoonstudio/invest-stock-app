import { create } from 'zustand';
import { Holding } from '@/types';
import { supabase } from './supabase';

// ============================================================================
// Watchlist Store
// ============================================================================
interface WatchlistState {
  symbols: string[];
  loaded: boolean;
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
  isWatching: (symbol: string) => boolean;
  loadFromDB: () => Promise<void>;
}

export const useWatchlistStore = create<WatchlistState>()((set, get) => ({
  symbols: [],
  loaded: false,
  addSymbol: async (symbol) => {
    if (get().symbols.includes(symbol)) return;
    set((state) => ({ symbols: [...state.symbols, symbol] }));
    await supabase.from('invest_watchlist').upsert({ symbol }, { onConflict: 'symbol' });
  },
  removeSymbol: async (symbol) => {
    set((state) => ({ symbols: state.symbols.filter((s) => s !== symbol) }));
    await supabase.from('invest_watchlist').delete().eq('symbol', symbol);
  },
  isWatching: (symbol) => get().symbols.includes(symbol),
  loadFromDB: async () => {
    const { data } = await supabase
      .from('invest_watchlist')
      .select('symbol')
      .order('created_at', { ascending: true });
    if (data) {
      set({ symbols: data.map((d) => d.symbol), loaded: true });
    }
  },
}));

// ============================================================================
// Portfolio Store
// ============================================================================
interface PortfolioState {
  holdings: Holding[];
  loaded: boolean;
  addHolding: (holding: Holding) => void;
  updateHolding: (symbol: string, updates: Partial<Holding>) => void;
  removeHolding: (symbol: string) => void;
  clearPortfolio: () => void;
  loadFromDB: () => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>()((set, get) => ({
  holdings: [],
  loaded: false,
  addHolding: async (holding) => {
    const existing = get().holdings.find((h) => h.symbol === holding.symbol);
    if (existing) {
      const totalQty = existing.quantity + holding.quantity;
      const newAvgPrice =
        (existing.avgPrice * existing.quantity +
          holding.avgPrice * holding.quantity) /
        totalQty;
      const updated = { ...existing, quantity: totalQty, avgPrice: newAvgPrice };
      set((state) => ({
        holdings: state.holdings.map((h) =>
          h.symbol === holding.symbol ? updated : h
        ),
      }));
      await supabase
        .from('invest_stocks')
        .update({ quantity: totalQty, avg_price: newAvgPrice, updated_at: new Date().toISOString() })
        .eq('symbol', holding.symbol);
    } else {
      set((state) => ({ holdings: [...state.holdings, holding] }));
      await supabase.from('invest_stocks').insert({
        symbol: holding.symbol,
        quantity: holding.quantity,
        avg_price: holding.avgPrice,
      });
    }
  },
  updateHolding: async (symbol, updates) => {
    set((state) => ({
      holdings: state.holdings.map((h) =>
        h.symbol === symbol ? { ...h, ...updates } : h
      ),
    }));
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.avgPrice !== undefined) dbUpdates.avg_price = updates.avgPrice;
    await supabase.from('invest_stocks').update(dbUpdates).eq('symbol', symbol);
  },
  removeHolding: async (symbol) => {
    set((state) => ({
      holdings: state.holdings.filter((h) => h.symbol !== symbol),
    }));
    await supabase.from('invest_stocks').delete().eq('symbol', symbol);
  },
  clearPortfolio: async () => {
    set({ holdings: [] });
    await supabase.from('invest_stocks').delete().neq('id', 0);
  },
  loadFromDB: async () => {
    const { data } = await supabase
      .from('invest_stocks')
      .select('symbol, quantity, avg_price')
      .order('created_at', { ascending: true });
    if (data) {
      set({
        holdings: data.map((d) => ({
          symbol: d.symbol,
          quantity: Number(d.quantity),
          avgPrice: Number(d.avg_price),
        })),
        loaded: true,
      });
    }
  },
}));

// ============================================================================
// UI Store
// ============================================================================
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  loaded: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  loadFromDB: () => Promise<void>;
}

export const useUIStore = create<UIState>()((set, get) => ({
  sidebarOpen: true,
  theme: 'system',
  loaded: false,
  toggleSidebar: async () => {
    const newVal = !get().sidebarOpen;
    set({ sidebarOpen: newVal });
    await supabase
      .from('invest_settings')
      .upsert({ key: 'sidebarOpen', value: newVal, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  },
  setSidebarOpen: async (open) => {
    set({ sidebarOpen: open });
    await supabase
      .from('invest_settings')
      .upsert({ key: 'sidebarOpen', value: open, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  },
  setTheme: async (theme) => {
    set({ theme });
    await supabase
      .from('invest_settings')
      .upsert({ key: 'theme', value: theme, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  },
  loadFromDB: async () => {
    const { data } = await supabase.from('invest_settings').select('key, value');
    if (data) {
      const settings: Record<string, unknown> = {};
      data.forEach((d) => { settings[d.key] = d.value; });
      set({
        sidebarOpen: typeof settings.sidebarOpen === 'boolean' ? settings.sidebarOpen : true,
        theme: (settings.theme as UIState['theme']) || 'system',
        loaded: true,
      });
    }
  },
}));

// ============================================================================
// Search History Store
// ============================================================================
interface SearchHistoryState {
  history: string[];
  loaded: boolean;
  addToHistory: (query: string) => void;
  removeFromHistory: (query: string) => void;
  clearHistory: () => void;
  loadFromDB: () => Promise<void>;
}

export const useSearchHistoryStore = create<SearchHistoryState>()((set, get) => ({
  history: [],
  loaded: false,
  addToHistory: async (query) => {
    // Remove duplicate first, then add to front, cap at 10
    const filtered = get().history.filter((q) => q !== query);
    const newHistory = [query, ...filtered].slice(0, 10);
    set({ history: newHistory });
    // DB: delete existing, insert new
    await supabase.from('invest_search_history').delete().eq('query', query);
    await supabase.from('invest_search_history').insert({ query });
    // Trim to 10 in DB
    const { data } = await supabase
      .from('invest_search_history')
      .select('id')
      .order('searched_at', { ascending: false })
      .range(10, 100);
    if (data && data.length > 0) {
      await supabase
        .from('invest_search_history')
        .delete()
        .in('id', data.map((d) => d.id));
    }
  },
  removeFromHistory: async (query) => {
    set((state) => ({ history: state.history.filter((q) => q !== query) }));
    await supabase.from('invest_search_history').delete().eq('query', query);
  },
  clearHistory: async () => {
    set({ history: [] });
    await supabase.from('invest_search_history').delete().neq('id', 0);
  },
  loadFromDB: async () => {
    const { data } = await supabase
      .from('invest_search_history')
      .select('query')
      .order('searched_at', { ascending: false })
      .limit(10);
    if (data) {
      set({ history: data.map((d) => d.query), loaded: true });
    }
  },
}));

// ============================================================================
// Initialize all stores from Supabase
// ============================================================================
export async function initializeStores() {
  // 3-second hard timeout prevents a hanging Supabase connection from
  // blocking the loading screen indefinitely.
  const timeout = new Promise<void>(resolve => setTimeout(resolve, 3000));
  await Promise.race([
    Promise.allSettled([
      useWatchlistStore.getState().loadFromDB(),
      usePortfolioStore.getState().loadFromDB(),
      useUIStore.getState().loadFromDB(),
      useSearchHistoryStore.getState().loadFromDB(),
    ]),
    timeout,
  ]);
}
