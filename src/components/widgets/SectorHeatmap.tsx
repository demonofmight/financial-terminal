import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { IoRefresh } from 'react-icons/io5';
import { useLanguage } from '../../i18n';
import { fetchSectorPerformance } from '../../services/api/yahoo';
import { useRefresh } from '../../contexts/RefreshContext';
import { isMarketOpen } from '../../utils/marketHours';
import { DataTimestamp } from '../ui/DataTimestamp';

interface Sector {
  symbol: string;
  name: string;
  change: number;
}

// Fallback mock data (including Defense)
const mockSectors: Sector[] = [
  { symbol: 'XLK', name: 'Technology', change: 2.34 },
  { symbol: 'XLV', name: 'Healthcare', change: 1.12 },
  { symbol: 'XLF', name: 'Financials', change: -0.87 },
  { symbol: 'XLE', name: 'Energy', change: -2.15 },
  { symbol: 'XLY', name: 'Consumer Discretionary', change: 1.56 },
  { symbol: 'XLI', name: 'Industrials', change: 0.43 },
  { symbol: 'XLB', name: 'Materials', change: -0.32 },
  { symbol: 'XLRE', name: 'Real Estate', change: -1.24 },
  { symbol: 'XLU', name: 'Utilities', change: 0.21 },
  { symbol: 'XLC', name: 'Communication', change: 1.89 },
  { symbol: 'XLP', name: 'Consumer Staples', change: 0.67 },
  { symbol: 'ITA', name: 'Aerospace & Defense', change: 1.45 },
];

/**
 * Safe number helper - returns 0 if value is undefined, null, NaN, or Infinity
 */
function safeNumber(value: number | undefined | null, defaultValue: number = 0): number {
  if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
    return defaultValue;
  }
  return value;
}

function getColorIntensity(change: number): string {
  const absChange = Math.abs(change);
  if (change > 0) {
    if (absChange > 2) return 'bg-neon-green/40 border-neon-green/60';
    if (absChange > 1) return 'bg-neon-green/25 border-neon-green/40';
    return 'bg-neon-green/15 border-neon-green/25';
  } else {
    if (absChange > 2) return 'bg-neon-red/40 border-neon-red/60';
    if (absChange > 1) return 'bg-neon-red/25 border-neon-red/40';
    return 'bg-neon-red/15 border-neon-red/25';
  }
}

interface SectorHeatmapProps {
  onSectorClick?: (symbol: string) => void;
}

export function SectorHeatmap({ onSectorClick }: SectorHeatmapProps) {
  const { t } = useLanguage();
  const { refreshKey } = useRefresh();
  const [sectors, setSectors] = useState<Sector[]>(mockSectors);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastTradeTime, setLastTradeTime] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchSectorPerformance();
      console.log('Sector data received:', data);

      // Map Yahoo Finance data (uses changePercent not changesPercentage)
      if (data && data.length > 0) {
        const sectorData = data.map(s => ({
          symbol: s.symbol,
          name: s.symbol, // Name will come from translations
          change: safeNumber(s.changePercent, 0),
        }));
        setSectors(sectorData);

        // Store the last trade time from first item (all should be similar)
        if (data[0].lastTradeTime) {
          setLastTradeTime(data[0].lastTradeTime);
        }
      } else {
        console.warn('No sector data received, using mock data');
        setError('Using cached data');
      }
    } catch (err) {
      console.error('Failed to fetch sector data:', err);
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
      title={t('sectorPerformance')}
      className="col-span-2 row-span-2"
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
      {isLoading && sectors === mockSectors ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            {sectors.map((sector) => {
              const change = safeNumber(sector.change, 0);
              return (
                <button
                  key={sector.symbol}
                  onClick={() => onSectorClick?.(sector.symbol)}
                  className={`
                    p-3 rounded border transition-all duration-200
                    ${getColorIntensity(change)}
                    hover:scale-[1.02] hover:z-10 relative group
                  `}
                >
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                    {sector.symbol}
                  </div>
                  <div className="text-sm font-medium text-white truncate">
                    {t(`sectors.${sector.symbol}`) || sector.name}
                  </div>
                  <div className={`text-xl font-mono font-bold mt-1 ${
                    change >= 0 ? 'value-positive' : 'value-negative'
                  }`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                  </div>

                  {/* Hover glow effect */}
                  <div className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      boxShadow: change >= 0
                        ? '0 0 20px rgba(0, 255, 136, 0.3), inset 0 0 20px rgba(0, 255, 136, 0.1)'
                        : '0 0 20px rgba(255, 51, 102, 0.3), inset 0 0 20px rgba(255, 51, 102, 0.1)'
                    }}
                  />
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-terminal-border">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-neon-red/40"></div>
              <span>{t('strongSell')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-neon-red/20"></div>
              <span>{t('weak')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-neon-green/20"></div>
              <span>{t('gaining')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-neon-green/40"></div>
              <span>{t('strongBuy')}</span>
            </div>
          </div>

          {/* Show timestamp when market is closed */}
          {!isMarketOpen('US') && lastTradeTime && (
            <div className="text-center mt-2">
              <DataTimestamp timestamp={lastTradeTime} />
            </div>
          )}

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
