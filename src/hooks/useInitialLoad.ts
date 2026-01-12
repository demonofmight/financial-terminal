import { useState, useEffect, useCallback, useRef } from 'react';

interface LoadingState {
  isLoading: boolean;
  progress: number;
  message: string;
}

// List of data sources to track
const DATA_SOURCES = [
  { id: 'sectors', weight: 15, message: 'Fetching sector data...' },
  { id: 'globalMarkets', weight: 15, message: 'Loading global indices...' },
  { id: 'sp500', weight: 10, message: 'Getting S&P 500 movers...' },
  { id: 'crypto', weight: 10, message: 'Retrieving crypto prices...' },
  { id: 'sentiment', weight: 10, message: 'Analyzing market sentiment...' },
  { id: 'treasury', weight: 10, message: 'Loading treasury yields...' },
  { id: 'metals', weight: 10, message: 'Fetching precious metals...' },
  { id: 'currencies', weight: 10, message: 'Getting currency rates...' },
  { id: 'calendar', weight: 5, message: 'Loading economic calendar...' },
  { id: 'commodities', weight: 5, message: 'Fetching commodities...' },
];

const TOTAL_WEIGHT = DATA_SOURCES.reduce((sum, s) => sum + s.weight, 0);

/**
 * Hook to track initial data loading across all widgets
 */
export function useInitialLoad() {
  const [state, setState] = useState<LoadingState>({
    isLoading: true,
    progress: 0,
    message: 'Initializing...',
  });

  const loadedSourcesRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mark a data source as loaded
  const markLoaded = useCallback((sourceId: string) => {
    if (loadedSourcesRef.current.has(sourceId)) return;

    loadedSourcesRef.current.add(sourceId);

    // Calculate progress
    let loadedWeight = 0;
    DATA_SOURCES.forEach((source) => {
      if (loadedSourcesRef.current.has(source.id)) {
        loadedWeight += source.weight;
      }
    });

    const progress = Math.round((loadedWeight / TOTAL_WEIGHT) * 100);

    // Find next message
    const nextSource = DATA_SOURCES.find(
      (s) => !loadedSourcesRef.current.has(s.id)
    );

    setState({
      isLoading: progress < 100,
      progress,
      message: nextSource?.message || 'Almost ready...',
    });
  }, []);

  // Mark all as loaded (for timeout fallback)
  const completeLoading = useCallback(() => {
    setState({
      isLoading: false,
      progress: 100,
      message: 'Ready!',
    });
  }, []);

  // Set up timeout fallback (max 8 seconds)
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      completeLoading();
    }, 8000);

    // Also set up progress simulation for smoother UX
    const progressInterval = setInterval(() => {
      setState((prev) => {
        if (prev.progress >= 95 || !prev.isLoading) {
          clearInterval(progressInterval);
          return prev;
        }
        // Slowly increment progress even if widgets haven't reported
        const increment = Math.random() * 3;
        return {
          ...prev,
          progress: Math.min(prev.progress + increment, 95),
        };
      });
    }, 200);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      clearInterval(progressInterval);
    };
  }, [completeLoading]);

  return {
    ...state,
    markLoaded,
    completeLoading,
  };
}

// Export data source IDs for widgets to use
export const DATA_SOURCE_IDS = {
  SECTORS: 'sectors',
  GLOBAL_MARKETS: 'globalMarkets',
  SP500: 'sp500',
  CRYPTO: 'crypto',
  SENTIMENT: 'sentiment',
  TREASURY: 'treasury',
  METALS: 'metals',
  CURRENCIES: 'currencies',
  CALENDAR: 'calendar',
  COMMODITIES: 'commodities',
} as const;
