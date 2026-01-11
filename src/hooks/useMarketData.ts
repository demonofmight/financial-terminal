import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { cryptoWatchlist, initializeDatabase } from '../services/db';

/**
 * Hook to initialize and sync market data with persistent storage
 */
export function useMarketData() {
  const [isInitialized, setIsInitialized] = useState(false);
  const store = useStore();

  // Initialize from IndexedDB on mount
  useEffect(() => {
    async function init() {
      try {
        const { selectedCryptos } = await initializeDatabase();
        store.setSelectedCryptos(selectedCryptos);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize market data:', error);
        setIsInitialized(true); // Still mark as initialized to allow app to function
      }
    }

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync crypto watchlist changes to IndexedDB
  useEffect(() => {
    if (!isInitialized) return;

    cryptoWatchlist.setAll(store.selectedCryptos).catch((error) => {
      console.error('Failed to sync crypto watchlist:', error);
    });
  }, [store.selectedCryptos, isInitialized]);

  return {
    isInitialized,
    isLoading: store.isLoading,
    lastUpdate: store.lastUpdate,
    error: store.error,
    refresh: store.refreshAllData,
  };
}

/**
 * Hook for managing crypto watchlist with persistence
 */
export function useCryptoWatchlist() {
  const { selectedCryptos, addCrypto, removeCrypto, setSelectedCryptos } = useStore();

  const add = async (cryptoId: string) => {
    addCrypto(cryptoId);
    await cryptoWatchlist.add(cryptoId);
  };

  const remove = async (cryptoId: string) => {
    removeCrypto(cryptoId);
    await cryptoWatchlist.remove(cryptoId);
  };

  const reorder = async (newOrder: string[]) => {
    setSelectedCryptos(newOrder);
    await cryptoWatchlist.reorder(newOrder);
  };

  return {
    cryptos: selectedCryptos,
    add,
    remove,
    reorder,
  };
}
