import { useState, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Header } from './components/layout/Header';
import { DraggableWidgetGrid } from './components/layout/DraggableWidgetGrid';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { useLanguage } from './i18n';
import { useAutoRefresh } from './hooks/useAutoRefresh';
import { useMarketData } from './hooks/useMarketData';
import { useStore } from './store/useStore';
import { RefreshProvider, useRefresh } from './contexts/RefreshContext';
import { LoadingProvider, useLoading } from './contexts/LoadingContext';
import { SectorHeatmap } from './components/widgets/SectorHeatmap';
import { SP500TopMovers } from './components/widgets/SP500TopMovers';
import { PreciousMetals } from './components/widgets/PreciousMetals';
import { CryptoTracker } from './components/widgets/CryptoTracker';
import { MarketSentiment } from './components/widgets/MarketSentiment';
import { CurrencyRates } from './components/widgets/CurrencyRates';
import { BISTOverview } from './components/widgets/BISTOverview';
import { GlobalMarkets } from './components/widgets/GlobalMarkets';
import { TreasuryYields } from './components/widgets/TreasuryYields';
import { Commodities } from './components/widgets/Commodities';
import { EconomicCalendar } from './components/widgets/EconomicCalendar';
import { MarketNews } from './components/widgets/MarketNews';
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
  GSPC: 'SP:SPX',
  DJI: 'DJ:DJI',
  IXIC: 'NASDAQ:NDX',
  GDAXI: 'XETR:DAX',
  FTSE: 'SPREADEX:FTSE',
  FCHI: 'EURONEXT:PX1',
  N225: 'TVC:NI225',
  HSI: 'TVC:HSI',
  KS11: 'KRX:KOSPI',
  // Commodities (Futures)
  CL: 'NYMEX:CL1!',
  BZ: 'NYMEX:BB1!',
  NG: 'NYMEX:NG1!',
  HG: 'COMEX:HG1!',
  ZW: 'CBOT:ZW1!',
  // US Index Futures
  ES: 'CME_MINI:ES1!',
  NQ: 'CME_MINI:NQ1!',
  YM: 'CBOT_MINI:YM1!',
  US500: 'CME_MINI:ES1!',
  US100: 'CME_MINI:NQ1!',
  US30: 'CBOT_MINI:YM1!',
  // Treasury
  TNX: 'TVC:TNX',
};

// Symbols that should open in new tab
const openInNewTabSymbols = [
  'THYAO', 'SISE', 'EREGL', 'GARAN', 'AKBNK', 'YKBNK', 'ASELS', 'KCHOL', 'SAHOL', 'TUPRS', 'XU100',
  'CL', 'BZ', 'NG', 'HG', 'ZW',
  'GSPC', 'DJI', 'IXIC', 'GDAXI', 'FTSE', 'FCHI', 'N225', 'HSI', 'KS11',
  'ES', 'NQ', 'YM', 'US500', 'US100', 'US30',
];

function AppContent() {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');

  const { isInitialized } = useMarketData();
  const { isLoading, lastUpdate, updateLastRefresh, setLoading } = useStore();
  const { triggerRefresh, setIsRefreshing } = useRefresh();
  const { isLoading: isInitialLoading, progress, message } = useLoading();

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      triggerRefresh();
      await new Promise((resolve) => setTimeout(resolve, 500));
      updateLastRefresh();
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [setLoading, updateLastRefresh, triggerRefresh, setIsRefreshing]);

  const {
    timeUntilRefresh,
    isEnabled: autoRefreshEnabled,
    setEnabled: setAutoRefreshEnabled,
  } = useAutoRefresh({
    interval: 5 * 60 * 1000,
    enabled: true,
    onRefresh: handleRefresh,
    refreshOnMount: false,
  });

  useEffect(() => {
    if (isInitialized && !lastUpdate) {
      updateLastRefresh();
    }
  }, [isInitialized, lastUpdate, updateLastRefresh]);

  const openChart = useCallback((symbol: string, title?: string) => {
    let tvSymbol = symbolMappings[symbol] || symbol;

    const isBISTStock = /^[A-Z]{4,5}$/.test(symbol) &&
                        !['XLK', 'XLV', 'XLF', 'XLE', 'XLY', 'XLI', 'XLB', 'XLRE', 'XLC', 'XLP'].includes(symbol) &&
                        (title?.includes('BIST') || !symbolMappings[symbol]);

    if (isBISTStock && !tvSymbol.startsWith('BIST:')) {
      tvSymbol = `BIST:${symbol}`;
    }

    if (openInNewTabSymbols.includes(symbol) || tvSymbol.startsWith('BIST:')) {
      const tradingViewUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`;
      window.open(tradingViewUrl, '_blank');
      return;
    }

    setSelectedSymbol(tvSymbol);
    setSelectedTitle(title || symbol);
    setModalOpen(true);
  }, []);

  // Create widgets object for draggable grid
  const widgets = useMemo(() => ({
    'sector-heatmap': <SectorHeatmap onSectorClick={(symbol) => openChart(symbol, `${symbol} Sector ETF`)} />,
    'market-sentiment': (
      <MarketSentiment
        onFearGreedClick={() => openChart('BINANCE:BTCUSDT', 'Crypto Fear & Greed')}
        onVixClick={() => openChart('VIX', 'VIX Volatility Index')}
      />
    ),
    'global-markets': <GlobalMarkets onIndexClick={(symbol) => openChart(symbol, `${symbol} Index`)} />,
    'economic-calendar': <EconomicCalendar />,
    'sp500-movers': <SP500TopMovers onStockClick={(symbol) => openChart(symbol, `${symbol}`)} />,
    'treasury-yields': <TreasuryYields />,
    'precious-metals': <PreciousMetals onMetalClick={(symbol) => openChart(symbol, `${symbol} Spot Price`)} />,
    'crypto-tracker': <CryptoTracker onCryptoClick={(id) => openChart(id, `Crypto`)} />,
    'currency-rates': <CurrencyRates onPairClick={(pair) => openChart(pair, pair)} />,
    'bist-overview': <BISTOverview onStockClick={(symbol) => openChart(symbol, `BIST: ${symbol}`)} />,
    'commodities': <Commodities onCommodityClick={(symbol) => openChart(symbol, `${symbol} Futures`)} />,
    'market-news': <MarketNews />,
  }), [openChart]);

  return (
    <div className="min-h-screen bg-terminal-bg">
      {/* Loading Screen */}
      <AnimatePresence mode="wait">
        {isInitialLoading && (
          <LoadingScreen progress={progress} message={message} />
        )}
      </AnimatePresence>

      <Header
        onRefresh={handleRefresh}
        isLoading={isLoading}
        lastUpdate={lastUpdate}
        autoRefreshEnabled={autoRefreshEnabled}
        timeUntilRefresh={timeUntilRefresh}
        onToggleAutoRefresh={setAutoRefreshEnabled}
      />

      {/* Main Dashboard - Draggable Widget Grid */}
      <main className="p-3 md:p-4 max-w-[1920px] mx-auto relative">
        <DraggableWidgetGrid widgets={widgets} />

        {/* Footer */}
        <footer className="mt-6 pt-3 border-t border-terminal-border text-center">
          <p className="text-[11px] text-neutral-600">
            FINTERM MVP • {t('dataProvidedBy')} • {t('notFinancialAdvice')} •{' '}
            <span className="text-accent-green/50">{t('builtWith')}</span>
          </p>
        </footer>
      </main>

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
    <LoadingProvider>
      <RefreshProvider>
        <AppContent />
      </RefreshProvider>
    </LoadingProvider>
  );
}

export default App;
