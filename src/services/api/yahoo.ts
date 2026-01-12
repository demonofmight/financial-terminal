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

  // US Futures (for after-hours/pre-market trading)
  ES: 'ES=F', // S&P 500 E-mini (US500)
  NQ: 'NQ=F', // NASDAQ E-mini (US100)
  YM: 'YM=F', // Dow E-mini (US30)

  // Global Indices
  DAX: '^GDAXI',
  FTSE: '^FTSE',
  CAC40: '^FCHI',
  NIKKEI: '^N225',
  HANGSENG: '^HSI',
  KOSPI: '^KS11',

  // BIST (Turkish Market)
  BIST100: 'XU100.IS',

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

// BIST100 constituent stocks (all 100 companies)
// Updated list - Yahoo Finance uses .IS suffix for Istanbul Stock Exchange
export const BIST100_STOCKS = [
  // Banking & Finance
  'AKBNK.IS', 'GARAN.IS', 'ISCTR.IS', 'YKBNK.IS', 'VAKBN.IS', 'HALKB.IS', 'QNBFB.IS', 'SKBNK.IS', 'TSKB.IS', 'ALBRK.IS',
  // Holdings
  'KCHOL.IS', 'SAHOL.IS', 'DOHOL.IS', 'TAVHL.IS', 'AGHOL.IS', 'ECZYT.IS', 'TKFEN.IS', 'GLYHO.IS', 'NTHOL.IS', 'KOZAL.IS',
  // Industry & Manufacturing
  'EREGL.IS', 'KRDMD.IS', 'TOASO.IS', 'FROTO.IS', 'OTKAR.IS', 'TTRAK.IS', 'ARCLK.IS', 'VESTL.IS', 'KLMSN.IS', 'BRSAN.IS',
  // Energy & Utilities
  'TUPRS.IS', 'PETKM.IS', 'AYGAZ.IS', 'AKSEN.IS', 'ENKAI.IS', 'ODAS.IS', 'AKSA.IS', 'ZOREN.IS', 'GUBRF.IS', 'KONTR.IS',
  // Telecom & Tech
  'TCELL.IS', 'TTKOM.IS', 'ASELS.IS', 'LOGO.IS', 'INDES.IS', 'ARENA.IS', 'NETAS.IS', 'KAREL.IS', 'PAPIL.IS', 'ARDYZ.IS',
  // Aviation & Transport
  'THYAO.IS', 'PGSUS.IS', 'CLEBI.IS', 'RYSAS.IS', 'BEYAZ.IS',
  // Retail & Consumer
  'BIMAS.IS', 'MGROS.IS', 'SOKM.IS', 'BIZIM.IS', 'MAVI.IS', 'VAKKO.IS', 'ADEL.IS', 'CCOLA.IS', 'ULKER.IS', 'BANVT.IS',
  // Construction & Real Estate
  'EKGYO.IS', 'ISGYO.IS', 'EMLAK.IS', 'KLGYO.IS', 'SNGYO.IS', 'OYAKC.IS', 'BUCIM.IS', 'GOLTS.IS', 'CIMSA.IS', 'ADANA.IS',
  // Healthcare & Pharma
  'SELEC.IS', 'DEVA.IS', 'ECILC.IS', 'LKMNH.IS', 'MPARK.IS',
  // Glass & Chemicals
  'SISE.IS', 'TRKCM.IS', 'SODA.IS', 'BAGFS.IS', 'EGEEN.IS', 'AKFYE.IS', 'HEKTS.IS', 'ALKIM.IS', 'BRYAT.IS', 'GEDZA.IS',
  // Mining & Metals
  'KOZAA.IS', 'IPEKE.IS', 'KRVGD.IS',
  // Textiles & Apparel
  'KORDS.IS', 'YATAS.IS', 'DESA.IS', 'BLCYT.IS', 'BRKO.IS',
  // Other Industrials
  'AEFES.IS', 'PRKME.IS', 'ISMEN.IS', 'GWIND.IS', 'EUPWR.IS', 'GESAN.IS', 'VESBE.IS', 'CANTE.IS', 'MIATK.IS', 'KZBGY.IS',
] as const;

/**
 * Fetch BIST 100 index and all constituent stocks
 * Fetches in batches to avoid overwhelming the API
 */
export async function fetchBISTData(): Promise<{
  index: QuoteData;
  stocks: QuoteData[];
}> {
  console.log('[BIST] Fetching BIST100 index and all constituent stocks...');

  // First fetch the index
  const indexQuote = await fetchQuote(YAHOO_SYMBOLS.BIST100);

  // Fetch all stocks in batches of 20 to avoid rate limiting
  const batchSize = 20;
  const allStocks: QuoteData[] = [];

  for (let i = 0; i < BIST100_STOCKS.length; i += batchSize) {
    const batch = BIST100_STOCKS.slice(i, i + batchSize) as string[];
    console.log(`[BIST] Fetching batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(BIST100_STOCKS.length / batchSize)}`);

    const batchResults = await fetchMultipleQuotes(batch);
    allStocks.push(...batchResults);

    // Small delay between batches to be nice to the API
    if (i + batchSize < BIST100_STOCKS.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`[BIST] Successfully fetched ${allStocks.length} stocks`);

  return { index: indexQuote, stocks: allStocks };
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
 * Fetch US Futures for extended hours trading (pre-market, after-hours, Sunday futures)
 * Returns ES (S&P 500), NQ (NASDAQ), YM (Dow) futures
 */
export async function fetchUSFutures(): Promise<QuoteData[]> {
  const symbols = [
    YAHOO_SYMBOLS.ES,
    YAHOO_SYMBOLS.NQ,
    YAHOO_SYMBOLS.YM,
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
