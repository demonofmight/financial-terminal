import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { IoRefresh } from 'react-icons/io5';
import { useLanguage } from '../../i18n';
import { fetchPreciousMetals } from '../../services/api/yahoo';
import { useRefresh } from '../../contexts/RefreshContext';

interface Metal {
  symbol: string;
  nameKey: string;
  price: number;
  change: number;
  unit: string;
}

// Fallback mock data
const mockMetals: Metal[] = [
  { symbol: 'XAU', nameKey: 'gold', price: 2047.80, change: -0.32, unit: '/oz' },
  { symbol: 'XAG', nameKey: 'silver', price: 23.45, change: 1.24, unit: '/oz' },
  { symbol: 'XPT', nameKey: 'platinum', price: 912.30, change: -0.87, unit: '/oz' },
  { symbol: 'XPD', nameKey: 'palladium', price: 1023.50, change: 2.15, unit: '/oz' },
];

const metalIcons: Record<string, string> = {
  XAU: '🥇',
  XAG: '🥈',
  XPT: '⚪',
  XPD: '🔘',
};

// Yahoo Finance symbol to display name mapping
const metalNameKeys: Record<string, string> = {
  'GC=F': 'gold',
  'SI=F': 'silver',
  'PL=F': 'platinum',
  'PA=F': 'palladium',
};

// Yahoo Finance symbol to display symbol mapping
const metalDisplaySymbols: Record<string, string> = {
  'GC=F': 'XAU',
  'SI=F': 'XAG',
  'PL=F': 'XPT',
  'PA=F': 'XPD',
};

interface PreciousMetalsProps {
  onMetalClick?: (symbol: string) => void;
}

export function PreciousMetals({ onMetalClick }: PreciousMetalsProps) {
  const { t } = useLanguage();
  const { refreshKey } = useRefresh();
  const [metals, setMetals] = useState<Metal[]>(mockMetals);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchPreciousMetals();
      console.log('Metals data received:', data);

      if (data && data.length > 0) {
        setMetals(data.map((m) => ({
          symbol: metalDisplaySymbols[m.symbol] || m.symbol,
          nameKey: metalNameKeys[m.symbol] || 'gold',
          price: m.price,
          change: m.changePercent,
          unit: '/oz',
        })));
      } else {
        console.warn('No metal data received, using mock data');
        setError('Using cached data');
      }
    } catch (err) {
      console.error('Failed to fetch metal prices:', err);
      setError('Using cached data');
      // Keep mock data as fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for global refresh
  useEffect(() => {
    if (refreshKey > 0) {
      fetchData();
    }
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card
      title={t('preciousMetals')}
      headerAction={
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="p-1.5 rounded text-gray-500 hover:text-gray-300 transition-all"
          title="Refresh"
        >
          <IoRefresh className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      }
    >
      {isLoading && metals === mockMetals ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {metals.map((metal) => (
            <button
              key={metal.symbol}
              onClick={() => onMetalClick?.(metal.symbol)}
              className="w-full flex items-center justify-between p-3 rounded bg-terminal-border/30 hover:bg-terminal-border/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{metalIcons[metal.symbol]}</span>
                <div className="text-left">
                  <div className="text-xs text-gray-400">{metal.symbol}</div>
                  <div className="text-sm font-medium text-white">{t(metal.nameKey)}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-base text-white">
                  ${metal.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  <span className="text-gray-500 text-xs ml-1">{metal.unit}</span>
                </div>
                <div className={`font-mono text-sm ${
                  metal.change >= 0 ? 'value-positive' : 'value-negative'
                }`}>
                  {metal.change >= 0 ? '▲' : '▼'} {Math.abs(metal.change).toFixed(2)}%
                </div>
              </div>
            </button>
          ))}

          {error && (
            <div className="text-center mt-2">
              <span className="text-[10px] text-neon-amber">Using cached data</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
