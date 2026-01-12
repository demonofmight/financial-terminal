import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { IoTrendingUp, IoTrendingDown, IoRefresh } from 'react-icons/io5';
import { useLanguage } from '../../i18n';
import { fetchBISTData } from '../../services/api/yahoo';
import { useRefresh } from '../../contexts/RefreshContext';
import type { QuoteData } from '../../services/api/yahoo';

interface BISTStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

// Stock name mappings - comprehensive BIST100 list
const stockNames: Record<string, string> = {
  // Banking & Finance
  'AKBNK.IS': 'Akbank', 'GARAN.IS': 'Garanti BBVA', 'ISCTR.IS': 'İş Bankası',
  'YKBNK.IS': 'Yapı Kredi', 'VAKBN.IS': 'Vakıfbank', 'HALKB.IS': 'Halkbank',
  'QNBFB.IS': 'QNB Finansbank', 'SKBNK.IS': 'Şekerbank', 'TSKB.IS': 'TSKB',
  'ALBRK.IS': 'Albaraka Türk',
  // Holdings
  'KCHOL.IS': 'Koç Holding', 'SAHOL.IS': 'Sabancı Holding', 'DOHOL.IS': 'Doğan Holding',
  'TAVHL.IS': 'TAV Havalimanları', 'AGHOL.IS': 'Anadolu Grubu', 'ECZYT.IS': 'Eczacıbaşı Yatırım',
  'TKFEN.IS': 'Tekfen Holding', 'GLYHO.IS': 'Global Yatırım', 'NTHOL.IS': 'Net Holding',
  'KOZAL.IS': 'Koza Altın',
  // Industry & Manufacturing
  'EREGL.IS': 'Ereğli Demir Çelik', 'KRDMD.IS': 'Kardemir', 'TOASO.IS': 'Tofaş',
  'FROTO.IS': 'Ford Otosan', 'OTKAR.IS': 'Otokar', 'TTRAK.IS': 'Türk Traktör',
  'ARCLK.IS': 'Arçelik', 'VESTL.IS': 'Vestel', 'KLMSN.IS': 'Klimasan', 'BRSAN.IS': 'Borusan',
  // Energy & Utilities
  'TUPRS.IS': 'Tüpraş', 'PETKM.IS': 'Petkim', 'AYGAZ.IS': 'Aygaz',
  'AKSEN.IS': 'Aksa Enerji', 'ENKAI.IS': 'Enka İnşaat', 'ODAS.IS': 'Odaş Elektrik',
  'AKSA.IS': 'Aksa Akrilik', 'ZOREN.IS': 'Zorlu Enerji', 'GUBRF.IS': 'Gübre Fabrikaları',
  'KONTR.IS': 'Kontrolmatik',
  // Telecom & Tech
  'TCELL.IS': 'Turkcell', 'TTKOM.IS': 'Türk Telekom', 'ASELS.IS': 'Aselsan',
  'LOGO.IS': 'Logo Yazılım', 'INDES.IS': 'İndeks Bilgisayar', 'ARENA.IS': 'Arena Bilgisayar',
  'NETAS.IS': 'Netaş', 'KAREL.IS': 'Karel Elektronik', 'PAPIL.IS': 'Papilon',
  'ARDYZ.IS': 'Ard Yazılım',
  // Aviation & Transport
  'THYAO.IS': 'Türk Hava Yolları', 'PGSUS.IS': 'Pegasus', 'CLEBI.IS': 'Çelebi',
  'RYSAS.IS': 'Reysaş', 'BEYAZ.IS': 'Beyaz Filo',
  // Retail & Consumer
  'BIMAS.IS': 'BİM', 'MGROS.IS': 'Migros', 'SOKM.IS': 'Şok Marketler',
  'BIZIM.IS': 'Bizim Toptan', 'MAVI.IS': 'Mavi Giyim', 'VAKKO.IS': 'Vakko',
  'ADEL.IS': 'Adel Kalemcilik', 'CCOLA.IS': 'Coca-Cola İçecek', 'ULKER.IS': 'Ülker',
  'BANVT.IS': 'Banvit',
  // Construction & Real Estate
  'EKGYO.IS': 'Emlak Konut GYO', 'ISGYO.IS': 'İş GYO', 'EMLAK.IS': 'Emlak Katılım',
  'KLGYO.IS': 'Kiler GYO', 'SNGYO.IS': 'Sinpaş GYO', 'OYAKC.IS': 'Oyak Çimento',
  'BUCIM.IS': 'Bursa Çimento', 'GOLTS.IS': 'Göltaş', 'CIMSA.IS': 'Çimsa', 'ADANA.IS': 'Adana Çimento',
  // Healthcare & Pharma
  'SELEC.IS': 'Selçuk Ecza', 'DEVA.IS': 'Deva Holding', 'ECILC.IS': 'Eczacıbaşı İlaç',
  'LKMNH.IS': 'Lokman Hekim', 'MPARK.IS': 'MLP Sağlık',
  // Glass & Chemicals
  'SISE.IS': 'Şişecam', 'TRKCM.IS': 'Trakya Cam', 'SODA.IS': 'Soda Sanayii',
  'BAGFS.IS': 'Bagfaş', 'EGEEN.IS': 'Ege Endüstri', 'AKFYE.IS': 'Akfen Yenilenebilir',
  'HEKTS.IS': 'Hektaş', 'ALKIM.IS': 'Alkim Kimya', 'BRYAT.IS': 'Borusan Yatırım',
  'GEDZA.IS': 'Gediz Ambalaj',
  // Mining & Metals
  'KOZAA.IS': 'Koza Anadolu', 'IPEKE.IS': 'İpek Enerji', 'KRVGD.IS': 'Kervan Gıda',
  // Textiles & Apparel
  'KORDS.IS': 'Kordsa', 'YATAS.IS': 'Yataş', 'DESA.IS': 'Desa Deri',
  'BLCYT.IS': 'Bilici Yatırım', 'BRKO.IS': 'Birko Mensucat',
  // Other Industrials
  'AEFES.IS': 'Anadolu Efes', 'PRKME.IS': 'Park Elektrik', 'ISMEN.IS': 'İş Yatırım Menkul',
  'GWIND.IS': 'Galata Wind', 'EUPWR.IS': 'Europower', 'GESAN.IS': 'Giresun Enerji',
  'VESBE.IS': 'Vestel Beyaz Eşya', 'CANTE.IS': 'Can Teknoloji', 'MIATK.IS': 'Mia Teknoloji',
  'KZBGY.IS': 'Kızılbük Enerji',
};

// Fallback mock data (5 stocks each)
const mockBistData = {
  indexValue: 9876.54,
  indexChange: 1.23,
  topGainers: [
    { symbol: 'THYAO', name: 'Türk Hava Yolları', price: 289.50, change: 5.67 },
    { symbol: 'SISE', name: 'Şişecam', price: 45.78, change: 4.32 },
    { symbol: 'EREGL', name: 'Ereğli Demir Çelik', price: 52.30, change: 3.89 },
    { symbol: 'ASELS', name: 'Aselsan', price: 85.20, change: 3.45 },
    { symbol: 'KCHOL', name: 'Koç Holding', price: 198.50, change: 2.98 },
  ],
  topLosers: [
    { symbol: 'GARAN', name: 'Garanti BBVA', price: 78.90, change: -2.45 },
    { symbol: 'AKBNK', name: 'Akbank', price: 52.10, change: -1.98 },
    { symbol: 'YKBNK', name: 'Yapı Kredi', price: 25.40, change: -1.56 },
    { symbol: 'VAKBN', name: 'Vakıfbank', price: 18.75, change: -1.32 },
    { symbol: 'HALKB', name: 'Halkbank', price: 15.60, change: -1.15 },
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
  const { refreshKey } = useRefresh();
  const [indexValue, setIndexValue] = useState(mockBistData.indexValue);
  const [indexChange, setIndexChange] = useState(mockBistData.indexChange);
  const [topGainers, setTopGainers] = useState<BISTStock[]>(mockBistData.topGainers);
  const [topLosers, setTopLosers] = useState<BISTStock[]>(mockBistData.topLosers);
  const [stockCount, setStockCount] = useState(0);
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

      console.log('[BIST] Processed stocks:', processedStocks.map(s => `${s.symbol}: ${s.change.toFixed(2)}%`));

      // Sort by change percentage (descending - highest first)
      const sorted = [...processedStocks].sort((a, b) => b.change - a.change);

      // Check if we have valid price data from API
      const hasValidData = processedStocks.some(s => s.price > 0);

      let gainers: BISTStock[];
      let losers: BISTStock[];

      if (hasValidData) {
        // Sort ascending for losers (lowest/most negative first)
        const sortedAsc = [...processedStocks].sort((a, b) => a.change - b.change);

        // Top 5 gainers (highest change first)
        gainers = sorted.slice(0, 5);

        // Top 5 losers (lowest change first - could be negative or least positive)
        // NEVER fall back to mock data - always show real stocks
        losers = sortedAsc.slice(0, 5);

        setStockCount(processedStocks.length);
        console.log(`[BIST] Fetched ${processedStocks.length} stocks from BIST100`);
        console.log('[BIST] Top 5 Gainers:', gainers.map(s => `${s.symbol}: ₺${s.price.toFixed(2)} ${s.change.toFixed(2)}%`));
        console.log('[BIST] Top 5 Losers:', losers.map(s => `${s.symbol}: ₺${s.price.toFixed(2)} ${s.change.toFixed(2)}%`));
      } else {
        // No valid data at all - use mock as last resort
        gainers = mockBistData.topGainers;
        losers = mockBistData.topLosers;
        console.log('[BIST] No valid data - using mock');
      }

      setTopGainers(gainers);
      setTopLosers(losers);
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

  // Listen for global refresh
  useEffect(() => {
    if (refreshKey > 0) {
      fetchData();
    }
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const safeIndexChange = safeNumber(indexChange, 0);
  const isPositive = safeIndexChange >= 0;
  const marketOpen = isBISTOpen();

  return (
    <Card
      title={t('bistOverview')}
      headerAction={
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500">
            {stockCount > 0 ? `${stockCount} stocks` : ''}
          </span>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-1.5 rounded text-gray-500 hover:text-gray-300 transition-all"
            title="Refresh"
          >
            <IoRefresh className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
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
                        <div className="text-sm text-neon-cyan font-mono font-medium">{stock.symbol}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[80px]">{stock.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono text-white">₺{safeNumber(stock.price, 0).toFixed(2)}</div>
                        <div className="text-xs font-mono value-positive">▲ {stockChange.toFixed(2)}%</div>
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
                        <div className="text-sm text-neon-cyan font-mono font-medium">{stock.symbol}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[80px]">{stock.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono text-white">₺{safeNumber(stock.price, 0).toFixed(2)}</div>
                        <div className="text-xs font-mono value-negative">▼ {Math.abs(stockChange).toFixed(2)}%</div>
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
