import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoRefreshOptions {
  /** Refresh interval in milliseconds (default: 5 minutes) */
  interval?: number;
  /** Whether auto-refresh is enabled (default: true) */
  enabled?: boolean;
  /** Callback to execute on each refresh */
  onRefresh: () => void | Promise<void>;
  /** Whether to refresh immediately on mount (default: false) */
  refreshOnMount?: boolean;
}

interface UseAutoRefreshReturn {
  /** Manually trigger a refresh */
  refresh: () => void;
  /** Time until next refresh in seconds */
  timeUntilRefresh: number;
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean;
  /** Toggle auto-refresh on/off */
  setEnabled: (enabled: boolean) => void;
  /** Whether auto-refresh is currently enabled */
  isEnabled: boolean;
  /** Last refresh timestamp */
  lastRefresh: Date | null;
}

const DEFAULT_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useAutoRefresh({
  interval = DEFAULT_INTERVAL,
  enabled = true,
  onRefresh,
  refreshOnMount = false,
}: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(interval / 1000);

  const intervalRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const onRefreshRef = useRef(onRefresh);

  // Keep callback ref updated
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefreshRef.current();
      setLastRefresh(new Date());
      setTimeUntilRefresh(interval / 1000);
    } finally {
      setIsRefreshing(false);
    }
  }, [interval, isRefreshing]);

  // Setup countdown timer
  useEffect(() => {
    if (!isEnabled) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    countdownRef.current = window.setInterval(() => {
      setTimeUntilRefresh((prev) => {
        if (prev <= 1) {
          return interval / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [isEnabled, interval]);

  // Setup auto-refresh interval
  useEffect(() => {
    if (!isEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      refresh();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isEnabled, interval, refresh]);

  // Refresh on mount if requested
  useEffect(() => {
    if (refreshOnMount) {
      refresh();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setEnabled = useCallback((newEnabled: boolean) => {
    setIsEnabled(newEnabled);
    if (newEnabled) {
      setTimeUntilRefresh(interval / 1000);
    }
  }, [interval]);

  return {
    refresh,
    timeUntilRefresh,
    isRefreshing,
    setEnabled,
    isEnabled,
    lastRefresh,
  };
}

// Format time until refresh as MM:SS
export function formatTimeUntilRefresh(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
