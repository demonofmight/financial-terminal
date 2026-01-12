import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { IoGlobeOutline, IoRefresh } from 'react-icons/io5';
import { useLanguage } from '../../i18n';
import { fetchGlobalIndices, fetchUSFutures } from '../../services/api/yahoo';
import { useRefresh } from '../../contexts/RefreshContext';
import { getMarketStatus as getCentralMarketStatus, getAsiaGroupedStatus, type MarketStatus } from '../../utils/marketHours';
import type { QuoteData } from '../../services/api/yahoo';

interface MarketIndex {
  symbol: string;
  name: string;
  region: string;
  value: number;
  change: number;
  status: MarketStatus;
  isFutures?: boolean;
}

// Index name and region mappings
const indexInfo: Record<string, { name: string; region: string }> = {
  '^GSPC': { name: 'S&P 500', region: 'US' },
  '^DJI': { name: 'Dow Jones', region: 'US' },
  '^IXIC': { name: 'NASDAQ', region: 'US' },
  '^GDAXI': { name: 'DAX 40', region: 'DE' },
  '^FTSE': { name: 'FTSE 100', region: 'UK' },
  '^FCHI': { name: 'CAC 40', region: 'FR' },
  '^N225': { name: 'Nikkei 225', region: 'JP' },
  '^HSI': { name: 'Hang Seng', region: 'HK' },
  '^KS11': { name: 'KOSPI', region: 'KR' },
};

// US Futures mappings (for extended hours trading) - CFD-style naming
const futuresInfo: Record<string, { name: string; displaySymbol: string }> = {
  'ES=F': { name: 'US500', displaySymbol: 'US500' },
  'NQ=F': { name: 'US100', displaySymbol: 'US100' },
  'YM=F': { name: 'US30', displaySymbol: 'US30' },
};

// Sort order for US indices (30, 100, 500)
const usIndexOrder: Record<string, number> = {
  // Futures
  'US30': 1, 'YM': 1,
  'US100': 2, 'NQ': 2,
  'US500': 3, 'ES': 3,
  // Regular indices
  'DJI': 1, '^DJI': 1,
  'IXIC': 2, '^IXIC': 2,
  'GSPC': 3, '^GSPC': 3,
};

// Fallback mock data (US in 30-100-500 order)
const mockGlobalMarkets: MarketIndex[] = [
  { symbol: 'US30', name: 'US30', region: 'US', value: 38654.42, change: 0.67, status: 'open' },
  { symbol: 'US100', name: 'US100', region: 'US', value: 16156.33, change: 1.24, status: 'open' },
  { symbol: 'US500', name: 'US500', region: 'US', value: 5234.18, change: 0.89, status: 'open' },
  { symbol: 'DAX', name: 'DAX 40', region: 'DE', value: 18235.45, change: -0.32, status: 'closed' },
  { symbol: 'FTSE', name: 'FTSE 100', region: 'UK', value: 8164.12, change: 0.18, status: 'closed' },
  { symbol: 'CAC', name: 'CAC 40', region: 'FR', value: 7628.34, change: -0.45, status: 'closed' },
  { symbol: 'N225', name: 'Nikkei 225', region: 'JP', value: 38471.20, change: 1.89, status: 'closed' },
  { symbol: 'HSI', name: 'Hang Seng', region: 'HK', value: 17089.33, change: -1.12, status: 'closed' },
  { symbol: 'KOSPI', name: 'KOSPI', region: 'KR', value: 2687.45, change: 0.56, status: 'closed' },
];

const regionColors: Record<string, string> = {
  US: 'text-blue-400',
  DE: 'text-yellow-400',
  UK: 'text-red-400',
  FR: 'text-blue-300',
  JP: 'text-pink-400',
  HK: 'text-orange-400',
  KR: 'text-purple-400',
};

const statusLabels: Record<MarketStatus, { text: string; class: string }> = {
  open: { text: 'LIVE', class: 'text-neon-green' },
  closed: { text: 'CLOSED', class: 'text-gray-500' },
  pre: { text: 'PRE-MARKET', class: 'text-neon-amber' },
  post: { text: 'AFTER-HRS', class: 'text-neon-cyan' },
  futures: { text: 'FUTURES', class: 'text-purple-400' },
};

// Region to market ID mapping for centralized status
const regionToMarketId: Record<string, string> = {
  US: 'US',
  DE: 'EU',
  UK: 'EU',
  FR: 'EU',
  JP: 'TOKYO',     // Per-exchange status
  HK: 'HONGKONG',  // Per-exchange status
  KR: 'SEOUL',     // Per-exchange status
};

// Determine market status based on current time using centralized utility
function getMarketStatus(region: string): MarketStatus {
  const marketId = regionToMarketId[region] || 'US';
  const statusInfo = getCentralMarketStatus(marketId);
  return statusInfo.status;
}

interface GlobalMarketsProps {
  onIndexClick?: (symbol: string) => void;
}

export function GlobalMarkets({ onIndexClick }: GlobalMarketsProps) {
  const { t } = useLanguage();
  const { refreshKey } = useRefresh();
  const [markets, setMarkets] = useState<MarketIndex[]>(mockGlobalMarkets);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check US market status to determine if we should fetch futures
      const usMarketStatus = getCentralMarketStatus('US');
      const isExtendedHours = usMarketStatus.status === 'pre' ||
                              usMarketStatus.status === 'post' ||
                              usMarketStatus.status === 'futures';

      // Fetch global indices (always fetch all)
      const indicesData = await fetchGlobalIndices();

      // Separate US and non-US indices
      const usIndices = indicesData.filter((q: QuoteData) =>
        q.symbol === '^GSPC' || q.symbol === '^DJI' || q.symbol === '^IXIC'
      );
      const nonUSIndices = indicesData.filter((q: QuoteData) =>
        q.symbol !== '^GSPC' && q.symbol !== '^DJI' && q.symbol !== '^IXIC'
      );

      // Process non-US indices (Europe + Asia)
      const processedNonUS: MarketIndex[] = nonUSIndices.map((quote: QuoteData) => {
        const info = indexInfo[quote.symbol] || { name: quote.symbol, region: 'US' };
        return {
          symbol: quote.symbol.replace('^', ''),
          name: info.name,
          region: info.region,
          value: quote.price,
          change: quote.changePercent,
          status: getMarketStatus(info.region),
        };
      });

      // Handle US data - try futures during extended hours, fallback to indices
      let usMarketData: MarketIndex[] = [];

      if (isExtendedHours) {
        try {
          const futuresData = await fetchUSFutures();
          if (futuresData.length > 0) {
            usMarketData = futuresData.map((quote: QuoteData) => {
              const info = futuresInfo[quote.symbol] || { name: quote.symbol, displaySymbol: quote.symbol };
              return {
                symbol: info.displaySymbol,
                name: info.name,
                region: 'US',
                value: quote.price,
                change: quote.changePercent,
                status: usMarketStatus.status,
                isFutures: true,
              };
            });
            console.log('[GlobalMarkets] Using futures data for US:', usMarketData.length);
          }
        } catch (futuresErr) {
          console.warn('[GlobalMarkets] Futures fetch failed, using indices:', futuresErr);
        }
      }

      // Fallback to regular indices if no futures data
      if (usMarketData.length === 0) {
        usMarketData = usIndices.map((quote: QuoteData) => {
          const info = indexInfo[quote.symbol] || { name: quote.symbol, region: 'US' };
          return {
            symbol: quote.symbol.replace('^', ''),
            name: info.name,
            region: info.region,
            value: quote.price,
            change: quote.changePercent,
            status: getMarketStatus(info.region),
          };
        });
      }

      // Sort US data by index order (30, 100, 500)
      usMarketData.sort((a, b) => {
        const orderA = usIndexOrder[a.symbol] || 99;
        const orderB = usIndexOrder[b.symbol] || 99;
        return orderA - orderB;
      });

      // Combine: US first (sorted), then non-US
      setMarkets([...usMarketData, ...processedNonUS]);
    } catch (err) {
      console.error('Failed to fetch global markets:', err);
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

  // Group by region
  const americas = markets.filter(m => m.region === 'US');
  const europe = markets.filter(m => ['DE', 'UK', 'FR'].includes(m.region));
  const asia = markets.filter(m => ['JP', 'HK', 'KR'].includes(m.region));

  const renderIndex = (index: MarketIndex) => (
    <button
      key={index.symbol}
      onClick={() => onIndexClick?.(index.symbol)}
      className="flex items-center justify-between p-2.5 rounded bg-terminal-border/20 hover:bg-terminal-border/40 transition-all text-left w-full"
    >
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold ${regionColors[index.region]}`}>
          {index.isFutures ? 'FUT' : index.region}
        </span>
        <div>
          <div className="text-sm text-white font-medium">
            {index.name}
            {index.isFutures && (
              <span className="ml-1 text-[10px] text-purple-400">(LIVE)</span>
            )}
          </div>
          <div className="text-xs text-gray-500 font-mono">{index.symbol}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-mono text-white">
          {index.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </div>
        <div className={`text-xs font-mono ${index.change >= 0 ? 'value-positive' : 'value-negative'}`}>
          {index.change >= 0 ? '▲' : '▼'} {Math.abs(index.change).toFixed(2)}%
        </div>
      </div>
    </button>
  );

  // Get overall status for each region
  const getRegionStatus = (regionMarkets: MarketIndex[]): MarketStatus => {
    if (regionMarkets.length === 0) return 'closed';
    return regionMarkets[0]?.status || 'closed';
  };

  return (
    <Card
      title={t('globalMarkets')}
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
          <div className="flex items-center gap-1 text-[10px]">
            <IoGlobeOutline className="text-neon-cyan" />
            <span className="text-gray-500">{markets.length} {t('indices')}</span>
          </div>
        </div>
      }
    >
      {isLoading && markets === mockGlobalMarkets ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Americas */}
          {americas.length > 0 && (
            <div>
              <div className="text-[10px] text-blue-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span>🇺🇸</span> {t('americas')}
                <span className={`ml-auto ${statusLabels[getRegionStatus(americas)].class}`}>
                  ● {statusLabels[getRegionStatus(americas)].text}
                </span>
              </div>
              <div className="space-y-1">
                {americas.map(renderIndex)}
              </div>
            </div>
          )}

          {/* Europe */}
          {europe.length > 0 && (
            <div>
              <div className="text-[10px] text-yellow-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span>🇪🇺</span> {t('europe')}
                <span className={`ml-auto ${statusLabels[getRegionStatus(europe)].class}`}>
                  ● {statusLabels[getRegionStatus(europe)].text}
                </span>
              </div>
              <div className="space-y-1">
                {europe.map(renderIndex)}
              </div>
            </div>
          )}

          {/* Asia - Per-exchange status */}
          {asia.length > 0 && (() => {
            const asiaStatus = getAsiaGroupedStatus();
            return (
              <div>
                <div className="text-[10px] text-pink-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <span>🌏</span> {t('asiaPacific')}
                  <span className={`ml-auto ${asiaStatus.statusClass}`}>
                    ● {asiaStatus.statusText}
                  </span>
                </div>
                <div className="space-y-1">
                  {asia.map(renderIndex)}
                </div>
              </div>
            );
          })()}

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
