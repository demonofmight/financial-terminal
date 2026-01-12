import { useState, useEffect, useCallback } from 'react';
import { IoRefresh, IoTerminal } from 'react-icons/io5';
import { HiStatusOnline } from 'react-icons/hi';
import { useLanguage } from '../../i18n';
import { fetchSP500Index } from '../../services/api/yahoo';
import { fetchCryptoMarketData } from '../../services/api/coingecko';
import { fetchMetalPrice } from '../../services/api/goldapi';
import { getMarketStatus } from '../../utils/marketHours';
import { MarketStatusTooltip } from '../ui/MarketStatusTooltip';

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdate: Date | null;
  autoRefreshEnabled?: boolean;
  timeUntilRefresh?: number;
  onToggleAutoRefresh?: (enabled: boolean) => void;
}

interface QuickStats {
  sp500: { price: number; change: number } | null;
  btc: { price: number; change: number } | null;
  gold: { price: number; change: number } | null;
}

export function Header({
  onRefresh,
  isLoading,
  lastUpdate,
  autoRefreshEnabled = true,
  timeUntilRefresh,
  onToggleAutoRefresh,
}: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { language, setLanguage, t } = useLanguage();
  const [quickStats, setQuickStats] = useState<QuickStats>({
    sp500: null,
    btc: null,
    gold: null,
  });

  // Fetch quick stats on mount
  const fetchQuickStats = useCallback(async () => {
    try {
      // Fetch S&P 500 via Yahoo Finance
      const sp500Data = await fetchSP500Index();
      if (sp500Data) {
        setQuickStats(prev => ({
          ...prev,
          sp500: { price: sp500Data.price, change: sp500Data.changePercent || 0 },
        }));
      }
    } catch (e) {
      console.error('Failed to fetch S&P 500:', e);
    }

    try {
      // Fetch BTC
      const btcDataArray = await fetchCryptoMarketData(['bitcoin']);
      if (btcDataArray && btcDataArray.length > 0) {
        const btcData = btcDataArray[0];
        setQuickStats(prev => ({
          ...prev,
          btc: { price: btcData.current_price, change: btcData.price_change_percentage_24h || 0 },
        }));
      }
    } catch (e) {
      console.error('Failed to fetch BTC:', e);
    }

    try {
      // Fetch Gold
      const goldData = await fetchMetalPrice('XAU');
      if (goldData) {
        setQuickStats(prev => ({
          ...prev,
          gold: { price: goldData.price, change: goldData.changesPercentage || 0 },
        }));
      }
    } catch (e) {
      console.error('Failed to fetch Gold:', e);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchQuickStats();
  }, [fetchQuickStats]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get market statuses using centralized utility
  const usStatus = getMarketStatus('US');
  const euStatus = getMarketStatus('EU');
  const asiaStatus = getMarketStatus('ASIA');
  const bistStatus = getMarketStatus('BIST');

  return (
    <header className="sticky top-0 z-50 bg-terminal-bg/95 backdrop-blur-sm border-b border-terminal-border">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 text-xs border-b border-terminal-border/50 bg-gray-950/50">
        <div className="flex items-center gap-4 text-gray-500">
          <span className="flex items-center gap-1.5">
            <HiStatusOnline className="text-neon-green" />
            <span className="text-neon-green">{t('live')}</span>
          </span>
          <span>|</span>
          <MarketStatusTooltip marketId="US">
            <span>
              {t('usMarkets')}: {' '}
              <span className={usStatus.statusClass}>
                {usStatus.statusText}
              </span>
            </span>
          </MarketStatusTooltip>
          <span>|</span>
          <MarketStatusTooltip marketId="EU">
            <span>
              EU: {' '}
              <span className={euStatus.statusClass}>
                {euStatus.isOpen ? t('open') : t('closed')}
              </span>
            </span>
          </MarketStatusTooltip>
          <span>|</span>
          <MarketStatusTooltip marketId="ASIA">
            <span>
              Asia: {' '}
              <span className={asiaStatus.statusClass}>
                {asiaStatus.isOpen ? t('open') : t('closed')}
              </span>
            </span>
          </MarketStatusTooltip>
          <span>|</span>
          <MarketStatusTooltip marketId="BIST">
            <span>
              BIST: {' '}
              <span className={bistStatus.statusClass}>
                {bistStatus.isOpen ? t('open') : t('closed')}
              </span>
            </span>
          </MarketStatusTooltip>
        </div>
        <div className="flex items-center gap-4 text-gray-500">
          {/* Language Switcher */}
          <div className="flex items-center gap-1 border border-terminal-border rounded overflow-hidden">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 text-[10px] font-mono transition-all ${
                language === 'en'
                  ? 'bg-neon-cyan/20 text-neon-cyan'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('tr')}
              className={`px-2 py-0.5 text-[10px] font-mono transition-all ${
                language === 'tr'
                  ? 'bg-neon-cyan/20 text-neon-cyan'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              TR
            </button>
          </div>
          <span>|</span>
          <span>{formatDate(currentTime)}</span>
          <span className="font-mono text-neon-cyan">{formatTime(currentTime)} UTC</span>
        </div>
      </div>

      {/* Main Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-gradient-to-br from-neon-green/20 to-neon-cyan/20 flex items-center justify-center border border-neon-green/30">
              <IoTerminal className="text-xl text-neon-green" />
            </div>
            <div>
              <h1 className="text-xl font-display tracking-wider text-white flex items-center gap-2">
                {t('appName')}
                <span className="text-xs px-1.5 py-0.5 bg-neon-green/10 text-neon-green border border-neon-green/30 rounded">
                  MVP
                </span>
              </h1>
              <p className="text-xs text-gray-500 uppercase tracking-widest">
                {t('appSubtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Quick Stats */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="flex flex-col items-end">
              <span className="text-gray-500 text-xs">S&P 500</span>
              {quickStats.sp500 ? (
                <span className={`font-mono ${quickStats.sp500.change >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                  {quickStats.sp500.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}{' '}
                  <span className="text-xs">
                    {quickStats.sp500.change >= 0 ? '+' : ''}{quickStats.sp500.change.toFixed(2)}%
                  </span>
                </span>
              ) : (
                <span className="text-gray-500 font-mono">--</span>
              )}
            </div>
            <div className="w-px h-8 bg-terminal-border"></div>
            <div className="flex flex-col items-end">
              <span className="text-gray-500 text-xs">BTC/USD</span>
              {quickStats.btc ? (
                <span className={`font-mono ${quickStats.btc.change >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                  {quickStats.btc.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}{' '}
                  <span className="text-xs">
                    {quickStats.btc.change >= 0 ? '+' : ''}{quickStats.btc.change.toFixed(2)}%
                  </span>
                </span>
              ) : (
                <span className="text-gray-500 font-mono">--</span>
              )}
            </div>
            <div className="w-px h-8 bg-terminal-border"></div>
            <div className="flex flex-col items-end">
              <span className="text-gray-500 text-xs">GOLD</span>
              {quickStats.gold ? (
                <span className={`font-mono ${quickStats.gold.change >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                  {quickStats.gold.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}{' '}
                  <span className="text-xs">
                    {quickStats.gold.change >= 0 ? '+' : ''}{quickStats.gold.change.toFixed(2)}%
                  </span>
                </span>
              ) : (
                <span className="text-gray-500 font-mono">--</span>
              )}
            </div>
          </div>

          {/* Refresh Button */}
          <div className="flex items-center gap-3">
            {/* Auto-refresh indicator */}
            {autoRefreshEnabled && timeUntilRefresh !== undefined && (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => onToggleAutoRefresh?.(!autoRefreshEnabled)}
                  className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                  title={autoRefreshEnabled ? t('autoRefreshOn') : t('autoRefreshOff')}
                >
                  <span className="text-neon-cyan">AUTO</span>
                </button>
                <span className="text-xs font-mono text-gray-400">
                  {Math.floor(timeUntilRefresh / 60)}:{(timeUntilRefresh % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
            {lastUpdate && (
              <span className="text-xs text-gray-500">
                {t('updated')}: {formatTime(lastUpdate)}
              </span>
            )}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="terminal-btn-primary flex items-center gap-2"
            >
              <IoRefresh className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('refresh')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
