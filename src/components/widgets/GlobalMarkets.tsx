import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../ui/Card';
import { IoGlobeOutline, IoRefresh } from 'react-icons/io5';
import { motion } from 'framer-motion';
import { useLanguage } from '../../i18n';
import { fetchGlobalIndices, fetchUSFutures } from '../../services/api/yahoo';
import { useRefresh } from '../../contexts/RefreshContext';
import { useLoading, DATA_SOURCE_IDS } from '../../contexts/LoadingContext';
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

const futuresInfo: Record<string, { name: string; displaySymbol: string }> = {
  'ES=F': { name: 'US500', displaySymbol: 'US500' },
  'NQ=F': { name: 'US100', displaySymbol: 'US100' },
  'YM=F': { name: 'US30', displaySymbol: 'US30' },
};

const usIndexOrder: Record<string, number> = {
  'US30': 1, 'YM': 1, 'DJI': 1, '^DJI': 1,
  'US100': 2, 'NQ': 2, 'IXIC': 2, '^IXIC': 2,
  'US500': 3, 'ES': 3, 'GSPC': 3, '^GSPC': 3,
};

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
  open: { text: 'LIVE', class: 'text-accent-green' },
  closed: { text: 'CLOSED', class: 'text-neutral-500' },
  pre: { text: 'PRE-MKT', class: 'text-accent-amber' },
  post: { text: 'AFTER', class: 'text-accent-cyan' },
  futures: { text: 'FUTURES', class: 'text-accent-purple' },
};

const regionToMarketId: Record<string, string> = {
  US: 'US', DE: 'EU', UK: 'EU', FR: 'EU', JP: 'TOKYO', HK: 'HONGKONG', KR: 'SEOUL',
};

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
  const { markLoaded } = useLoading();
  const hasMarkedLoaded = useRef(false);
  const [markets, setMarkets] = useState<MarketIndex[]>(mockGlobalMarkets);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const usMarketStatus = getCentralMarketStatus('US');
      const isExtendedHours = usMarketStatus.status === 'pre' ||
                              usMarketStatus.status === 'post' ||
                              usMarketStatus.status === 'futures';

      const indicesData = await fetchGlobalIndices();

      const usIndices = indicesData.filter((q: QuoteData) =>
        q.symbol === '^GSPC' || q.symbol === '^DJI' || q.symbol === '^IXIC'
      );
      const nonUSIndices = indicesData.filter((q: QuoteData) =>
        q.symbol !== '^GSPC' && q.symbol !== '^DJI' && q.symbol !== '^IXIC'
      );

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
          }
        } catch (futuresErr) {
          console.warn('[GlobalMarkets] Futures fetch failed, using indices:', futuresErr);
        }
      }

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

      usMarketData.sort((a, b) => {
        const orderA = usIndexOrder[a.symbol] || 99;
        const orderB = usIndexOrder[b.symbol] || 99;
        return orderA - orderB;
      });

      setMarkets([...usMarketData, ...processedNonUS]);
    } catch (err) {
      console.error('Failed to fetch global markets:', err);
      setError('Failed to load');
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
      markLoaded(DATA_SOURCE_IDS.GLOBAL_MARKETS);
      hasMarkedLoaded.current = true;
    }
  }, [isLoading, markLoaded]);

  const americas = markets.filter(m => m.region === 'US');
  const europe = markets.filter(m => ['DE', 'UK', 'FR'].includes(m.region));
  const asia = markets.filter(m => ['JP', 'HK', 'KR'].includes(m.region));

  const renderIndex = (index: MarketIndex, i: number) => (
    <motion.button
      key={index.symbol}
      onClick={() => onIndexClick?.(index.symbol)}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03 }}
      className="flex items-center justify-between p-2 rounded-md bg-terminal-card-hover/30 hover:bg-terminal-card-hover border border-transparent hover:border-terminal-border transition-all duration-150 text-left w-full"
    >
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold ${regionColors[index.region]}`}>
          {index.isFutures ? 'FUT' : index.region}
        </span>
        <div>
          <div className="text-xs text-neutral-200 font-medium">
            {index.name}
            {index.isFutures && (
              <span className="ml-1 text-[11px] text-accent-purple">(LIVE)</span>
            )}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">{index.symbol}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs font-mono text-neutral-200">
          {index.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </div>
        <div className={`text-[10px] font-mono ${index.change >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
          {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)}%
        </div>
      </div>
    </motion.button>
  );

  const getRegionStatus = (regionMarkets: MarketIndex[]): MarketStatus => {
    if (regionMarkets.length === 0) return 'closed';
    return regionMarkets[0]?.status || 'closed';
  };

  return (
    <Card
      title={t('globalMarkets')}
      compact
      headerAction={
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-1 rounded text-neutral-500 hover:text-neutral-300 transition-colors"
            title="Refresh"
          >
            <IoRefresh className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-1 text-[11px]">
            <IoGlobeOutline className="text-accent-cyan" />
            <span className="text-neutral-500">{markets.length}</span>
          </div>
        </div>
      }
    >
      {isLoading && markets === mockGlobalMarkets ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Americas */}
          {americas.length > 0 && (
            <div>
              <div className="text-[11px] text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <span>US</span>
                <span className={`ml-auto ${statusLabels[getRegionStatus(americas)].class}`}>
                  {statusLabels[getRegionStatus(americas)].text}
                </span>
              </div>
              <div className="space-y-0.5">
                {americas.map((idx, i) => renderIndex(idx, i))}
              </div>
            </div>
          )}

          {/* Europe */}
          {europe.length > 0 && (
            <div>
              <div className="text-[11px] text-yellow-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <span>EU</span>
                <span className={`ml-auto ${statusLabels[getRegionStatus(europe)].class}`}>
                  {statusLabels[getRegionStatus(europe)].text}
                </span>
              </div>
              <div className="space-y-0.5">
                {europe.map((idx, i) => renderIndex(idx, americas.length + i))}
              </div>
            </div>
          )}

          {/* Asia */}
          {asia.length > 0 && (() => {
            const asiaStatus = getAsiaGroupedStatus();
            return (
              <div>
                <div className="text-[11px] text-pink-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <span>ASIA</span>
                  <span className={`ml-auto ${asiaStatus.statusClass.replace('text-neon-', 'text-accent-')}`}>
                    {asiaStatus.statusText}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {asia.map((idx, i) => renderIndex(idx, americas.length + europe.length + i))}
                </div>
              </div>
            );
          })()}

          {error && (
            <div className="text-center mt-2">
              <span className="text-[11px] text-accent-amber">Using cached data</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
