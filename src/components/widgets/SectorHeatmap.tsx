import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../ui/Card';
import { IoRefresh } from 'react-icons/io5';
import { motion } from 'framer-motion';
import { useLanguage } from '../../i18n';
import { fetchSectorPerformance } from '../../services/api/yahoo';
import { useRefresh } from '../../contexts/RefreshContext';
import { useLoading, DATA_SOURCE_IDS } from '../../contexts/LoadingContext';
import { isMarketOpen } from '../../utils/marketHours';
import { DataTimestamp } from '../ui/DataTimestamp';

interface Sector {
  symbol: string;
  name: string;
  change: number;
}

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

function safeNumber(value: number | undefined | null, defaultValue: number = 0): number {
  if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
    return defaultValue;
  }
  return value;
}

function getColorIntensity(change: number): string {
  const absChange = Math.abs(change);
  if (change > 0) {
    if (absChange > 2) return 'bg-accent-green/30 border-accent-green/40';
    if (absChange > 1) return 'bg-accent-green/20 border-accent-green/30';
    return 'bg-accent-green/10 border-accent-green/20';
  } else {
    if (absChange > 2) return 'bg-accent-red/30 border-accent-red/40';
    if (absChange > 1) return 'bg-accent-red/20 border-accent-red/30';
    return 'bg-accent-red/10 border-accent-red/20';
  }
}

interface SectorHeatmapProps {
  onSectorClick?: (symbol: string) => void;
}

export function SectorHeatmap({ onSectorClick }: SectorHeatmapProps) {
  const { t } = useLanguage();
  const { refreshKey } = useRefresh();
  const { markLoaded } = useLoading();
  const hasMarkedLoaded = useRef(false);
  const [sectors, setSectors] = useState<Sector[]>(mockSectors);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastTradeTime, setLastTradeTime] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchSectorPerformance();

      if (data && data.length > 0) {
        const sectorData = data.map(s => ({
          symbol: s.symbol,
          name: s.symbol,
          change: safeNumber(s.changePercent, 0),
        }));
        sectorData.sort((a, b) => b.change - a.change);
        setSectors(sectorData);

        if (data[0].lastTradeTime) {
          setLastTradeTime(data[0].lastTradeTime);
        }
      } else {
        setError('Using cached data');
      }
    } catch (err) {
      console.error('Failed to fetch sector data:', err);
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
      markLoaded(DATA_SOURCE_IDS.SECTORS);
      hasMarkedLoaded.current = true;
    }
  }, [isLoading, markLoaded]);

  return (
    <Card
      title={t('sectorPerformance')}
      compact
      headerAction={
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="p-1 rounded text-neutral-500 hover:text-neutral-300 transition-colors"
          title="Refresh"
        >
          <IoRefresh className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      }
    >
      {isLoading && sectors === mockSectors ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            {sectors.map((sector, index) => {
              const change = safeNumber(sector.change, 0);
              return (
                <motion.button
                  key={sector.symbol}
                  onClick={() => onSectorClick?.(sector.symbol)}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    p-2.5 rounded-md border transition-colors duration-200
                    ${getColorIntensity(change)}
                    hover:border-neutral-600
                  `}
                >
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">
                    {sector.symbol}
                  </div>
                  <div className="text-xs font-medium text-neutral-200 truncate">
                    {t(`sectors.${sector.symbol}`) || sector.name}
                  </div>
                  <div className={`text-lg font-mono font-bold mt-0.5 ${
                    change >= 0 ? 'text-accent-green' : 'text-accent-red'
                  }`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-terminal-border">
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
              <div className="w-2.5 h-2.5 rounded bg-accent-red/30"></div>
              <span>{t('strongSell')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
              <div className="w-2.5 h-2.5 rounded bg-accent-red/15"></div>
              <span>{t('weak')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
              <div className="w-2.5 h-2.5 rounded bg-accent-green/15"></div>
              <span>{t('gaining')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
              <div className="w-2.5 h-2.5 rounded bg-accent-green/30"></div>
              <span>{t('strongBuy')}</span>
            </div>
          </div>

          {!isMarketOpen('US') && lastTradeTime && (
            <div className="text-center mt-2">
              <DataTimestamp timestamp={lastTradeTime} />
            </div>
          )}

          {error && (
            <div className="text-center mt-2">
              <span className="text-[11px] text-accent-amber">Using cached data</span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
