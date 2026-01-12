import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../ui/Card';
import { IoRefresh } from 'react-icons/io5';
import { motion } from 'framer-motion';
import { useLanguage } from '../../i18n';
import { fetchFearGreedIndex, type FearGreedData } from '../../services/api/feargreed';
import { useRefresh } from '../../contexts/RefreshContext';

const STORAGE_KEY = 'feargreed_last_fetch';
const REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// Updated color palette (muted, professional)
const getAccentColor = (value: number): string => {
  if (value <= 25) return '#ef4444';  // Extreme Fear - red
  if (value <= 45) return '#f97316';  // Fear - orange
  if (value <= 55) return '#eab308';  // Neutral - yellow
  if (value <= 75) return '#84cc16';  // Greed - lime
  return '#22c55e';                    // Extreme Greed - green
};

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
    if (!force) {
      const lastFetch = localStorage.getItem(STORAGE_KEY);
      if (lastFetch) {
        const timeSinceLastFetch = Date.now() - parseInt(lastFetch, 10);
        if (timeSinceLastFetch < REFRESH_INTERVAL) {
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
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    if (refreshKey > 0 && refreshKey !== lastRefreshKeyRef.current) {
      lastRefreshKeyRef.current = refreshKey;
      fetchData(false);
    }
  }, [refreshKey, fetchData]);

  const getLabel = (val: number) => {
    if (val <= 25) return t('extremeFear');
    if (val <= 45) return t('fear');
    if (val <= 55) return t('neutral');
    if (val <= 75) return t('greed');
    return t('extremeGreed');
  };

  const value = data?.value ?? 50;
  const color = getAccentColor(value);
  const label = getLabel(value);
  const rotation = (value / 100) * 180 - 90;

  return (
    <Card
      title={t('fearGreedIndex')}
      onClick={onClick}
      compact
      headerAction={
        <button
          onClick={(e) => {
            e.stopPropagation();
            fetchData(true);
          }}
          disabled={isLoading}
          className="p-1 rounded text-neutral-500 hover:text-neutral-300 transition-colors"
          title="Refresh"
        >
          <IoRefresh className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      }
    >
      {isLoading && !data ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin"></div>
        </div>
      ) : error && !data ? (
        <div className="text-center py-6">
          <p className="text-xs text-accent-red">{error}</p>
          <button onClick={() => fetchData(true)} className="mt-2 text-xs text-neutral-400 hover:text-white">
            Try again
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {/* Compact Gauge */}
          <div className="relative w-full max-w-[160px] aspect-[2/1] mb-2">
            <svg viewBox="0 0 200 100" className="w-full h-full">
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="25%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="75%" stopColor="#84cc16" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>

              {/* Background track */}
              <path
                d="M 20 95 A 80 80 0 0 1 180 95"
                fill="none"
                stroke="#262626"
                strokeWidth="10"
                strokeLinecap="round"
              />

              {/* Colored arc */}
              <path
                d="M 20 95 A 80 80 0 0 1 180 95"
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                opacity="0.25"
              />

              {/* Value indicator */}
              <motion.g
                animate={{ rotate: rotation }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                style={{ transformOrigin: '100px 95px' }}
              >
                <line
                  x1="100"
                  y1="95"
                  x2="100"
                  y2="35"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="100" cy="95" r="5" fill={color} />
              </motion.g>

              {/* Scale labels */}
              <text x="20" y="85" fill="#525252" fontSize="9" textAnchor="middle">0</text>
              <text x="100" y="22" fill="#525252" fontSize="9" textAnchor="middle">50</text>
              <text x="180" y="85" fill="#525252" fontSize="9" textAnchor="middle">100</text>
            </svg>

            {/* Center value */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
              <motion.div
                className="text-2xl font-mono font-bold"
                style={{ color }}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                {value}
              </motion.div>
            </div>
          </div>

          {/* Label */}
          <div
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color }}
          >
            {label}
          </div>

          {/* Historical mini view */}
          {data?.historicalData && (
            <div className="w-full mt-2 pt-2 border-t border-terminal-border">
              <div className="text-[9px] text-neutral-500 mb-1">{t('last7days')}</div>
              <div className="flex gap-0.5 h-4">
                {data.historicalData
                  .slice()
                  .reverse()
                  .map((item, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-sm"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: i * 0.05 }}
                      style={{
                        backgroundColor: getAccentColor(item.value),
                        opacity: 0.4 + (i / 12),
                      }}
                      title={`${item.date.toLocaleDateString()}: ${item.value}`}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Crypto sentiment note */}
          <p className="text-[8px] text-neutral-600 text-center mt-2">{t('cryptoSentiment')}</p>
        </div>
      )}
    </Card>
  );
}
