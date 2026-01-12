import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../ui/Card';
import { IoTrendingUp, IoTrendingDown, IoRefresh } from 'react-icons/io5';
import { motion } from 'framer-motion';
import { useLanguage } from '../../i18n';
import { fetchSP500TopMovers } from '../../services/api/yahoo';
import { useRefresh } from '../../contexts/RefreshContext';
import { useLoading, DATA_SOURCE_IDS } from '../../contexts/LoadingContext';

type TimeFrame = 'daily' | 'weekly' | 'monthly';

interface Mover {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

const mockDailyGainers: Mover[] = [
  { symbol: 'NVDA', name: 'NVIDIA Corp', price: 875.42, change: 3.45 },
  { symbol: 'AAPL', name: 'Apple Inc', price: 182.52, change: 2.12 },
  { symbol: 'MSFT', name: 'Microsoft', price: 415.28, change: 1.89 },
  { symbol: 'GOOGL', name: 'Alphabet', price: 141.80, change: 1.45 },
  { symbol: 'AMZN', name: 'Amazon', price: 178.25, change: 1.23 },
];

const mockDailyLosers: Mover[] = [
  { symbol: 'TSLA', name: 'Tesla Inc', price: 175.34, change: -2.45 },
  { symbol: 'META', name: 'Meta Platforms', price: 485.58, change: -1.87 },
  { symbol: 'JPM', name: 'JPMorgan Chase', price: 195.42, change: -1.23 },
  { symbol: 'V', name: 'Visa Inc', price: 275.80, change: -0.98 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', price: 156.32, change: -0.67 },
];

const mockWeeklyMonthly = {
  weekly: {
    gainers: [
      { symbol: 'SMCI', name: 'Super Micro', price: 892.34, change: 24.56 },
      { symbol: 'NVDA', name: 'NVIDIA Corp', price: 875.42, change: 18.23 },
      { symbol: 'ARM', name: 'Arm Holdings', price: 134.56, change: 15.67 },
      { symbol: 'PLTR', name: 'Palantir', price: 24.89, change: 12.34 },
      { symbol: 'CRWD', name: 'CrowdStrike', price: 312.45, change: 10.21 },
    ],
    losers: [
      { symbol: 'MRNA', name: 'Moderna', price: 98.23, change: -12.45 },
      { symbol: 'PARA', name: 'Paramount', price: 12.34, change: -8.76 },
      { symbol: 'WBA', name: 'Walgreens', price: 18.90, change: -7.23 },
      { symbol: 'DVN', name: 'Devon Energy', price: 45.67, change: -6.54 },
      { symbol: 'HAL', name: 'Halliburton', price: 34.56, change: -5.43 },
    ],
  },
  monthly: {
    gainers: [
      { symbol: 'SMCI', name: 'Super Micro', price: 892.34, change: 67.89 },
      { symbol: 'NVDA', name: 'NVIDIA Corp', price: 875.42, change: 45.32 },
      { symbol: 'VST', name: 'Vistra Corp', price: 78.90, change: 38.45 },
      { symbol: 'DECK', name: 'Deckers', price: 945.67, change: 32.10 },
      { symbol: 'AXON', name: 'Axon Enterp.', price: 312.34, change: 28.76 },
    ],
    losers: [
      { symbol: 'ENPH', name: 'Enphase', price: 98.45, change: -25.43 },
      { symbol: 'SEDG', name: 'SolarEdge', price: 67.89, change: -22.34 },
      { symbol: 'MRNA', name: 'Moderna', price: 98.23, change: -18.76 },
      { symbol: 'ALGN', name: 'Align Tech', price: 234.56, change: -15.43 },
      { symbol: 'PAYC', name: 'Paycom', price: 178.90, change: -12.34 },
    ],
  },
};

interface SP500TopMoversProps {
  onStockClick?: (symbol: string) => void;
}

export function SP500TopMovers({ onStockClick }: SP500TopMoversProps) {
  const { t } = useLanguage();
  const { refreshKey } = useRefresh();
  const { markLoaded } = useLoading();
  const hasMarkedLoaded = useRef(false);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('daily');
  const [showGainers, setShowGainers] = useState(true);
  const [dailyGainers, setDailyGainers] = useState<Mover[]>(mockDailyGainers);
  const [dailyLosers, setDailyLosers] = useState<Mover[]>(mockDailyLosers);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { gainers, losers } = await fetchSP500TopMovers();

      if (gainers.length > 0 || losers.length > 0) {
        setDailyGainers(gainers.map(s => ({
          symbol: s.symbol,
          name: s.symbol,
          price: s.price,
          change: s.changePercent,
        })));

        setDailyLosers(losers.map(s => ({
          symbol: s.symbol,
          name: s.symbol,
          price: s.price,
          change: s.changePercent,
        })));
      } else {
        setError('Using cached data');
      }
    } catch (err) {
      console.error('Failed to fetch S&P 500 data:', err);
      setError('Using cached data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refreshKey > 0) {
      fetchData();
    }
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark as loaded for initial loading screen
  useEffect(() => {
    if (!isLoading && !hasMarkedLoaded.current) {
      markLoaded(DATA_SOURCE_IDS.SP500);
      hasMarkedLoaded.current = true;
    }
  }, [isLoading, markLoaded]);

  const getMovers = (): Mover[] => {
    if (timeFrame === 'daily') {
      return showGainers ? dailyGainers : dailyLosers;
    }
    const data = mockWeeklyMonthly[timeFrame];
    return showGainers ? data.gainers : data.losers;
  };

  const movers = getMovers();

  const timeFrameLabels: Record<TimeFrame, string> = {
    daily: t('daily'),
    weekly: t('weekly'),
    monthly: t('monthly'),
  };

  return (
    <Card
      title={t('sp500TopMovers')}
      compact
      headerAction={
        <div className="flex items-center gap-1">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-1 rounded text-neutral-500 hover:text-neutral-300 transition-colors mr-1"
            title="Refresh"
          >
            <IoRefresh className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {(['daily', 'weekly', 'monthly'] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeFrame(tf)}
              className={`px-2 py-0.5 text-[10px] rounded transition-all ${
                timeFrame === tf
                  ? 'bg-accent-green/15 text-accent-green border border-accent-green/25'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {timeFrameLabels[tf].charAt(0).toUpperCase()}
            </button>
          ))}
        </div>
      }
    >
      {/* Toggle */}
      <div className="flex gap-1.5 mb-3">
        <button
          onClick={() => setShowGainers(true)}
          className={`flex-1 py-2 text-xs rounded-md flex items-center justify-center gap-1.5 transition-all ${
            showGainers
              ? 'bg-accent-green/10 text-accent-green border border-accent-green/25'
              : 'bg-terminal-card-hover text-neutral-500 border border-transparent hover:border-terminal-border'
          }`}
        >
          <IoTrendingUp /> {t('topGainers')}
        </button>
        <button
          onClick={() => setShowGainers(false)}
          className={`flex-1 py-2 text-xs rounded-md flex items-center justify-center gap-1.5 transition-all ${
            !showGainers
              ? 'bg-accent-red/10 text-accent-red border border-accent-red/25'
              : 'bg-terminal-card-hover text-neutral-500 border border-transparent hover:border-terminal-border'
          }`}
        >
          <IoTrendingDown /> {t('topLosers')}
        </button>
      </div>

      {/* Content */}
      {isLoading && movers.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin"></div>
        </div>
      ) : error && movers.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-accent-red">{error}</p>
          <button onClick={fetchData} className="mt-2 text-xs text-neutral-400 hover:text-white">
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {movers.slice(0, 5).map((stock, index) => (
              <motion.button
                key={stock.symbol}
                onClick={() => onStockClick?.(stock.symbol)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="w-full flex items-center justify-between p-2 rounded-md bg-terminal-card-hover/30 hover:bg-terminal-card-hover border border-transparent hover:border-terminal-border transition-all duration-150 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-accent-cyan">{stock.symbol}</span>
                  <span className="text-xs text-neutral-400 truncate max-w-[80px]">{stock.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-neutral-300">${stock.price.toFixed(2)}</span>
                  <span className={`font-mono text-xs font-medium ${
                    stock.change >= 0 ? 'text-accent-green' : 'text-accent-red'
                  }`}>
                    {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                  </span>
                </div>
              </motion.button>
            ))}
          </div>

          {timeFrame !== 'daily' && (
            <div className="text-center mt-2">
              <span className="text-[11px] text-accent-amber">Sample data</span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
