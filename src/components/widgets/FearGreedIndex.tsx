import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../ui/Card';
import { IoRefresh } from 'react-icons/io5';
import { useLanguage } from '../../i18n';
import { fetchFearGreedIndex, getColorFromValue, type FearGreedData } from '../../services/api/feargreed';
import { useRefresh } from '../../contexts/RefreshContext';

const STORAGE_KEY = 'feargreed_last_fetch';
const REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours - Fear & Greed updates daily

interface FearGreedIndexProps {
  onClick?: () => void;
}

export function FearGreedIndex({ onClick }: FearGreedIndexProps) {
  const { t } = useLanguage();
  const { refreshKey } = useRefresh();
  const [data, setData] = useState<FearGreedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRefreshKeyRef = useRef(0);

  const fetchData = useCallback(async (force = false) => {
    // Check if we should skip refresh (for auto-refresh, not manual)
    if (!force) {
      const lastFetch = localStorage.getItem(STORAGE_KEY);
      if (lastFetch) {
        const timeSinceLastFetch = Date.now() - parseInt(lastFetch, 10);
        if (timeSinceLastFetch < REFRESH_INTERVAL) {
          console.log('[Fear&Greed] Skipping refresh - data is fresh (updates daily)');
          return;
        }
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFearGreedIndex(7);
      setData(result);
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch Fear & Greed data:', err);
      setError('Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true); // Force fetch on mount
  }, [fetchData]);

  // Listen for global refresh - but only refresh if data is stale
  useEffect(() => {
    if (refreshKey > 0 && refreshKey !== lastRefreshKeyRef.current) {
      lastRefreshKeyRef.current = refreshKey;
      fetchData(false); // Don't force - let it check if needed
    }
  }, [refreshKey, fetchData]);

  // Get translated label based on value
  const getLabel = (val: number) => {
    if (val <= 25) return t('extremeFear');
    if (val <= 45) return t('fear');
    if (val <= 55) return t('neutral');
    if (val <= 75) return t('greed');
    return t('extremeGreed');
  };

  const value = data?.value ?? 50;
  const color = getColorFromValue(value);
  const label = getLabel(value);
  const rotation = (value / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <Card
      title={t('fearGreedIndex')}
      onClick={onClick}
      headerAction={
        <button
          onClick={(e) => {
            e.stopPropagation();
            fetchData(true); // Force refresh on manual click
          }}
          disabled={isLoading}
          className="p-1.5 rounded text-gray-500 hover:text-gray-300 transition-all"
          title="Refresh"
        >
          <IoRefresh className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      }
    >
      {isLoading && !data ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin"></div>
        </div>
      ) : error && !data ? (
        <div className="text-center py-8">
          <p className="text-xs text-neon-red">{error}</p>
          <button onClick={() => fetchData(true)} className="mt-2 text-xs text-gray-400 hover:text-white">
            Try again
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {/* Gauge */}
          <div className="relative w-full max-w-[200px] aspect-[2/1] mb-4">
            {/* Background arc */}
            <svg viewBox="0 0 200 100" className="w-full h-full">
              {/* Gradient arc background */}
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ff3366" />
                  <stop offset="25%" stopColor="#ff6b35" />
                  <stop offset="50%" stopColor="#ffb000" />
                  <stop offset="75%" stopColor="#7ed321" />
                  <stop offset="100%" stopColor="#00ff88" />
                </linearGradient>
              </defs>

              {/* Background track */}
              <path
                d="M 20 95 A 80 80 0 0 1 180 95"
                fill="none"
                stroke="#1e2028"
                strokeWidth="12"
                strokeLinecap="round"
              />

              {/* Colored arc */}
              <path
                d="M 20 95 A 80 80 0 0 1 180 95"
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                opacity="0.3"
              />

              {/* Value indicator line */}
              <g transform={`rotate(${rotation}, 100, 95)`}>
                <line
                  x1="100"
                  y1="95"
                  x2="100"
                  y2="30"
                  stroke={color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{
                    filter: `drop-shadow(0 0 8px ${color})`,
                  }}
                />
                <circle cx="100" cy="95" r="6" fill={color} />
              </g>

              {/* Scale labels */}
              <text x="20" y="85" fill="#6b7280" fontSize="8" textAnchor="middle">0</text>
              <text x="60" y="40" fill="#6b7280" fontSize="8" textAnchor="middle">25</text>
              <text x="100" y="25" fill="#6b7280" fontSize="8" textAnchor="middle">50</text>
              <text x="140" y="40" fill="#6b7280" fontSize="8" textAnchor="middle">75</text>
              <text x="180" y="85" fill="#6b7280" fontSize="8" textAnchor="middle">100</text>
            </svg>

            {/* Center value */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
              <div
                className="text-3xl font-mono font-bold"
                style={{ color, textShadow: `0 0 20px ${color}40` }}
              >
                {value}
              </div>
            </div>
          </div>

          {/* Label */}
          <div
            className="text-sm font-medium uppercase tracking-wider"
            style={{ color }}
          >
            {label}
          </div>

          {/* Scale legend */}
          <div className="flex justify-between w-full mt-4 pt-3 border-t border-terminal-border text-[9px] text-gray-500">
            <span>{t('extremeFear')}</span>
            <span>{t('fear')}</span>
            <span>{t('neutral')}</span>
            <span>{t('greed')}</span>
            <span>{t('extremeGreed')}</span>
          </div>

          {/* Historical mini view */}
          {data?.historicalData && (
            <div className="w-full mt-3 pt-3 border-t border-terminal-border">
              <div className="text-[10px] text-gray-500 mb-2">{t('last7days')}</div>
              <div className="flex gap-1 h-6">
                {data.historicalData
                  .slice()
                  .reverse()
                  .map((item, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-all hover:opacity-80"
                      style={{
                        backgroundColor: getColorFromValue(item.value),
                        opacity: 0.3 + (i / 10),
                      }}
                      title={`${item.date.toLocaleDateString()}: ${item.value} - ${item.classification}`}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Crypto sentiment note */}
          <div className="w-full mt-3 pt-2 border-t border-terminal-border">
            <p className="text-[9px] text-gray-600 text-center">{t('cryptoSentiment')}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
