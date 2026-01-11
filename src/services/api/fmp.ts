import axios from 'axios';
import type { SectorData, StockMover } from '../../types';

// Use Vite proxy to bypass CORS
const BASE_URL = '/api/fmp/api/v3';
const API_KEY = import.meta.env.VITE_FMP_API_KEY;

interface FMPSectorPerformance {
  sector: string;
  changesPercentage: string;
}

interface FMPStockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  marketCap?: number;
}

// Sector ETF symbol mapping
const SECTOR_ETF_MAP: Record<string, string> = {
  'Technology': 'XLK',
  'Healthcare': 'XLV',
  'Financial Services': 'XLF',
  'Financials': 'XLF',
  'Energy': 'XLE',
  'Consumer Cyclical': 'XLY',
  'Consumer Discretionary': 'XLY',
  'Industrials': 'XLI',
  'Basic Materials': 'XLB',
  'Materials': 'XLB',
  'Real Estate': 'XLRE',
  'Utilities': 'XLU',
  'Communication Services': 'XLC',
  'Consumer Defensive': 'XLP',
  'Consumer Staples': 'XLP',
};

// Fallback sector data using sector ETFs (including Defense)
const SECTOR_ETFS = ['XLK', 'XLV', 'XLF', 'XLE', 'XLY', 'XLI', 'XLB', 'XLRE', 'XLU', 'XLC', 'XLP', 'ITA'];

const SECTOR_ETF_NAMES: Record<string, string> = {
  'XLK': 'Technology',
  'XLV': 'Healthcare',
  'XLF': 'Financial Services',
  'XLE': 'Energy',
  'XLY': 'Consumer Cyclical',
  'XLI': 'Industrials',
  'XLB': 'Basic Materials',
  'XLRE': 'Real Estate',
  'XLU': 'Utilities',
  'XLC': 'Communication Services',
  'XLP': 'Consumer Defensive',
  'ITA': 'Aerospace & Defense',
};

/**
 * Fetch sector performance data using ETF quotes (fallback method)
 */
async function fetchSectorPerformanceViaETFs(): Promise<SectorData[]> {
  try {
    const response = await axios.get<FMPStockData[]>(
      `${BASE_URL}/quote/${SECTOR_ETFS.join(',')}`,
      {
        params: { apikey: API_KEY },
      }
    );

    return response.data.map((etf) => ({
      name: SECTOR_ETF_NAMES[etf.symbol] || etf.symbol,
      symbol: etf.symbol,
      change: etf.changesPercentage || 0,
      changesPercentage: etf.changesPercentage || 0,
    }));
  } catch (error) {
    console.error('FMP ETF Quotes error:', error);
    throw new Error('Failed to fetch sector ETF data');
  }
}

/**
 * Fetch sector performance data
 */
export async function fetchSectorPerformance(): Promise<SectorData[]> {
  try {
    // Try the sector-performance endpoint first
    const response = await axios.get<FMPSectorPerformance[]>(
      `${BASE_URL}/sector-performance`,
      {
        params: { apikey: API_KEY },
        timeout: 5000,
      }
    );

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      return response.data.map((sector) => {
        const changeStr = sector.changesPercentage || '0';
        const change = parseFloat(changeStr.replace('%', '')) || 0;
        const symbol = SECTOR_ETF_MAP[sector.sector] || sector.sector.substring(0, 3).toUpperCase();

        return {
          name: sector.sector,
          symbol,
          change,
          changesPercentage: change,
        };
      });
    }

    // If empty response, try ETF method
    return fetchSectorPerformanceViaETFs();
  } catch (error) {
    console.error('FMP Sector Performance error, trying ETF fallback:', error);
    // Fallback to ETF quotes
    return fetchSectorPerformanceViaETFs();
  }
}

/**
 * Fetch S&P 500 gainers using stock screener
 */
export async function fetchSP500Gainers(): Promise<StockMover[]> {
  try {
    // Try using stock screener endpoint (available on free tier)
    const response = await axios.get<FMPStockData[]>(
      `${BASE_URL}/stock-screener`,
      {
        params: {
          apikey: API_KEY,
          marketCapMoreThan: 10000000000, // $10B+ market cap
          volumeMoreThan: 1000000,
          limit: 50,
          exchange: 'NYSE,NASDAQ',
        },
        timeout: 5000,
      }
    );

    if (response.data && Array.isArray(response.data)) {
      // Sort by changesPercentage descending and take top 10
      const sorted = response.data
        .filter(s => s.changesPercentage !== undefined && s.changesPercentage > 0)
        .sort((a, b) => (b.changesPercentage || 0) - (a.changesPercentage || 0))
        .slice(0, 10);

      return sorted.map((stock) => ({
        symbol: stock.symbol,
        name: stock.name || stock.symbol,
        price: stock.price || 0,
        change: stock.change || 0,
        changesPercentage: stock.changesPercentage || 0,
      }));
    }

    throw new Error('No data from screener');
  } catch (error) {
    console.error('FMP Gainers error:', error);
    throw new Error('Failed to fetch gainers');
  }
}

/**
 * Fetch S&P 500 losers using stock screener
 */
export async function fetchSP500Losers(): Promise<StockMover[]> {
  try {
    // Try using stock screener endpoint
    const response = await axios.get<FMPStockData[]>(
      `${BASE_URL}/stock-screener`,
      {
        params: {
          apikey: API_KEY,
          marketCapMoreThan: 10000000000, // $10B+ market cap
          volumeMoreThan: 1000000,
          limit: 50,
          exchange: 'NYSE,NASDAQ',
        },
        timeout: 5000,
      }
    );

    if (response.data && Array.isArray(response.data)) {
      // Sort by changesPercentage ascending (most negative first) and take top 10
      const sorted = response.data
        .filter(s => s.changesPercentage !== undefined && s.changesPercentage < 0)
        .sort((a, b) => (a.changesPercentage || 0) - (b.changesPercentage || 0))
        .slice(0, 10);

      return sorted.map((stock) => ({
        symbol: stock.symbol,
        name: stock.name || stock.symbol,
        price: stock.price || 0,
        change: stock.change || 0,
        changesPercentage: stock.changesPercentage || 0,
      }));
    }

    throw new Error('No data from screener');
  } catch (error) {
    console.error('FMP Losers error:', error);
    throw new Error('Failed to fetch losers');
  }
}

/**
 * Fetch most active stocks
 */
export async function fetchMostActive(): Promise<StockMover[]> {
  try {
    const response = await axios.get<FMPStockData[]>(
      `${BASE_URL}/stock-screener`,
      {
        params: {
          apikey: API_KEY,
          marketCapMoreThan: 10000000000,
          volumeMoreThan: 10000000, // High volume
          limit: 10,
          exchange: 'NYSE,NASDAQ',
        },
        timeout: 5000,
      }
    );

    if (response.data && Array.isArray(response.data)) {
      return response.data.map((stock) => ({
        symbol: stock.symbol,
        name: stock.name || stock.symbol,
        price: stock.price || 0,
        change: stock.change || 0,
        changesPercentage: stock.changesPercentage || 0,
      }));
    }

    throw new Error('No data');
  } catch (error) {
    console.error('FMP Most Active error:', error);
    throw new Error('Failed to fetch most active');
  }
}

/**
 * Fetch stock quote
 */
export async function fetchStockQuote(symbol: string): Promise<FMPStockData | null> {
  try {
    const response = await axios.get<FMPStockData[]>(
      `${BASE_URL}/quote/${symbol}`,
      {
        params: { apikey: API_KEY },
      }
    );

    return response.data[0] || null;
  } catch (error) {
    console.error(`FMP Quote error for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch multiple stock quotes
 */
export async function fetchMultipleQuotes(symbols: string[]): Promise<FMPStockData[]> {
  try {
    const response = await axios.get<FMPStockData[]>(
      `${BASE_URL}/quote/${symbols.join(',')}`,
      {
        params: { apikey: API_KEY },
      }
    );

    return response.data;
  } catch (error) {
    console.error('FMP Multiple Quotes error:', error);
    throw new Error('Failed to fetch quotes');
  }
}

/**
 * Fetch index quote (S&P 500, NASDAQ, etc.)
 */
export async function fetchIndexQuote(symbol: string): Promise<{
  price: number;
  change: number;
  changesPercentage: number;
} | null> {
  try {
    const response = await axios.get<Array<{
      price: number;
      change: number;
      changesPercentage: number;
    }>>(
      `${BASE_URL}/quote/${symbol}`,
      {
        params: { apikey: API_KEY },
      }
    );

    return response.data[0] || null;
  } catch (error) {
    console.error(`FMP Index Quote error for ${symbol}:`, error);
    return null;
  }
}

/**
 * Economic Calendar Event from FMP
 */
export interface EconomicCalendarEvent {
  event: string;
  date: string;
  country: string;
  actual: string | null;
  previous: string | null;
  change: number | null;
  changePercentage: number | null;
  estimate: string | null;
  impact: 'High' | 'Medium' | 'Low';
}

/**
 * Fetch economic calendar events
 */
export async function fetchEconomicCalendar(): Promise<EconomicCalendarEvent[]> {
  try {
    // Get events for the next 7 days
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const fromDate = today.toISOString().split('T')[0];
    const toDate = nextWeek.toISOString().split('T')[0];

    const response = await axios.get<EconomicCalendarEvent[]>(
      `${BASE_URL}/economic_calendar`,
      {
        params: {
          from: fromDate,
          to: toDate,
          apikey: API_KEY,
        },
        timeout: 10000,
      }
    );

    console.log('Economic calendar response:', response.data);

    if (response.data && Array.isArray(response.data)) {
      // Filter for major economies and sort by date
      const majorCountries = ['US', 'EU', 'GB', 'JP', 'CN', 'DE', 'FR'];
      const filtered = response.data
        .filter(event => majorCountries.includes(event.country))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return filtered.slice(0, 15); // Return top 15 events
    }

    return [];
  } catch (error) {
    console.error('FMP Economic Calendar error:', error);
    throw new Error('Failed to fetch economic calendar');
  }
}
