// API Services - Export all with explicit naming to avoid conflicts

// CoinGecko exports
export {
  fetchCryptoMarketData,
  searchCrypto,
  fetchTopCryptos,
  fetchSimplePrices,
} from './coingecko';

// Fear & Greed exports
export {
  fetchFearGreedIndex,
  getClassificationFromValue,
  getColorFromValue,
  type FearGreedData,
} from './feargreed';

// FMP exports
export {
  fetchSectorPerformance,
  fetchSP500Gainers,
  fetchSP500Losers,
  fetchMostActive,
  fetchStockQuote,
  fetchMultipleQuotes as fetchFMPQuotes,
  fetchIndexQuote,
} from './fmp';

// Gold API exports
export {
  fetchMetalPrice,
  fetchAllMetalPrices,
  fetchGoldWithGrams,
} from './goldapi';

// Exchange Rate exports
export {
  fetchExchangeRates,
  fetchPairRate,
  fetchCurrencyRates,
} from './exchange';

// Yahoo Finance exports
export {
  fetchQuote as fetchYahooQuote,
  fetchMultipleQuotes as fetchYahooQuotes,
  fetchVIX,
  fetchBISTData,
  fetchGlobalIndices,
  fetchTreasuryYields,
  fetchCommodities,
  YAHOO_SYMBOLS,
  type QuoteData,
} from './yahoo';
