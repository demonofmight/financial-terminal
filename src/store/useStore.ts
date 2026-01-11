import { create } from 'zustand';
import type {
  SectorData,
  StockMover,
  MetalPrice,
  CryptoData,
  FearGreedData,
  VixData,
  CurrencyRate,
  BistOverviewData,
} from '../types';

// Additional types for new widgets
export interface GlobalIndexData {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changesPercentage: number;
  region: 'americas' | 'europe' | 'asia';
}

export interface TreasuryYieldData {
  maturity: string;
  yield: number;
  change: number;
}

export interface CommodityData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  unit: string;
}

export interface EconomicEventData {
  id: string;
  date: string;
  time: string;
  event: string;
  country: string;
  impact: 'high' | 'medium' | 'low';
  forecast?: string;
  previous?: string;
  actual?: string;
}

interface MarketDataState {
  // Data
  sectors: SectorData[];
  sp500Gainers: StockMover[];
  sp500Losers: StockMover[];
  metals: MetalPrice[];
  cryptos: CryptoData[];
  fearGreed: FearGreedData | null;
  vix: VixData | null;
  currencies: CurrencyRate[];
  bist: BistOverviewData | null;
  globalIndices: GlobalIndexData[];
  treasuryYields: TreasuryYieldData[];
  commodities: CommodityData[];
  economicEvents: EconomicEventData[];

  // User preferences
  selectedCryptos: string[];

  // UI State
  isLoading: boolean;
  lastUpdate: Date | null;
  error: string | null;

  // Actions
  setSectors: (data: SectorData[]) => void;
  setSP500Data: (gainers: StockMover[], losers: StockMover[]) => void;
  setMetals: (data: MetalPrice[]) => void;
  setCryptos: (data: CryptoData[]) => void;
  setFearGreed: (data: FearGreedData) => void;
  setVix: (data: VixData) => void;
  setCurrencies: (data: CurrencyRate[]) => void;
  setBist: (data: BistOverviewData) => void;
  setGlobalIndices: (data: GlobalIndexData[]) => void;
  setTreasuryYields: (data: TreasuryYieldData[]) => void;
  setCommodities: (data: CommodityData[]) => void;
  setEconomicEvents: (data: EconomicEventData[]) => void;
  setSelectedCryptos: (cryptos: string[]) => void;
  addCrypto: (cryptoId: string) => void;
  removeCrypto: (cryptoId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateLastRefresh: () => void;
  refreshAllData: () => Promise<void>;
}

// Default crypto selections
const DEFAULT_CRYPTOS = ['bitcoin', 'ethereum', 'solana', 'ripple', 'binancecoin'];

export const useStore = create<MarketDataState>((set, get) => ({
  // Initial data state
  sectors: [],
  sp500Gainers: [],
  sp500Losers: [],
  metals: [],
  cryptos: [],
  fearGreed: null,
  vix: null,
  currencies: [],
  bist: null,
  globalIndices: [],
  treasuryYields: [],
  commodities: [],
  economicEvents: [],

  // User preferences
  selectedCryptos: DEFAULT_CRYPTOS,

  // UI state
  isLoading: false,
  lastUpdate: null,
  error: null,

  // Setters
  setSectors: (data) => set({ sectors: data }),
  setSP500Data: (gainers, losers) => set({ sp500Gainers: gainers, sp500Losers: losers }),
  setMetals: (data) => set({ metals: data }),
  setCryptos: (data) => set({ cryptos: data }),
  setFearGreed: (data) => set({ fearGreed: data }),
  setVix: (data) => set({ vix: data }),
  setCurrencies: (data) => set({ currencies: data }),
  setBist: (data) => set({ bist: data }),
  setGlobalIndices: (data) => set({ globalIndices: data }),
  setTreasuryYields: (data) => set({ treasuryYields: data }),
  setCommodities: (data) => set({ commodities: data }),
  setEconomicEvents: (data) => set({ economicEvents: data }),

  setSelectedCryptos: (cryptos) => set({ selectedCryptos: cryptos }),
  addCrypto: (cryptoId) => {
    const current = get().selectedCryptos;
    if (!current.includes(cryptoId)) {
      set({ selectedCryptos: [...current, cryptoId] });
    }
  },
  removeCrypto: (cryptoId) => {
    const current = get().selectedCryptos;
    set({ selectedCryptos: current.filter((id) => id !== cryptoId) });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  updateLastRefresh: () => set({ lastUpdate: new Date() }),

  // Main refresh function - will be connected to API services later
  refreshAllData: async () => {
    const store = get();
    store.setLoading(true);
    store.setError(null);

    try {
      // TODO: Replace with actual API calls
      // For now, this just updates the timestamp
      // When API services are ready:
      // await Promise.all([
      //   fetchSectors(),
      //   fetchSP500(),
      //   fetchMetals(),
      //   fetchCryptos(store.selectedCryptos),
      //   fetchFearGreed(),
      //   fetchVix(),
      //   fetchCurrencies(),
      //   fetchBist(),
      //   fetchGlobalIndices(),
      //   fetchTreasuryYields(),
      //   fetchCommodities(),
      // ]);

      store.updateLastRefresh();
    } catch (error) {
      store.setError(error instanceof Error ? error.message : 'Failed to refresh data');
    } finally {
      store.setLoading(false);
    }
  },
}));
