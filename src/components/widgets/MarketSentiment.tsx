import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../ui/Card';
import { IoRefresh, IoWarning, IoCheckmarkCircle, IoAlertCircle } from 'react-icons/io5';
import { motion } from 'framer-motion';
import { useLanguage } from '../../i18n';
import { fetchFearGreedIndex, type FearGreedData } from '../../services/api/feargreed';
import { fetchVIX } from '../../services/api/yahoo';
import { useRefresh } from '../../contexts/RefreshContext';
import { useLoading, DATA_SOURCE_IDS } from '../../contexts/LoadingContext';

const STORAGE_KEY = 'feargreed_last_fetch';
const REFRESH_INTERVAL = 24 * 60 * 60 * 1000;

const getAccentColor = (value: number): string => {
  if (value <= 25) return '#ef4444';
  if (value <= 45) return '#f97316';
  if (value <= 55) return '#eab308';
  if (value <= 75) return '#84cc16';
  return '#22c55e';
};

interface MarketSentimentProps {
  onFearGreedClick?: () => void;
  onVixClick?: () => void;
}

export function MarketSentiment({ onFearGreedClick, onVixClick }: MarketSentimentProps) {
  const { t } = useLanguage();
  const { refreshKey } = useRefresh();
  const { markLoaded } = useLoading();
  const hasMarkedLoaded = useRef(false);
  const lastRefreshKeyRef = useRef(0);

  // Fear & Greed state
  const [fgData, setFgData] = useState<FearGreedData | null>(null);
  const [fgLoading, setFgLoading] = useState(true);

  // VIX state
  const [vixValue, setVixValue] = useState(18.45);
  const [vixChange, setVixChange] = useState(-1.23);
  const [vixLoading, setVixLoading] = useState(true);

  const fetchFearGreedData = useCallback(async (force = false) => {
    if (!force) {
      const lastFetch = localStorage.getItem(STORAGE_KEY);
      if (lastFetch) {
        const timeSinceLastFetch = Date.now() - parseInt(lastFetch, 10);
        if (timeSinceLastFetch < REFRESH_INTERVAL) {
          return;
        }
      }
    }

    setFgLoading(true);
    try {
      const result = await fetchFearGreedIndex(7);
      setFgData(result);
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch (err) {
      console.error('Failed to fetch Fear & Greed:', err);
    } finally {
      setFgLoading(false);
    }
  }, []);

  const fetchVixData = useCallback(async () => {
    setVixLoading(true);
    try {
      const data = await fetchVIX();
      setVixValue(data.price);
      setVixChange(data.changePercent);
    } catch (err) {
      console.error('Failed to fetch VIX:', err);
    } finally {
      setVixLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchFearGreedData(true), fetchVixData()]);
  }, [fetchFearGreedData, fetchVixData]);

  useEffect(() => {
    fetchFearGreedData(true);
    fetchVixData();
  }, [fetchFearGreedData, fetchVixData]);

  useEffect(() => {
    if (refreshKey > 0 && refreshKey !== lastRefreshKeyRef.current) {
      lastRefreshKeyRef.current = refreshKey;
      fetchVixData();
      fetchFearGreedData(false);
    }
  }, [refreshKey, fetchVixData, fetchFearGreedData]);

  // Mark as loaded for initial loading screen
  useEffect(() => {
    if (!fgLoading && !vixLoading && !hasMarkedLoaded.current) {
      markLoaded(DATA_SOURCE_IDS.SENTIMENT);
      hasMarkedLoaded.current = true;
    }
  }, [fgLoading, vixLoading, markLoaded]);

  // Fear & Greed helpers
  const fgValue = fgData?.value ?? 50;
  const fgColor = getAccentColor(fgValue);
  const fgLabel = (() => {
    if (fgValue <= 25) return t('extremeFear');
    if (fgValue <= 45) return t('fear');
    if (fgValue <= 55) return t('neutral');
    if (fgValue <= 75) return t('greed');
    return t('extremeGreed');
  })();
  const fgRotation = (fgValue / 100) * 180 - 90;

  // VIX helpers
  const getVixStatus = (value: number) => {
    if (value < 15) return { label: t('lowVolatility'), color: '#22c55e', icon: IoCheckmarkCircle };
    if (value < 25) return { label: t('moderateVolatility'), color: '#f59e0b', icon: IoAlertCircle };
    if (value < 35) return { label: t('highVolatility'), color: '#f97316', icon: IoWarning };
    return { label: t('extremeVolatility'), color: '#ef4444', icon: IoWarning };
  };
  const vixStatus = getVixStatus(vixValue);
  const VixIcon = vixStatus.icon;
  const vixBarWidth = Math.min((vixValue / 50) * 100, 100);

  const isLoading = fgLoading && vixLoading;

  return (
    <Card
      title={t('marketSentiment') || 'Market Sentiment'}
      compact
      headerAction={
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRefresh();
          }}
          disabled={isLoading}
          className="p-1 rounded text-neutral-500 hover:text-neutral-300 transition-colors"
          title="Refresh"
        >
          <IoRefresh className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      }
    >
      <div className="space-y-3">
        {/* Fear & Greed Section */}
        <div
          className="cursor-pointer hover:bg-terminal-card-hover rounded-md p-2 -m-1 transition-colors"
          onClick={onFearGreedClick}
        >
          <div className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">
            {t('fearGreedIndex')}
          </div>
          <div className="flex items-center gap-3">
            {/* Mini Gauge */}
            <div className="relative w-16 h-8 flex-shrink-0">
              <svg viewBox="0 0 100 50" className="w-full h-full">
                <defs>
                  <linearGradient id="fgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="25%" stopColor="#f97316" />
                    <stop offset="50%" stopColor="#eab308" />
                    <stop offset="75%" stopColor="#84cc16" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
                <path
                  d="M 10 48 A 40 40 0 0 1 90 48"
                  fill="none"
                  stroke="#262626"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M 10 48 A 40 40 0 0 1 90 48"
                  fill="none"
                  stroke="url(#fgGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  opacity="0.3"
                />
                <motion.g
                  animate={{ rotate: fgRotation }}
                  transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                  style={{ transformOrigin: '50px 48px' }}
                >
                  <line x1="50" y1="48" x2="50" y2="18" stroke={fgColor} strokeWidth="2" strokeLinecap="round" />
                  <circle cx="50" cy="48" r="3" fill={fgColor} />
                </motion.g>
              </svg>
            </div>

            {/* Value & Label */}
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <motion.span
                  className="text-xl font-mono font-bold"
                  style={{ color: fgColor }}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                >
                  {fgValue}
                </motion.span>
                <span className="text-xs font-medium" style={{ color: fgColor }}>
                  {fgLabel}
                </span>
              </div>
              {/* Mini historical bars */}
              {fgData?.historicalData && (
                <div className="flex gap-0.5 h-2 mt-1">
                  {fgData.historicalData.slice().reverse().map((item, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm"
                      style={{ backgroundColor: getAccentColor(item.value), opacity: 0.4 + (i / 10) }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-[10px] text-neutral-600 mt-1">{t('cryptoSentiment')}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-terminal-border"></div>

        {/* VIX Section */}
        <div
          className="cursor-pointer hover:bg-terminal-card-hover rounded-md p-2 -m-1 transition-colors"
          onClick={onVixClick}
        >
          <div className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">
            {t('vixVolatility')}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.span
                className="text-xl font-mono font-bold"
                style={{ color: vixStatus.color }}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
              >
                {vixValue.toFixed(2)}
              </motion.span>
              <span className={`text-xs font-mono ${vixChange >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                {vixChange >= 0 ? '+' : ''}{vixChange.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
              style={{ backgroundColor: `${vixStatus.color}15`, border: `1px solid ${vixStatus.color}30` }}
            >
              <VixIcon style={{ color: vixStatus.color }} className="text-xs" />
              <span style={{ color: vixStatus.color }}>{vixStatus.label.split(' ')[0]}</span>
            </div>
          </div>

          {/* VIX Bar */}
          <div className="mt-2">
            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${vixBarWidth}%` }}
                transition={{ duration: 0.5 }}
                style={{ background: `linear-gradient(90deg, ${vixStatus.color}90, ${vixStatus.color})` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-neutral-600 mt-0.5">
              <span>0</span>
              <span>15</span>
              <span>25</span>
              <span>35</span>
              <span>50+</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
