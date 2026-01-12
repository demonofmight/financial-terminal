import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { IoRefresh } from 'react-icons/io5';
import { useLanguage } from '../../i18n';
import { fetchCurrencyRates } from '../../services/api/exchange';
import { useRefresh } from '../../contexts/RefreshContext';

interface CurrencyPair {
  pair: string;
  base: string;
  quote: string;
  rate: number;
  change: number;
  flag1: string;
  flag2: string;
}

// Fallback mock data
const mockCurrencies: CurrencyPair[] = [
  { pair: 'USD/TRY', base: 'USD', quote: 'TRY', rate: 32.4567, change: 0.45, flag1: '🇺🇸', flag2: '🇹🇷' },
  { pair: 'EUR/USD', base: 'EUR', quote: 'USD', rate: 1.0876, change: -0.23, flag1: '🇪🇺', flag2: '🇺🇸' },
  { pair: 'EUR/TRY', base: 'EUR', quote: 'TRY', rate: 35.2890, change: 0.67, flag1: '🇪🇺', flag2: '🇹🇷' },
  { pair: 'GBP/USD', base: 'GBP', quote: 'USD', rate: 1.2654, change: 0.12, flag1: '🇬🇧', flag2: '🇺🇸' },
  { pair: 'USD/JPY', base: 'USD', quote: 'JPY', rate: 154.23, change: -0.34, flag1: '🇺🇸', flag2: '🇯🇵' },
];

const pairFlags: Record<string, { flag1: string; flag2: string }> = {
  'USD/TRY': { flag1: '🇺🇸', flag2: '🇹🇷' },
  'EUR/USD': { flag1: '🇪🇺', flag2: '🇺🇸' },
  'EUR/TRY': { flag1: '🇪🇺', flag2: '🇹🇷' },
  'GBP/USD': { flag1: '🇬🇧', flag2: '🇺🇸' },
  'USD/JPY': { flag1: '🇺🇸', flag2: '🇯🇵' },
};

interface CurrencyRatesProps {
  onPairClick?: (pair: string) => void;
}

export function CurrencyRates({ onPairClick }: CurrencyRatesProps) {
  const { t } = useLanguage();
  const { refreshKey } = useRefresh();
  const [currencies, setCurrencies] = useState<CurrencyPair[]>(mockCurrencies);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchCurrencyRates();
      setCurrencies(data.map((c) => {
        const [base, quote] = c.pair.split('/');
        const flags = pairFlags[c.pair] || { flag1: '🏳️', flag2: '🏳️' };
        return {
          pair: c.pair,
          base,
          quote,
          rate: c.rate,
          change: c.changesPercentage,
          ...flags,
        };
      }));
    } catch (err) {
      console.error('Failed to fetch currency rates:', err);
      setError('Failed to load');
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
      title={t('currencyRates')}
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
      {isLoading && currencies === mockCurrencies ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {currencies.map((currency) => (
              <button
                key={currency.pair}
                onClick={() => onPairClick?.(currency.pair)}
                className="w-full flex items-center justify-between p-3 rounded bg-terminal-border/30 hover:bg-terminal-border/50 transition-all group"
              >
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center">
                    <span className="text-xl">{currency.flag1}</span>
                    <span className="text-xl ml-0.5">{currency.flag2}</span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">{currency.pair}</div>
                    <div className="text-xs text-gray-500 font-mono">
                      {currency.base}/{currency.quote}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <div className="font-mono text-base text-white">
                    {currency.rate.toLocaleString('en-US', {
                      minimumFractionDigits: currency.rate > 100 ? 2 : 4,
                      maximumFractionDigits: currency.rate > 100 ? 2 : 4,
                    })}
                  </div>
                  <div className={`font-mono text-sm ${
                    currency.change >= 0 ? 'value-positive' : 'value-negative'
                  }`}>
                    {currency.change >= 0 ? '▲' : '▼'} {Math.abs(currency.change).toFixed(2)}%
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Mini sparkline placeholder */}
          <div className="mt-3 pt-3 border-t border-terminal-border">
            <div className="text-[10px] text-gray-500 mb-2">USD/TRY 24h</div>
            <div className="h-8 flex items-end gap-px">
              {[32.1, 32.2, 32.15, 32.3, 32.25, 32.4, 32.35, 32.45, 32.4, 32.5, 32.45, 32.46].map((val, i) => (
                <div
                  key={i}
                  className="flex-1 bg-neon-cyan/40 rounded-t-sm transition-all hover:bg-neon-cyan/60"
                  style={{
                    height: `${((val - 32) / 0.5) * 100}%`,
                    minHeight: '4px',
                  }}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="text-center mt-2">
              <span className="text-[10px] text-neon-amber">Using cached data</span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
