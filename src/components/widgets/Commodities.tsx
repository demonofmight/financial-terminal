import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { IoFlame, IoCube, IoRefresh } from 'react-icons/io5';
import { useLanguage } from '../../i18n';
import { fetchCommodities } from '../../services/api/yahoo';
import { useRefresh } from '../../contexts/RefreshContext';
import { isWeekend } from '../../utils/marketHours';
import { DataTimestamp } from '../ui/DataTimestamp';
import type { QuoteData } from '../../services/api/yahoo';

interface Commodity {
  symbol: string;
  nameKey: string;
  price: number;
  change: number;
  unit: string;
  icon: 'oil' | 'gas' | 'copper';
}

// Commodity info mappings
const commodityInfo: Record<string, { nameKey: string; unit: string; icon: 'oil' | 'gas' | 'copper' }> = {
  'CL=F': { nameKey: 'crudeOil', unit: '/bbl', icon: 'oil' },
  'BZ=F': { nameKey: 'brentCrude', unit: '/bbl', icon: 'oil' },
  'NG=F': { nameKey: 'naturalGas', unit: '/MMBtu', icon: 'gas' },
  'HG=F': { nameKey: 'copper', unit: '/lb', icon: 'copper' },
};

// Fallback mock data
const mockCommodities: Commodity[] = [
  { symbol: 'CL', nameKey: 'crudeOil', price: 78.45, change: 1.23, unit: '/bbl', icon: 'oil' },
  { symbol: 'BZ', nameKey: 'brentCrude', price: 82.67, change: 0.89, unit: '/bbl', icon: 'oil' },
  { symbol: 'NG', nameKey: 'naturalGas', price: 2.34, change: -2.45, unit: '/MMBtu', icon: 'gas' },
  { symbol: 'HG', nameKey: 'copper', price: 4.12, change: 0.67, unit: '/lb', icon: 'copper' },
];

const iconMap = {
  oil: <IoFlame className="text-orange-400" />,
  gas: <IoFlame className="text-blue-400" />,
  copper: <IoCube className="text-amber-500" />,
};

/**
 * Safe number helper - returns defaultValue if value is undefined, null, NaN, or Infinity
 */
function safeNumber(value: number | undefined | null, defaultValue: number = 0): number {
  if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
    return defaultValue;
  }
  return value;
}

interface CommoditiesProps {
  onCommodityClick?: (symbol: string) => void;
}

export function Commodities({ onCommodityClick }: CommoditiesProps) {
  const { t } = useLanguage();
  const { refreshKey } = useRefresh();
  const [commodities, setCommodities] = useState<Commodity[]>(mockCommodities);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastTradeTime, setLastTradeTime] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchCommodities();

      const processedCommodities: Commodity[] = data.map((quote: QuoteData) => {
        const info = commodityInfo[quote.symbol] || { nameKey: quote.symbol, unit: '', icon: 'oil' as const };
        return {
          symbol: quote.symbol.replace('=F', ''),
          nameKey: info.nameKey,
          price: safeNumber(quote.price, 0),
          change: safeNumber(quote.changePercent, 0),
          unit: info.unit,
          icon: info.icon,
        };
      });

      setCommodities(processedCommodities.length > 0 ? processedCommodities : mockCommodities);

      // Store last trade time
      if (data.length > 0 && data[0].lastTradeTime) {
        setLastTradeTime(data[0].lastTradeTime);
      }
    } catch (err) {
      console.error('Failed to fetch commodities:', err);
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

  // Economic signal based on copper (Dr. Copper)
  const copper = commodities.find(c => c.symbol === 'HG');
  const copperChange = safeNumber(copper?.change, 0);
  const economicSignal = copperChange > 0
    ? { text: t('growthSignal'), class: 'text-neon-green', icon: '📈' }
    : { text: t('slowdownRisk'), class: 'text-neon-amber', icon: '📉' };

  return (
    <Card
      title={t('commodities')}
      headerAction={
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-1.5 rounded text-gray-500 hover:text-gray-300 transition-all"
            title="Refresh"
          >
            <IoRefresh className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <div className={`flex items-center gap-1 text-[10px] ${economicSignal.class}`}>
            <span>{economicSignal.icon}</span>
            <span>{economicSignal.text}</span>
          </div>
        </div>
      }
    >
      {isLoading && commodities === mockCommodities ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {commodities.map((commodity) => {
            const price = safeNumber(commodity.price, 0);
            const change = safeNumber(commodity.change, 0);
            return (
              <button
                key={commodity.symbol}
                onClick={() => onCommodityClick?.(commodity.symbol)}
                className="w-full flex items-center justify-between p-3 rounded bg-terminal-border/20 hover:bg-terminal-border/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {iconMap[commodity.icon]}
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-white font-medium">{t(commodity.nameKey)}</div>
                    <div className="text-xs text-gray-500 font-mono">{commodity.symbol}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-mono text-white">
                    ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                    <span className="text-xs text-gray-500 ml-1">{commodity.unit}</span>
                  </div>
                  <div className={`text-sm font-mono ${change >= 0 ? 'value-positive' : 'value-negative'}`}>
                    {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                  </div>
                </div>
              </button>
            );
          })}

          {/* Copper as Economic Indicator */}
          <div className="mt-4 pt-4 border-t border-terminal-border">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              {t('drCopperSays')}
            </div>
            <div className={`flex items-center gap-2 p-3 rounded text-sm ${
              copperChange > 0
                ? 'bg-neon-green/10 border border-neon-green/30'
                : 'bg-neon-amber/10 border border-neon-amber/30'
            }`}>
              <IoCube className={`text-lg ${copperChange > 0 ? 'text-neon-green' : 'text-neon-amber'}`} />
              <span className="text-gray-300">
                {copperChange > 0 ? t('demandRising') : t('demandWeakening')}
              </span>
            </div>
          </div>

          {/* Show timestamp on weekends when futures are closed */}
          {isWeekend() && lastTradeTime && (
            <div className="text-center mt-2">
              <DataTimestamp timestamp={lastTradeTime} />
            </div>
          )}

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
