import axios from 'axios';
import type { CurrencyRate } from '../../types';
import { cache } from '../db';

// Frankfurter API - Free forex rates from ECB with historical data
const FRANKFURTER_URL = '/api/frankfurter';

// Cache duration
const CACHE_DURATION = 5; // 5 minutes

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

// Currency pairs we want to track
const CURRENCY_PAIRS = [
  { pair: 'USD/TRY', base: 'USD', quote: 'TRY' },
  { pair: 'EUR/USD', base: 'EUR', quote: 'USD' },
  { pair: 'EUR/TRY', base: 'EUR', quote: 'TRY' },
  { pair: 'GBP/USD', base: 'GBP', quote: 'USD' },
  { pair: 'USD/JPY', base: 'USD', quote: 'JPY' },
];

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterdayDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  // Skip weekends (ECB doesn't publish rates on weekends)
  const day = date.getDay();
  if (day === 0) date.setDate(date.getDate() - 2); // Sunday -> Friday
  if (day === 6) date.setDate(date.getDate() - 1); // Saturday -> Friday
  return date.toISOString().split('T')[0];
}

/**
 * Fetch current and previous day rates to calculate change
 */
async function fetchRatesWithChange(base: string, quotes: string[]): Promise<{
  current: Record<string, number>;
  previous: Record<string, number>;
}> {
  const yesterday = getYesterdayDate();

  const [currentRes, previousRes] = await Promise.all([
    axios.get<FrankfurterResponse>(`${FRANKFURTER_URL}/latest`, {
      params: { from: base, to: quotes.join(',') },
    }),
    axios.get<FrankfurterResponse>(`${FRANKFURTER_URL}/${yesterday}`, {
      params: { from: base, to: quotes.join(',') },
    }),
  ]);

  return {
    current: currentRes.data.rates,
    previous: previousRes.data.rates,
  };
}

/**
 * Fetch common currency pairs with daily change
 */
export async function fetchCurrencyRates(): Promise<CurrencyRate[]> {
  const cacheKey = 'currency_rates_v2';

  // Try cache first
  const cached = await cache.get<CurrencyRate[]>(cacheKey);
  if (cached) {
    console.log('[Exchange] Using cached currency rates');
    return cached;
  }

  try {
    // Group pairs by base currency to minimize API calls
    const usdPairs = CURRENCY_PAIRS.filter(p => p.base === 'USD');
    const eurPairs = CURRENCY_PAIRS.filter(p => p.base === 'EUR');
    const gbpPairs = CURRENCY_PAIRS.filter(p => p.base === 'GBP');

    const [usdRates, eurRates, gbpRates] = await Promise.all([
      usdPairs.length > 0 ? fetchRatesWithChange('USD', usdPairs.map(p => p.quote)) : { current: {}, previous: {} },
      eurPairs.length > 0 ? fetchRatesWithChange('EUR', eurPairs.map(p => p.quote)) : { current: {}, previous: {} },
      gbpPairs.length > 0 ? fetchRatesWithChange('GBP', gbpPairs.map(p => p.quote)) : { current: {}, previous: {} },
    ]);

    const results: CurrencyRate[] = CURRENCY_PAIRS.map(({ pair, base, quote }) => {
      let rates: { current: Record<string, number>; previous: Record<string, number> };

      if (base === 'USD') rates = usdRates;
      else if (base === 'EUR') rates = eurRates;
      else if (base === 'GBP') rates = gbpRates;
      else rates = { current: {}, previous: {} };

      const currentRate = rates.current[quote] || 0;
      const previousRate = rates.previous[quote] || currentRate;

      const change = currentRate - previousRate;
      const changePercent = previousRate !== 0 ? (change / previousRate) * 100 : 0;

      return {
        pair,
        rate: currentRate,
        change,
        changesPercentage: changePercent,
      };
    });

    // Cache the results
    await cache.set(cacheKey, results, CACHE_DURATION);
    console.log('[Exchange] Currency rates fetched and cached');

    return results;
  } catch (error) {
    console.error('Failed to fetch currency rates:', error);
    throw new Error('Failed to fetch currency rates');
  }
}

/**
 * Fetch all exchange rates for a base currency (legacy)
 */
export async function fetchExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
  try {
    const response = await axios.get<FrankfurterResponse>(`${FRANKFURTER_URL}/latest`, {
      params: { from: baseCurrency },
    });
    return response.data.rates;
  } catch (error) {
    console.error('Frankfurter API error:', error);
    throw new Error('Failed to fetch exchange rates');
  }
}

/**
 * Fetch specific currency pair rate (legacy)
 */
export async function fetchPairRate(
  baseCurrency: string,
  targetCurrency: string
): Promise<number> {
  try {
    const response = await axios.get<FrankfurterResponse>(`${FRANKFURTER_URL}/latest`, {
      params: { from: baseCurrency, to: targetCurrency },
    });
    return response.data.rates[targetCurrency] || 0;
  } catch (error) {
    console.error(`Frankfurter API error for ${baseCurrency}/${targetCurrency}:`, error);
    throw new Error('Failed to fetch pair rate');
  }
}
