import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card } from '../ui/Card';
import {
  IoAddCircleOutline,
  IoCloseCircle,
  IoSettingsOutline,
  IoRefresh,
  IoSearchOutline,
  IoChevronBack,
  IoChevronForward
} from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../i18n';
import { fetchCryptoMarketData, fetchAllCryptos } from '../../services/api/coinlore';
import { useCryptoWatchlist } from '../../hooks/useMarketData';
import { useRefresh } from '../../contexts/RefreshContext';
import { useLoading, DATA_SOURCE_IDS } from '../../contexts/LoadingContext';
import type { CryptoData } from '../../types';

interface CryptoOption {
  id: string;
  symbol: string;
  name: string;
  rank?: number;
}

interface CryptoTrackerProps {
  onCryptoClick?: (id: string) => void;
}

const ITEMS_PER_PAGE = 5;

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

  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Calculate total pages
  const totalPages = Math.ceil(cryptoData.length / ITEMS_PER_PAGE);

  // Get current page items
  const currentItems = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return cryptoData.slice(start, start + ITEMS_PER_PAGE);
  }, [cryptoData, currentPage]);

  // Filter available cryptos based on search
  const filteredCryptos = useMemo(() => {
    if (!searchQuery.trim()) {
      // Show popular cryptos when no search
      return availableCryptos
        .filter(ac => !selectedCryptoIds.includes(ac.id))
        .slice(0, 30);
    }

    const query = searchQuery.toLowerCase();
    return availableCryptos
      .filter(ac =>
        !selectedCryptoIds.includes(ac.id) &&
        (ac.symbol.toLowerCase().includes(query) ||
         ac.name.toLowerCase().includes(query) ||
         ac.id.toLowerCase().includes(query))
      )
      .slice(0, 30);
  }, [availableCryptos, selectedCryptoIds, searchQuery]);

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
      // Sort by market cap (rank) descending
      const sortedData = [...data].sort((a, b) => b.market_cap - a.market_cap);
      setCryptoData(sortedData);
    } catch (err) {
      console.error('Failed to fetch crypto data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCryptoIds]);

  const fetchAvailable = useCallback(async () => {
    if (availableCryptos.length > 0) return;

    setIsSearching(true);
    try {
      const allCryptos = await fetchAllCryptos();
      setAvailableCryptos(
        allCryptos.map((c) => ({
          id: c.id,
          symbol: c.symbol,
          name: c.name,
          rank: c.rank,
        }))
      );
    } catch (err) {
      console.error('Failed to fetch available cryptos:', err);
    } finally {
      setIsSearching(false);
    }
  }, [availableCryptos.length]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refreshKey > 0) {
      fetchData();
    }
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showSettings) {
      fetchAvailable();
    }
  }, [showSettings, fetchAvailable]);

  // Mark as loaded for initial loading screen
  useEffect(() => {
    if (!isLoading && !hasMarkedLoaded.current) {
      markLoaded(DATA_SOURCE_IDS.CRYPTO);
      hasMarkedLoaded.current = true;
    }
  }, [isLoading, markLoaded]);

  // Reset to first page when crypto list changes
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedCryptoIds.length]);

  const handleRemove = async (id: string) => {
    await removeCryptoFromWatchlist(id);
  };

  const handleAdd = async (crypto: CryptoOption) => {
    await addCryptoToWatchlist(crypto.id);
    setSearchQuery('');
  };

  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
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
            onClick={() => {
              setShowSettings(!showSettings);
              setSearchQuery('');
            }}
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
          {/* Search Input */}
          <div className="relative">
            <IoSearchOutline className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500 text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchCrypto') || 'Search crypto...'}
              className="w-full pl-7 pr-3 py-1.5 text-[11px] bg-terminal-bg border border-terminal-border rounded-md
                text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-accent-cyan/50"
            />
          </div>

          {/* Available Cryptos List */}
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
            {searchQuery ? t('searchResults') || 'Search Results' : t('popularCryptos') || 'Popular Cryptocurrencies'}
          </div>

          {isSearching ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-4 h-4 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto">
              {filteredCryptos.length === 0 ? (
                <div className="col-span-2 text-center py-4 text-[11px] text-neutral-500">
                  {searchQuery ? (t('noResults') || 'No results found') : (t('loading') || 'Loading...')}
                </div>
              ) : (
                filteredCryptos.map((crypto) => (
                  <button
                    key={crypto.id}
                    onClick={() => handleAdd(crypto)}
                    className="flex items-center gap-1.5 p-1.5 rounded-md bg-terminal-card-hover hover:bg-terminal-border transition-colors text-[11px] text-left"
                  >
                    <IoAddCircleOutline className="text-accent-green flex-shrink-0" />
                    <span className="text-accent-cyan font-mono">{crypto.symbol}</span>
                    <span className="text-neutral-500 truncate text-[10px]">{crypto.name}</span>
                    {crypto.rank && crypto.rank <= 100 && (
                      <span className="text-[9px] text-neutral-600 ml-auto">#{crypto.rank}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          <button
            onClick={() => {
              setShowSettings(false);
              setSearchQuery('');
            }}
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
          ) : cryptoData.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-neutral-500">{t('noCryptos') || 'No cryptocurrencies added'}</p>
              <button
                onClick={() => setShowSettings(true)}
                className="mt-2 text-xs text-accent-cyan hover:text-accent-cyan/80"
              >
                + {t('addCryptocurrency') || 'Add cryptocurrency'}
              </button>
            </div>
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-1.5"
                >
                  {currentItems.map((crypto, index) => (
                    <motion.div
                      key={crypto.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
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
                          onError={(e) => {
                            // Fallback for missing icons
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
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
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="p-1 rounded text-neutral-500 hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <IoChevronBack className="text-sm" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goToPage(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          i === currentPage
                            ? 'bg-accent-cyan'
                            : 'bg-neutral-600 hover:bg-neutral-500'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages - 1}
                    className="p-1 rounded text-neutral-500 hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <IoChevronForward className="text-sm" />
                  </button>
                </div>
              )}
            </>
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
