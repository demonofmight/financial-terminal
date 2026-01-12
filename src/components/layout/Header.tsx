import { useState, useEffect, useCallback } from 'react';
import { IoRefresh } from 'react-icons/io5';
import { HiStatusOnline } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { useLanguage } from '../../i18n';
import { fetchSP500Index, fetchPreciousMetals } from '../../services/api/yahoo';
import { fetchCryptoMarketData } from '../../services/api/coingecko';
import { getMarketStatus, getAsiaGroupedStatus } from '../../utils/marketHours';
import { MarketStatusTooltip } from '../ui/MarketStatusTooltip';
import { AsiaMarketTooltip } from '../ui/AsiaMarketTooltip';

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
      const metalsData = await fetchPreciousMetals();
      // Find gold (GC=F) in the response
      const goldData = metalsData.find(m => m.symbol === 'GC=F');
      if (goldData) {
        setQuickStats(prev => ({
          ...prev,
          gold: { price: goldData.price, change: goldData.changePercent || 0 },
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

  // Get market statuses
  const usStatus = getMarketStatus('US');
  const euStatus = getMarketStatus('EU');
  const asiaGroupedStatus = getAsiaGroupedStatus();
  const bistStatus = getMarketStatus('BIST');

  // Get status color class
  const getStatusColor = (isOpen: boolean, hasExtended?: boolean) => {
    if (isOpen) return 'text-accent-green';
    if (hasExtended) return 'text-accent-amber';
    return 'text-neutral-500';
  };

  return (
    <header className="sticky top-0 z-50 bg-terminal-bg/98 backdrop-blur-sm border-b border-terminal-border">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 text-[11px] border-b border-terminal-border/50">
        <div className="flex items-center gap-3 text-neutral-500">
          <span className="flex items-center gap-1.5">
            <HiStatusOnline className="text-accent-green text-xs" />
            <span className="text-accent-green font-medium">{t('live')}</span>
          </span>
          <span className="text-terminal-border">|</span>
          <MarketStatusTooltip marketId="US">
            <span className="hover:text-neutral-300 transition-colors cursor-help">
              {t('usMarkets')}: {' '}
              <span className={getStatusColor(usStatus.isOpen, usStatus.statusText.includes('Extended'))}>
                {usStatus.statusText}
              </span>
            </span>
          </MarketStatusTooltip>
          <span className="text-terminal-border">|</span>
          <MarketStatusTooltip marketId="EU">
            <span className="hover:text-neutral-300 transition-colors cursor-help">
              EU: {' '}
              <span className={getStatusColor(euStatus.isOpen)}>
                {euStatus.isOpen ? t('open') : t('closed')}
              </span>
            </span>
          </MarketStatusTooltip>
          <span className="text-terminal-border">|</span>
          <AsiaMarketTooltip asiaStatus={asiaGroupedStatus}>
            <span className="hover:text-neutral-300 transition-colors cursor-help">
              Asia: {' '}
              <span className={asiaGroupedStatus.statusClass.replace('text-neon-', 'text-accent-')}>
                {asiaGroupedStatus.statusText}
              </span>
            </span>
          </AsiaMarketTooltip>
          <span className="text-terminal-border">|</span>
          <MarketStatusTooltip marketId="BIST">
            <span className="hover:text-neutral-300 transition-colors cursor-help">
              BIST: {' '}
              <span className={getStatusColor(bistStatus.isOpen)}>
                {bistStatus.isOpen ? t('open') : t('closed')}
              </span>
            </span>
          </MarketStatusTooltip>
        </div>
        <div className="flex items-center gap-3 text-neutral-500">
          {/* Language Switcher */}
          <div className="flex items-center gap-0.5 border border-terminal-border rounded-md overflow-hidden">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 text-[10px] font-mono transition-all ${
                language === 'en'
                  ? 'bg-accent-blue/20 text-accent-blue'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('tr')}
              className={`px-2 py-0.5 text-[10px] font-mono transition-all ${
                language === 'tr'
                  ? 'bg-accent-blue/20 text-accent-blue'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              TR
            </button>
          </div>
          <span className="text-terminal-border">|</span>
          <span>{formatDate(currentTime)}</span>
          <span className="font-mono text-accent-cyan">{formatTime(currentTime)} UTC</span>
        </div>
      </div>

      {/* Main Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-8 h-8 rounded-md bg-accent-green/10 flex items-center justify-center border border-accent-green/20"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <span className="text-accent-green font-bold text-sm">F</span>
          </motion.div>
          <div>
            <h1 className="text-lg font-display tracking-wider text-white flex items-center gap-2">
              {t('appName')}
              <span className="text-[10px] px-1.5 py-0.5 bg-accent-green/10 text-accent-green border border-accent-green/20 rounded">
                MVP
              </span>
            </h1>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest">
              {t('appSubtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick Stats */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            <QuickStatItem
              label="S&P 500"
              value={quickStats.sp500?.price}
              change={quickStats.sp500?.change}
            />
            <div className="w-px h-6 bg-terminal-border"></div>
            <QuickStatItem
              label="BTC"
              value={quickStats.btc?.price}
              change={quickStats.btc?.change}
            />
            <div className="w-px h-6 bg-terminal-border"></div>
            <QuickStatItem
              label="GOLD"
              value={quickStats.gold?.price}
              change={quickStats.gold?.change}
            />
          </div>

          {/* Refresh Button */}
          <div className="flex items-center gap-3">
            {autoRefreshEnabled && timeUntilRefresh !== undefined && (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => onToggleAutoRefresh?.(!autoRefreshEnabled)}
                  className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
                  title={autoRefreshEnabled ? t('autoRefreshOn') : t('autoRefreshOff')}
                >
                  <span className="text-accent-cyan">AUTO</span>
                </button>
                <span className="text-xs font-mono text-neutral-400">
                  {Math.floor(timeUntilRefresh / 60)}:{(timeUntilRefresh % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
            {lastUpdate && (
              <span className="text-[10px] text-neutral-500 hidden sm:inline">
                {t('updated')}: {formatTime(lastUpdate)}
              </span>
            )}
            <motion.button
              onClick={onRefresh}
              disabled={isLoading}
              className="terminal-btn-primary flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <IoRefresh className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('refresh')}</span>
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  );
}

// Quick stat component
function QuickStatItem({ label, value, change }: { label: string; value?: number; change?: number }) {
  const changeColor = change !== undefined && change >= 0 ? 'text-accent-green' : 'text-accent-red';

  return (
    <div className="flex flex-col items-end">
      <span className="text-neutral-500 text-[10px]">{label}</span>
      {value !== undefined ? (
        <span className={`font-mono text-xs ${changeColor}`}>
          {value.toLocaleString('en-US', { maximumFractionDigits: 0 })}{' '}
          <span className="text-[10px]">
            {change !== undefined && (change >= 0 ? '+' : '')}{change?.toFixed(2)}%
          </span>
        </span>
      ) : (
        <span className="text-neutral-500 font-mono text-xs">--</span>
      )}
    </div>
  );
}
