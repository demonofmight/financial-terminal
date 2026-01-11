export interface SectorData {
  name: string;
  symbol: string;
  change: number;
  changesPercentage: number;
}

export interface StockMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
}

export interface MetalPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  currency: string;
}

export interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap: number;
  image: string;
}

export interface FearGreedData {
  value: number;
  value_classification: string;
  timestamp: string;
}

export interface VixData {
  value: number;
  change: number;
  changesPercentage: number;
}

export interface CurrencyRate {
  pair: string;
  rate: number;
  change: number;
  changesPercentage: number;
}

export interface BistStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
}

export interface BistOverviewData {
  indexValue: number;
  indexChange: number;
  indexChangePercentage: number;
  topGainers: BistStock[];
  topLosers: BistStock[];
}

export interface MarketStatus {
  isOpen: boolean;
  nextOpen?: string;
  nextClose?: string;
}

// Global market indices
export interface GlobalIndexData {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changesPercentage: number;
  region: 'americas' | 'europe' | 'asia';
}

// Treasury yields
export interface TreasuryYieldData {
  maturity: string;
  yield: number;
  change: number;
}

// Commodities
export interface CommodityData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  unit: string;
}

// Economic calendar events
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
