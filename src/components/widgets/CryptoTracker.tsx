import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../ui/Card';
import { IoAddCircleOutline, IoCloseCircle, IoSettingsOutline, IoRefresh } from 'react-icons/io5';
import { motion } from 'framer-motion';
import { useLanguage } from '../../i18n';
import { fetchCryptoMarketData, fetchTopCryptos } from '../../services/api/coingecko';
import { useCryptoWatchlist } from '../../hooks/useMarketData';
import { useRefresh } from '../../contexts/RefreshContext';
import { useLoading, DATA_SOURCE_IDS } from '../../contexts/LoadingContext';
import type { CryptoData } from '../../types';

interface CryptoOption {
  id: string;
  symbol: string;
  name: string;
}

interface CryptoTrackerProps {
  onCryptoClick?: (id: string) => void;
}

export function CryptoTracker({ onCryptoClick }: CryptoTrackerProps) {
  const { t } = useLanguage();
  const { refreshKey } = useRefresh();
  const { markLoaded } = useLoading();
  const hasMarkedLoaded = useRef(false);
  const { cryptos: selectedCryptoIds, add: addCryptoToWatchlist, remove: removeCryptoFromWatchlist } = useCryptoWatchlist();

  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const [availableCryptos, setAvailableCryptos] = useState<CryptoOption[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (selectedCryptoIds.length === 0) {
      setCryptoData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchCryptoMarketData(selectedCryptoIds);
      setCryptoData(data);
    } catch (err) {
      console.error('Failed to fetch crypto data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCryptoIds]);

  const fetchAvailable = useCallback(async () => {
    try {
      const topCryptos = await fetchTopCryptos(50);
      setAvailableCryptos(
        topCryptos.map((c) => ({
          id: c.id,
          symbol: c.symbol,
          name: c.name,
        }))
      );
    } catch (err) {
      console.error('Failed to fetch available cryptos:', err);
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

  useEffect(() => {
    if (showSettings && availableCryptos.length === 0) {
      fetchAvailable();
    }
  }, [showSettings, availableCryptos.length, fetchAvailable]);

  // Mark as loaded for initial loading screen
  useEffect(() => {
    if (!isLoading && !hasMarkedLoaded.current) {
      markLoaded(DATA_SOURCE_IDS.CRYPTO);
      hasMarkedLoaded.current = true;
    }
  }, [isLoading, markLoaded]);

  const handleRemove = async (id: string) => {
    await removeCryptoFromWatchlist(id);
  };

  const handleAdd = async (crypto: CryptoOption) => {
    await addCryptoToWatchlist(crypto.id);
    setShowSettings(false);
  };

  return (
    <Card
      title={t('cryptoTracker')}
      compact
      headerAction={
        <div className="flex items-center gap-1">
          {!showSettings && (
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-1 rounded text-neutral-500 hover:text-neutral-300 transition-colors"
              title="Refresh"
            >
              <IoRefresh className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1 rounded transition-colors ${
              showSettings ? 'bg-accent-cyan/20 text-accent-cyan' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <IoSettingsOutline className="text-sm" />
          </button>
        </div>
      }
    >
      {showSettings ? (
        <div className="space-y-2">
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider">{t('addCryptocurrency')}</div>
          <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto">
            {availableCryptos
              .filter(ac => !selectedCryptoIds.includes(ac.id))
              .slice(0, 20)
              .map((crypto) => (
                <button
                  key={crypto.id}
                  onClick={() => handleAdd(crypto)}
                  className="flex items-center gap-1.5 p-1.5 rounded-md bg-terminal-card-hover hover:bg-terminal-border transition-colors text-[11px]"
                >
                  <IoAddCircleOutline className="text-accent-green" />
                  <span className="text-accent-cyan">{crypto.symbol.toUpperCase()}</span>
                  <span className="text-neutral-500 truncate">{crypto.name}</span>
                </button>
              ))}
          </div>
          <button
            onClick={() => setShowSettings(false)}
            className="w-full py-1.5 text-[10px] text-neutral-400 border border-terminal-border rounded-md hover:border-neutral-600 transition-colors"
          >
            {t('done')}
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {isLoading && cryptoData.length === 0 ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-xs text-accent-red">{error}</p>
              <button onClick={fetchData} className="mt-2 text-xs text-neutral-400 hover:text-white">
                Try again
              </button>
            </div>
          ) : (
            cryptoData.map((crypto, index) => (
              <motion.div
                key={crypto.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-2 rounded-md bg-terminal-card-hover hover:bg-terminal-border transition-colors group cursor-pointer"
                onClick={() => !editMode && onCryptoClick?.(crypto.id)}
              >
                <div className="flex items-center gap-2">
                  {editMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(crypto.id);
                      }}
                      className="text-accent-red hover:scale-110 transition-transform"
                    >
                      <IoCloseCircle />
                    </button>
                  )}
                  <img
                    src={crypto.image}
                    alt={crypto.name}
                    className="w-5 h-5 rounded-full"
                  />
                  <div>
                    <div className="text-xs font-medium text-neutral-200">{crypto.name}</div>
                    <div className="text-[10px] text-neutral-500 font-mono uppercase">{crypto.symbol}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-xs text-neutral-200">
                    ${crypto.current_price.toLocaleString('en-US', {
                      minimumFractionDigits: crypto.current_price < 1 ? 4 : 2,
                      maximumFractionDigits: crypto.current_price < 1 ? 4 : 2,
                    })}
                  </div>
                  <div className={`font-mono text-[10px] ${
                    crypto.price_change_percentage_24h >= 0 ? 'text-accent-green' : 'text-accent-red'
                  }`}>
                    {crypto.price_change_percentage_24h >= 0 ? '+' : ''}{crypto.price_change_percentage_24h.toFixed(2)}%
                  </div>
                </div>
              </motion.div>
            ))
          )}

          <div className="flex gap-1.5 pt-1.5">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex-1 py-1.5 text-[10px] rounded-md transition-colors ${
                editMode
                  ? 'bg-accent-red/10 text-accent-red border border-accent-red/25'
                  : 'text-neutral-500 border border-terminal-border hover:border-neutral-600'
              }`}
            >
              {editMode ? t('done') : t('edit')}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex-1 py-1.5 text-[10px] text-neutral-500 border border-terminal-border rounded-md hover:border-neutral-600 transition-colors"
            >
              + {t('add')}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
