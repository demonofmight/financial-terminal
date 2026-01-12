import axios from 'axios';

// Use Vite proxy to bypass CORS
const BASE_URL = '/api/yahoo/v8/finance/chart';

interface YahooQuoteResponse {
  chart: {
    result?: Array<{
      meta: {
        symbol: string;
        regularMarketPrice?: number;
        previousClose?: number;
        regularMarketChange?: number;
        regularMarketChangePercent?: number;
        chartPreviousClose?: number;
        regularMarketPreviousClose?: number;
        regularMarketTime?: number; // Unix timestamp of last trade
        currency?: string;
        exchangeName?: string;
      };
      indicators?: {
        quote: Array<{
          close: number[];
          high: number[];
          low: number[];
          open: number[];
          volume: number[];
        }>;
      };
    }>;
    error?: null | { code: string; description: string };
  };
}

export interface QuoteData {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  exchange: string;
  lastTradeTime?: number; // Unix timestamp of last trade
}

/**
 * Safe number helper - returns 0 if value is undefined, null, NaN, or Infinity
 */
function safeNumber(value: number | undefined | null, defaultValue: number = 0): number {
  if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
    return defaultValue;
  }
  return value;
}

/**
 * Fetch quote data for a single symbol
 */
export async function fetchQuote(symbol: string): Promise<QuoteData> {
  try {
    console.log(`Fetching Yahoo Finance quote for: ${symbol}`);
    const response = await axios.get<YahooQuoteResponse>(
      `${BASE_URL}/${symbol}`,
      {
        params: {
          interval: '1d',
          range: '1d',
        },
        timeout: 10000,
      }
    );

    console.log(`Yahoo response for ${symbol}:`, response.data);

    if (response.data?.chart?.error) {
      throw new Error(response.data.chart.error.description);
    }

    const result = response.data?.chart?.result?.[0];
    if (!result) {
      throw new Error(`No data for symbol ${symbol}`);
    }

    const meta = result.meta;

    // Debug: Log full meta object for futures
    if (symbol.includes('=F') || symbol.startsWith('^')) {
      console.log(`[DEBUG] Full meta for ${symbol}:`, JSON.stringify(meta, null, 2));
    }

    const price = safeNumber(meta.regularMarketPrice, 0);

    // Get previousClose from multiple potential sources
    const previousClose = safeNumber(
      meta.chartPreviousClose ?? meta.regularMarketPreviousClose ?? meta.previousClose,
      price
    );

    // Try to use direct change values from API if available (more reliable for futures)
    let change: number;
    let changePercent: number;

    if (meta.regularMarketChange !== undefined && meta.regularMarketChangePercent !== undefined) {
      // Use API-provided values (preferred for futures)
      change = safeNumber(meta.regularMarketChange, 0);
      changePercent = safeNumber(meta.regularMarketChangePercent, 0);
      console.log(`[QUOTE] ${symbol}: Using API change values`);
    } else {
      // Fallback: Calculate manually
      change = price - previousClose;
      changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;
      console.log(`[QUOTE] ${symbol}: Calculated change from previousClose=${previousClose}`);
    }

    console.log(`[QUOTE] ${symbol}: price=${price}, change=${change.toFixed(4)}, changePercent=${changePercent.toFixed(4)}%`);

    return {
      symbol: meta.symbol || symbol,
      price,
      previousClose,
      change: safeNumber(change),
      changePercent: safeNumber(changePercent),
      currency: meta.currency || 'USD',
      exchange: meta.exchangeName || 'Unknown',
      lastTradeTime: meta.regularMarketTime,
    };
  } catch (error) {
    console.error(`Yahoo Finance error for ${symbol}:`, error);
    throw new Error(`Failed to fetch quote for ${symbol}`);
  }
}

/**
 * Fetch multiple quotes
 */
export async function fetchMultipleQuotes(symbols: string[]): Promise<QuoteData[]> {
  const results = await Promise.allSettled(
    symbols.map((symbol) => fetchQuote(symbol))
  );

  return results
    .filter((result): result is PromiseFulfilledResult<QuoteData> => result.status === 'fulfilled')
    .map((result) => result.value);
}

// Symbol mappings for different markets
export const YAHOO_SYMBOLS = {
  // VIX
  VIX: '^VIX',

  // US Indices
  SP500: '^GSPC',
  NASDAQ: '^IXIC',
  DOW: '^DJI',

  // Global Indices
  DAX: '^GDAXI',
  FTSE: '^FTSE',
  CAC40: '^FCHI',
  NIKKEI: '^N225',
  HANGSENG: '^HSI',
  KOSPI: '^KS11',

  // BIST (Turkish Market)
  BIST100: 'XU100.IS',

  // Turkish Stocks (add .IS suffix)
  THYAO: 'THYAO.IS',
  SISE: 'SISE.IS',
  EREGL: 'EREGL.IS',
  GARAN: 'GARAN.IS',
  AKBNK: 'AKBNK.IS',
  YKBNK: 'YKBNK.IS',
  ASELS: 'ASELS.IS',
  KCHOL: 'KCHOL.IS',
  SAHOL: 'SAHOL.IS',
  TUPRS: 'TUPRS.IS',

  // Precious Metals (Futures)
  GOLD: 'GC=F',
  SILVER: 'SI=F',
  PLATINUM: 'PL=F',
  PALLADIUM: 'PA=F',

  // Commodities
  CRUDE_OIL: 'CL=F',
  BRENT: 'BZ=F',
  NATURAL_GAS: 'NG=F',
  COPPER: 'HG=F',

  // Treasury Yields
  TNX: '^TNX', // 10-Year
  FVX: '^FVX', // 5-Year
  IRX: '^IRX', // 13-Week
  TYX: '^TYX', // 30-Year
} as const;

/**
 * Fetch VIX data
 */
export async function fetchVIX(): Promise<QuoteData> {
  return fetchQuote(YAHOO_SYMBOLS.VIX);
}

/**
 * Fetch BIST 100 index and top stocks
 */
export async function fetchBISTData(): Promise<{
  index: QuoteData;
  stocks: QuoteData[];
}> {
  const symbols = [
    YAHOO_SYMBOLS.BIST100,
    YAHOO_SYMBOLS.THYAO,
    YAHOO_SYMBOLS.GARAN,
    YAHOO_SYMBOLS.AKBNK,
    YAHOO_SYMBOLS.EREGL,
    YAHOO_SYMBOLS.SISE,
    YAHOO_SYMBOLS.ASELS,
    YAHOO_SYMBOLS.KCHOL,
    YAHOO_SYMBOLS.SAHOL,
    YAHOO_SYMBOLS.TUPRS,
    YAHOO_SYMBOLS.YKBNK,
  ];

  const quotes = await fetchMultipleQuotes(symbols);

  const index = quotes.find(q => q.symbol === 'XU100.IS');
  const stocks = quotes.filter(q => q.symbol !== 'XU100.IS');

  if (!index) {
    throw new Error('Failed to fetch BIST 100 index');
  }

  return { index, stocks };
}

/**
 * Fetch global market indices
 */
export async function fetchGlobalIndices(): Promise<QuoteData[]> {
  const symbols = [
    YAHOO_SYMBOLS.SP500,
    YAHOO_SYMBOLS.NASDAQ,
    YAHOO_SYMBOLS.DOW,
    YAHOO_SYMBOLS.DAX,
    YAHOO_SYMBOLS.FTSE,
    YAHOO_SYMBOLS.CAC40,
    YAHOO_SYMBOLS.NIKKEI,
    YAHOO_SYMBOLS.HANGSENG,
    YAHOO_SYMBOLS.KOSPI,
  ];

  return fetchMultipleQuotes(symbols);
}

/**
 * Fetch Treasury yields
 */
export async function fetchTreasuryYields(): Promise<QuoteData[]> {
  const symbols = [
    YAHOO_SYMBOLS.IRX, // 3-month
    YAHOO_SYMBOLS.FVX, // 5-year
    YAHOO_SYMBOLS.TNX, // 10-year
    YAHOO_SYMBOLS.TYX, // 30-year
  ];

  return fetchMultipleQuotes(symbols);
}

/**
 * Fetch commodity prices
 */
export async function fetchCommodities(): Promise<QuoteData[]> {
  const symbols = [
    YAHOO_SYMBOLS.CRUDE_OIL,
    YAHOO_SYMBOLS.BRENT,
    YAHOO_SYMBOLS.NATURAL_GAS,
    YAHOO_SYMBOLS.COPPER,
  ];

  return fetchMultipleQuotes(symbols);
}

/**
 * Fetch precious metal prices using Yahoo Finance futures
 */
export async function fetchPreciousMetals(): Promise<QuoteData[]> {
  const symbols = [
    YAHOO_SYMBOLS.GOLD,
    YAHOO_SYMBOLS.SILVER,
    YAHOO_SYMBOLS.PLATINUM,
    YAHOO_SYMBOLS.PALLADIUM,
  ];

  return fetchMultipleQuotes(symbols);
}

// Sector ETF symbols
export const SECTOR_ETFS = {
  XLK: 'XLK',   // Technology
  XLV: 'XLV',   // Healthcare
  XLF: 'XLF',   // Financials
  XLE: 'XLE',   // Energy
  XLY: 'XLY',   // Consumer Discretionary
  XLI: 'XLI',   // Industrials
  XLB: 'XLB',   // Materials
  XLRE: 'XLRE', // Real Estate
  XLU: 'XLU',   // Utilities
  XLC: 'XLC',   // Communication Services
  XLP: 'XLP',   // Consumer Staples
  ITA: 'ITA',   // Aerospace & Defense
} as const;

// Major S&P 500 stocks for top movers
export const SP500_MAJOR_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'UNH', 'JNJ',
  'V', 'XOM', 'JPM', 'WMT', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV',
  'PFE', 'KO', 'COST', 'PEP', 'AVGO', 'TMO', 'MCD', 'CSCO', 'ACN', 'ABT',
  'DHR', 'LLY', 'NEE', 'VZ', 'NKE', 'ADBE', 'TXN', 'CMCSA', 'PM', 'WFC',
  'BMY', 'RTX', 'COP', 'UPS', 'HON', 'QCOM', 'T', 'LOW', 'UNP', 'INTC',
];

/**
 * Fetch US sector performance using ETFs
 */
export async function fetchSectorPerformance(): Promise<QuoteData[]> {
  const symbols = Object.values(SECTOR_ETFS);
  return fetchMultipleQuotes(symbols);
}

/**
 * Fetch S&P 500 major stocks and calculate top gainers/losers
 */
export async function fetchSP500TopMovers(): Promise<{
  gainers: QuoteData[];
  losers: QuoteData[];
}> {
  // Fetch a subset of major S&P 500 stocks
  const quotes = await fetchMultipleQuotes(SP500_MAJOR_STOCKS.slice(0, 30));

  console.log(`Fetched ${quotes.length} S&P 500 quotes`);

  if (quotes.length === 0) {
    return { gainers: [], losers: [] };
  }

  // Sort by change percentage
  const sorted = [...quotes].sort((a, b) => b.changePercent - a.changePercent);

  // Get top gainers (positive) and losers (negative)
  let gainers = sorted.filter(q => q.changePercent > 0).slice(0, 5);
  let losers = sorted.filter(q => q.changePercent < 0).slice(-5).reverse();

  // If market is closed (all changes are 0 or near 0), show top/bottom by absolute value
  if (gainers.length === 0 && losers.length === 0) {
    console.log('Market appears closed, showing top stocks by value');
    gainers = sorted.slice(0, 5);
    losers = sorted.slice(-5).reverse();
  }

  return { gainers, losers };
}

/**
 * Fetch S&P 500 index quote
 */
export async function fetchSP500Index(): Promise<QuoteData> {
  return fetchQuote(YAHOO_SYMBOLS.SP500);
}

/**
 * Check if a market is currently open based on symbol
 */
export function isMarketOpen(exchange: string): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const time = utcHour + utcMinutes / 60;
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday

  // Weekend check
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  switch (exchange.toUpperCase()) {
    case 'NYSE':
    case 'NASDAQ':
    case 'NMS':
    case 'NYQ':
    case 'NGM':
      // NYSE/NASDAQ: 14:30 - 21:00 UTC
      return time >= 14.5 && time < 21;

    case 'GER':
    case 'FRA':
      // Frankfurt: 08:00 - 16:30 UTC
      return time >= 8 && time < 16.5;

    case 'LSE':
    case 'LON':
      // London: 08:00 - 16:30 UTC
      return time >= 8 && time < 16.5;

    case 'PAR':
      // Paris: 08:00 - 16:30 UTC
      return time >= 8 && time < 16.5;

    case 'JPX':
    case 'TYO':
      // Tokyo: 00:00 - 06:00 UTC (with lunch break)
      return time >= 0 && time < 6;

    case 'HKG':
    case 'HKSE':
      // Hong Kong: 01:30 - 08:00 UTC
      return time >= 1.5 && time < 8;

    case 'KSC':
    case 'KRX':
      // Seoul: 00:00 - 06:30 UTC
      return time >= 0 && time < 6.5;

    case 'IST':
      // Istanbul: 07:00 - 15:00 UTC
      return time >= 7 && time < 15;

    default:
      return false;
  }
}
