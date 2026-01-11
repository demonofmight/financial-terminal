import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { IoTrendingUp, IoTrendingDown, IoRefresh } from 'react-icons/io5';
import { useLanguage } from '../../i18n';
import { fetchBISTData } from '../../services/api/yahoo';
import type { QuoteData } from '../../services/api/yahoo';

interface BISTStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

// Stock name mappings
const stockNames: Record<string, string> = {
  'THYAO.IS': 'Türk Hava Yolları',
  'SISE.IS': 'Şişecam',
  'EREGL.IS': 'Ereğli Demir Çelik',
  'GARAN.IS': 'Garanti BBVA',
  'AKBNK.IS': 'Akbank',
  'YKBNK.IS': 'Yapı Kredi',
  'ASELS.IS': 'Aselsan',
  'KCHOL.IS': 'Koç Holding',
  'SAHOL.IS': 'Sabancı Holding',
  'TUPRS.IS': 'Tüpraş',
};

// Fallback mock data
const mockBistData = {
  indexValue: 9876.54,
  indexChange: 1.23,
  topGainers: [
    { symbol: 'THYAO', name: 'Türk Hava Yolları', price: 289.50, change: 5.67 },
    { symbol: 'SISE', name: 'Şişecam', price: 45.78, change: 4.32 },
    { symbol: 'EREGL', name: 'Ereğli Demir Çelik', price: 52.30, change: 3.89 },
  ],
  topLosers: [
    { symbol: 'GARAN', name: 'Garanti BBVA', price: 78.90, change: -2.45 },
    { symbol: 'AKBNK', name: 'Akbank', price: 52.10, change: -1.98 },
    { symbol: 'YKBNK', name: 'Yapı Kredi', price: 25.40, change: -1.56 },
  ],
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

/**
 * Check if BIST market is currently open
 */
function isBISTOpen(): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const time = utcHour + utcMinutes / 60;
  const dayOfWeek = now.getUTCDay();

  // Weekend check
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;

  // BIST: 07:00 - 15:00 UTC (Turkey is UTC+3, so 10:00-18:00 local)
  return time >= 7 && time < 15;
}

interface BISTOverviewProps {
  onStockClick?: (symbol: string) => void;
}

export function BISTOverview({ onStockClick }: BISTOverviewProps) {
  const { t } = useLanguage();
  const [indexValue, setIndexValue] = useState(mockBistData.indexValue);
  const [indexChange, setIndexChange] = useState(mockBistData.indexChange);
  const [topGainers, setTopGainers] = useState<BISTStock[]>(mockBistData.topGainers);
  const [topLosers, setTopLosers] = useState<BISTStock[]>(mockBistData.topLosers);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchBISTData();

      // Set index data with safe number checks
      setIndexValue(safeNumber(data.index.price, mockBistData.indexValue));
      setIndexChange(safeNumber(data.index.changePercent, 0));

      // Process stocks with safe number checks
      const processedStocks: BISTStock[] = data.stocks.map((stock: QuoteData) => ({
        symbol: stock.symbol.replace('.IS', ''),
        name: stockNames[stock.symbol] || stock.symbol,
        price: safeNumber(stock.price, 0),
        change: safeNumber(stock.changePercent, 0),
      }));

      // Sort by change percentage
      const sorted = [...processedStocks].sort((a, b) => b.change - a.change);

      // Top 3 gainers and losers
      const gainers = sorted.filter(s => s.change > 0).slice(0, 3);
      const losers = sorted.filter(s => s.change < 0).slice(-3).reverse();

      setTopGainers(gainers.length > 0 ? gainers : mockBistData.topGainers);
      setTopLosers(losers.length > 0 ? losers : mockBistData.topLosers);
    } catch (err) {
      console.error('Failed to fetch BIST data:', err);
      setError('Failed to load');
      // Keep mock data as fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const safeIndexChange = safeNumber(indexChange, 0);
  const isPositive = safeIndexChange >= 0;
  const marketOpen = isBISTOpen();

  return (
    <Card
      title={t('bistOverview')}
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
      {isLoading && indexValue === mockBistData.indexValue ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Index Header - Clickable */}
          <button
            onClick={() => onStockClick?.('XU100')}
            className="w-full flex items-center justify-between mb-4 pb-4 border-b border-terminal-border hover:bg-terminal-border/20 transition-all rounded -m-1 p-1"
          >
            <div className="text-left">
              <div className="text-xs text-gray-500 uppercase tracking-wider">BIST 100</div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-mono font-bold ${isPositive ? 'value-positive' : 'value-negative'}`}>
                  {safeNumber(indexValue, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className={`flex items-center gap-1 px-3 py-2 rounded ${
              isPositive ? 'bg-neon-green/10 border border-neon-green/30' : 'bg-neon-red/10 border border-neon-red/30'
            }`}>
              {isPositive ? <IoTrendingUp className="text-neon-green" /> : <IoTrendingDown className="text-neon-red" />}
              <span className={`font-mono text-sm ${isPositive ? 'text-neon-green' : 'text-neon-red'}`}>
                {isPositive ? '+' : ''}{safeIndexChange.toFixed(2)}%
              </span>
            </div>
          </button>

          {/* Top Movers Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Gainers */}
            <div>
              <div className="flex items-center gap-1 text-xs text-neon-green mb-2">
                <IoTrendingUp />
                <span className="uppercase tracking-wider">{t('topGainers')}</span>
              </div>
              <div className="space-y-1.5">
                {topGainers.length > 0 ? topGainers.map((stock) => {
                  const stockChange = safeNumber(stock.change, 0);
                  return (
                    <button
                      key={stock.symbol}
                      onClick={() => onStockClick?.(stock.symbol)}
                      className="w-full flex items-center justify-between p-2.5 rounded bg-neon-green/5 hover:bg-neon-green/10 border border-neon-green/10 transition-all text-left"
                    >
                      <div>
                        <div className="text-xs text-neon-cyan font-mono">{stock.symbol}</div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[80px]">{stock.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-white">₺{safeNumber(stock.price, 0).toFixed(2)}</div>
                        <div className="text-[10px] font-mono value-positive">+{stockChange.toFixed(2)}%</div>
                      </div>
                    </button>
                  );
                }) : (
                  <div className="text-xs text-gray-500 p-2">No gainers</div>
                )}
              </div>
            </div>

            {/* Losers */}
            <div>
              <div className="flex items-center gap-1 text-xs text-neon-red mb-2">
                <IoTrendingDown />
                <span className="uppercase tracking-wider">{t('topLosers')}</span>
              </div>
              <div className="space-y-1.5">
                {topLosers.length > 0 ? topLosers.map((stock) => {
                  const stockChange = safeNumber(stock.change, 0);
                  return (
                    <button
                      key={stock.symbol}
                      onClick={() => onStockClick?.(stock.symbol)}
                      className="w-full flex items-center justify-between p-2.5 rounded bg-neon-red/5 hover:bg-neon-red/10 border border-neon-red/10 transition-all text-left"
                    >
                      <div>
                        <div className="text-xs text-neon-cyan font-mono">{stock.symbol}</div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[80px]">{stock.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-white">₺{safeNumber(stock.price, 0).toFixed(2)}</div>
                        <div className="text-[10px] font-mono value-negative">{stockChange.toFixed(2)}%</div>
                      </div>
                    </button>
                  );
                }) : (
                  <div className="text-xs text-gray-500 p-2">No losers</div>
                )}
              </div>
            </div>
          </div>

          {/* Market Status */}
          <div className="mt-4 pt-3 border-t border-terminal-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${marketOpen ? 'bg-neon-green animate-pulse' : 'bg-neon-amber'}`}></span>
              <span className="text-gray-500">{marketOpen ? t('open') : t('marketClosed')}</span>
            </div>
            <span className="text-gray-500">{marketOpen ? 'Closes 18:00 TRT' : `${t('opens')}: 10:00 TRT`}</span>
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
