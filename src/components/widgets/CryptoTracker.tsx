import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { IoAddCircleOutline, IoCloseCircle, IoSettingsOutline, IoRefresh } from 'react-icons/io5';
import { useLanguage } from '../../i18n';
import { fetchCryptoMarketData, fetchTopCryptos } from '../../services/api/coingecko';
import { useCryptoWatchlist } from '../../hooks/useMarketData';
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
  const { cryptos: selectedCryptoIds, add: addCryptoToWatchlist, remove: removeCryptoFromWatchlist } = useCryptoWatchlist();

  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const [availableCryptos, setAvailableCryptos] = useState<CryptoOption[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch crypto data
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

  // Fetch available cryptos for adding
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

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch available when settings open
  useEffect(() => {
    if (showSettings && availableCryptos.length === 0) {
      fetchAvailable();
    }
  }, [showSettings, availableCryptos.length, fetchAvailable]);

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
      headerAction={
        <div className="flex items-center gap-1">
          {!showSettings && (
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-1.5 rounded text-gray-500 hover:text-gray-300 transition-all"
              title="Refresh"
            >
              <IoRefresh className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded transition-all ${
              showSettings ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <IoSettingsOutline className="text-sm" />
          </button>
        </div>
      }
    >
      {showSettings ? (
        <div className="space-y-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider">{t('addCryptocurrency')}</div>
          <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto scrollbar-thin">
            {availableCryptos
              .filter(ac => !selectedCryptoIds.includes(ac.id))
              .slice(0, 20)
              .map((crypto) => (
                <button
                  key={crypto.id}
                  onClick={() => handleAdd(crypto)}
                  className="flex items-center gap-2 p-2 rounded bg-terminal-border/30 hover:bg-terminal-border/50 transition-all text-xs"
                >
                  <IoAddCircleOutline className="text-neon-green" />
                  <span className="text-neon-cyan">{crypto.symbol}</span>
                  <span className="text-gray-500 truncate">{crypto.name}</span>
                </button>
              ))}
          </div>
          <button
            onClick={() => setShowSettings(false)}
            className="w-full py-2 text-xs text-gray-400 border border-terminal-border rounded hover:border-gray-500 transition-all"
          >
            {t('done')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {isLoading && cryptoData.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-xs text-neon-red">{error}</p>
              <button
                onClick={fetchData}
                className="mt-2 text-xs text-gray-400 hover:text-white"
              >
                Try again
              </button>
            </div>
          ) : (
            cryptoData.map((crypto) => (
              <div
                key={crypto.id}
                className="flex items-center justify-between p-2 rounded bg-terminal-border/30 hover:bg-terminal-border/50 transition-all group cursor-pointer"
                onClick={() => !editMode && onCryptoClick?.(crypto.id)}
              >
                <div className="flex items-center gap-3">
                  {editMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(crypto.id);
                      }}
                      className="text-neon-red hover:scale-110 transition-transform"
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
                    <span className="text-neon-cyan font-mono text-sm">{crypto.symbol}</span>
                    <span className="text-gray-500 text-xs ml-2">{crypto.name}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-sm text-white">
                    ${crypto.current_price.toLocaleString('en-US', {
                      minimumFractionDigits: crypto.current_price < 1 ? 4 : 2,
                      maximumFractionDigits: crypto.current_price < 1 ? 4 : 2,
                    })}
                  </div>
                  <div className={`font-mono text-xs ${
                    crypto.price_change_percentage_24h >= 0 ? 'value-positive' : 'value-negative'
                  }`}>
                    {crypto.price_change_percentage_24h >= 0 ? '+' : ''}
                    {crypto.price_change_percentage_24h.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex-1 py-2 text-xs rounded transition-all ${
                editMode
                  ? 'bg-neon-red/20 text-neon-red border border-neon-red/30'
                  : 'text-gray-500 border border-terminal-border hover:border-gray-500'
              }`}
            >
              {editMode ? t('done') : t('edit')}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex-1 py-2 text-xs text-gray-500 border border-terminal-border rounded hover:border-gray-500 transition-all"
            >
              + {t('add')}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
