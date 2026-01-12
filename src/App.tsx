import { useState, useCallback, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { useLanguage } from './i18n';
import { useAutoRefresh } from './hooks/useAutoRefresh';
import { useMarketData } from './hooks/useMarketData';
import { useStore } from './store/useStore';
import { RefreshProvider, useRefresh } from './contexts/RefreshContext';
import { SectorHeatmap } from './components/widgets/SectorHeatmap';
import { SP500TopMovers } from './components/widgets/SP500TopMovers';
import { PreciousMetals } from './components/widgets/PreciousMetals';
import { CryptoTracker } from './components/widgets/CryptoTracker';
import { FearGreedIndex } from './components/widgets/FearGreedIndex';
import { VixIndex } from './components/widgets/VixIndex';
import { CurrencyRates } from './components/widgets/CurrencyRates';
import { BISTOverview } from './components/widgets/BISTOverview';
import { GlobalMarkets } from './components/widgets/GlobalMarkets';
import { TreasuryYields } from './components/widgets/TreasuryYields';
import { Commodities } from './components/widgets/Commodities';
import { EconomicCalendar } from './components/widgets/EconomicCalendar';
import { TradingViewModal } from './components/widgets/TradingViewModal';

// Symbol mappings for TradingView
const symbolMappings: Record<string, string> = {
  // Sectors (ETFs)
  XLK: 'AMEX:XLK',
  XLV: 'AMEX:XLV',
  XLF: 'AMEX:XLF',
  XLE: 'AMEX:XLE',
  XLY: 'AMEX:XLY',
  XLI: 'AMEX:XLI',
  XLB: 'AMEX:XLB',
  XLRE: 'AMEX:XLRE',
  XLU: 'AMEX:XLU',
  XLC: 'AMEX:XLC',
  XLP: 'AMEX:XLP',
  ITA: 'AMEX:ITA',
  // Metals
  XAU: 'TVC:GOLD',
  XAG: 'TVC:SILVER',
  XPT: 'TVC:PLATINUM',
  XPD: 'TVC:PALLADIUM',
  // Crypto
  bitcoin: 'BINANCE:BTCUSDT',
  ethereum: 'BINANCE:ETHUSDT',
  solana: 'BINANCE:SOLUSDT',
  ripple: 'BINANCE:XRPUSDT',
  bnb: 'BINANCE:BNBUSDT',
  cardano: 'BINANCE:ADAUSDT',
  dogecoin: 'BINANCE:DOGEUSDT',
  polkadot: 'BINANCE:DOTUSDT',
  avalanche: 'BINANCE:AVAXUSDT',
  chainlink: 'BINANCE:LINKUSDT',
  // Currency pairs
  'USD/TRY': 'FX:USDTRY',
  'EUR/USD': 'FX:EURUSD',
  'EUR/TRY': 'FX:EURTRY',
  'GBP/USD': 'FX:GBPUSD',
  'USD/JPY': 'FX:USDJPY',
  // Turkish stocks (Borsa Istanbul)
  THYAO: 'BIST:THYAO',
  SISE: 'BIST:SISE',
  EREGL: 'BIST:EREGL',
  GARAN: 'BIST:GARAN',
  AKBNK: 'BIST:AKBNK',
  YKBNK: 'BIST:YKBNK',
  ASELS: 'BIST:ASELS',
  KCHOL: 'BIST:KCHOL',
  SAHOL: 'BIST:SAHOL',
  TUPRS: 'BIST:TUPRS',
  // BIST Index
  XU100: 'BIST:XU100',
  // VIX
  VIX: 'TVC:VIX',
  // Global Indices (Yahoo symbol -> TradingView symbol)
  GSPC: 'SP:SPX',        // S&P 500
  DJI: 'DJ:DJI',         // Dow Jones
  IXIC: 'NASDAQ:NDX',    // NASDAQ
  GDAXI: 'XETR:DAX',     // DAX
  FTSE: 'SPREADEX:FTSE', // FTSE 100
  FCHI: 'EURONEXT:PX1',  // CAC 40
  N225: 'TVC:NI225',     // Nikkei 225
  HSI: 'TVC:HSI',        // Hang Seng
  KS11: 'KRX:KOSPI',     // KOSPI
  // Commodities (Futures)
  CL: 'NYMEX:CL1!',      // WTI Crude Oil
  BZ: 'NYMEX:BB1!',      // Brent Crude
  NG: 'NYMEX:NG1!',      // Natural Gas
  HG: 'COMEX:HG1!',      // Copper
  ZW: 'CBOT:ZW1!',       // Wheat
  // US Index Futures (for extended hours)
  ES: 'CME_MINI:ES1!',   // S&P 500 E-mini
  NQ: 'CME_MINI:NQ1!',   // NASDAQ E-mini
  YM: 'CBOT_MINI:YM1!',  // Dow E-mini
  // Treasury
  TNX: 'TVC:TNX',
};

// Symbols that should open in new tab (embedded widget doesn't work well)
const openInNewTabSymbols = [
  // BIST
  'THYAO', 'SISE', 'EREGL', 'GARAN', 'AKBNK', 'YKBNK', 'ASELS', 'KCHOL', 'SAHOL', 'TUPRS', 'XU100',
  // Commodities (futures have issues with embedded widget)
  'CL', 'BZ', 'NG', 'HG', 'ZW',
  // Global Indices (some have issues)
  'GSPC', 'DJI', 'IXIC', 'GDAXI', 'FTSE', 'FCHI', 'N225', 'HSI', 'KS11',
  // US Index Futures
  'ES', 'NQ', 'YM',
];

function AppContent() {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');

  // Initialize market data and sync with IndexedDB
  const { isInitialized } = useMarketData();
  const { isLoading, lastUpdate, updateLastRefresh, setLoading } = useStore();
  const { triggerRefresh, setIsRefreshing } = useRefresh();

  // Handle refresh - triggers all widgets to refresh their data
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      // Trigger all widgets to refresh
      triggerRefresh();
      // Small delay to allow widgets to start fetching
      await new Promise((resolve) => setTimeout(resolve, 500));
      updateLastRefresh();
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [setLoading, updateLastRefresh, triggerRefresh, setIsRefreshing]);

  // Auto-refresh every 5 minutes
  const {
    timeUntilRefresh,
    isEnabled: autoRefreshEnabled,
    setEnabled: setAutoRefreshEnabled,
  } = useAutoRefresh({
    interval: 5 * 60 * 1000, // 5 minutes
    enabled: true,
    onRefresh: handleRefresh,
    refreshOnMount: false,
  });

  // Set initial update time on mount
  useEffect(() => {
    if (isInitialized && !lastUpdate) {
      updateLastRefresh();
    }
  }, [isInitialized, lastUpdate, updateLastRefresh]);

  const openChart = useCallback((symbol: string, title?: string) => {
    const tvSymbol = symbolMappings[symbol] || symbol;

    // Check if symbol should open in new tab (embedded widget doesn't work well for these)
    if (openInNewTabSymbols.includes(symbol) || tvSymbol.startsWith('BIST:')) {
      const tradingViewUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`;
      window.open(tradingViewUrl, '_blank');
      return;
    }

    setSelectedSymbol(tvSymbol);
    setSelectedTitle(title || symbol);
    setModalOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-terminal-bg grid-bg">
      {/* CRT Effects */}
      <div className="scanlines"></div>
      <div className="noise-overlay"></div>
      <div className="vignette"></div>

      {/* Header */}
      <Header
        onRefresh={handleRefresh}
        isLoading={isLoading}
        lastUpdate={lastUpdate}
        autoRefreshEnabled={autoRefreshEnabled}
        timeUntilRefresh={timeUntilRefresh}
        onToggleAutoRefresh={setAutoRefreshEnabled}
      />

      {/* Main Dashboard */}
      <main className="p-4 md:p-6 max-w-[1920px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-auto">
          {/* Row 1: Sector Heatmap (2x) + S&P 500 + Global Markets */}
          <div className="md:col-span-2 lg:col-span-2 lg:row-span-2 opacity-0 animate-in stagger-1">
            <SectorHeatmap onSectorClick={(symbol) => openChart(symbol, `${symbol} Sector ETF`)} />
          </div>

          <div className="lg:row-span-2 opacity-0 animate-in stagger-2">
            <SP500TopMovers onStockClick={(symbol) => openChart(symbol, `${symbol}`)} />
          </div>

          <div className="lg:row-span-2 opacity-0 animate-in stagger-3">
            <GlobalMarkets onIndexClick={(symbol) => openChart(symbol, `${symbol} Index`)} />
          </div>

          {/* Row 2: Fear/Greed + VIX + Treasury Yields + Economic Calendar */}
          <div className="opacity-0 animate-in stagger-4">
            <FearGreedIndex onClick={() => openChart('BINANCE:BTCUSDT', 'Crypto Fear & Greed')} />
          </div>

          <div className="opacity-0 animate-in stagger-5">
            <VixIndex onClick={() => openChart('VIX', 'VIX Volatility Index')} />
          </div>

          <div className="opacity-0 animate-in stagger-6">
            <TreasuryYields />
          </div>

          <div className="opacity-0 animate-in stagger-7">
            <EconomicCalendar />
          </div>

          {/* Row 3: Precious Metals + Crypto + Currency + BIST */}
          <div className="opacity-0 animate-in stagger-8">
            <PreciousMetals onMetalClick={(symbol) => openChart(symbol, `${symbol} Spot Price`)} />
          </div>

          <div className="opacity-0 animate-in stagger-9">
            <CryptoTracker onCryptoClick={(id) => openChart(id, `Crypto`)} />
          </div>

          <div className="opacity-0 animate-in stagger-10">
            <CurrencyRates onPairClick={(pair) => openChart(pair, pair)} />
          </div>

          <div className="opacity-0 animate-in stagger-11">
            <BISTOverview onStockClick={(symbol) => openChart(symbol, `BIST: ${symbol}`)} />
          </div>

          {/* Row 4: Commodities (spans 2 columns for better layout) */}
          <div className="md:col-span-2 opacity-0 animate-in stagger-12">
            <Commodities onCommodityClick={(symbol) => openChart(symbol, `${symbol} Futures`)} />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-terminal-border text-center">
          <p className="text-[10px] text-gray-600">
            FINTERM MVP • {t('dataProvidedBy')} • {t('notFinancialAdvice')} •{' '}
            <span className="text-neon-green/50">{t('builtWith')}</span>
          </p>
        </footer>
      </main>

      {/* TradingView Chart Modal */}
      <TradingViewModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        symbol={selectedSymbol}
        title={selectedTitle}
      />
    </div>
  );
}

function App() {
  return (
    <RefreshProvider>
      <AppContent />
    </RefreshProvider>
  );
}

export default App;
