import axios from 'axios';
import type { CurrencyRate } from '../../types';

// Use Vite proxy to bypass CORS
const BASE_URL = '/api/exchange/v6';
const API_KEY = import.meta.env.VITE_EXCHANGE_API_KEY;

interface ExchangeRateResponse {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: Record<string, number>;
}

interface PairConversionResponse {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  target_code: string;
  conversion_rate: number;
}

// Store previous rates for calculating change
let previousRates: Record<string, number> = {};

/**
 * Fetch all exchange rates for a base currency
 */
export async function fetchExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
  try {
    const response = await axios.get<ExchangeRateResponse>(
      `${BASE_URL}/${API_KEY}/latest/${baseCurrency}`
    );

    if (response.data.result !== 'success') {
      throw new Error('Failed to fetch exchange rates');
    }

    return response.data.conversion_rates;
  } catch (error) {
    console.error('Exchange Rate API error:', error);
    throw new Error('Failed to fetch exchange rates');
  }
}

/**
 * Fetch specific currency pair rate
 */
export async function fetchPairRate(
  baseCurrency: string,
  targetCurrency: string
): Promise<number> {
  try {
    const response = await axios.get<PairConversionResponse>(
      `${BASE_URL}/${API_KEY}/pair/${baseCurrency}/${targetCurrency}`
    );

    if (response.data.result !== 'success') {
      throw new Error('Failed to fetch pair rate');
    }

    return response.data.conversion_rate;
  } catch (error) {
    console.error(`Exchange Rate API error for ${baseCurrency}/${targetCurrency}:`, error);
    throw new Error('Failed to fetch pair rate');
  }
}

/**
 * Fetch common currency pairs with change calculation
 */
export async function fetchCurrencyRates(): Promise<CurrencyRate[]> {
  try {
    // Fetch USD-based rates
    const usdRates = await fetchExchangeRates('USD');
    // Fetch EUR-based rates for EUR pairs
    const eurRates = await fetchExchangeRates('EUR');

    const pairs: Array<{ pair: string; rate: number }> = [
      { pair: 'USD/TRY', rate: usdRates.TRY },
      { pair: 'EUR/USD', rate: 1 / usdRates.EUR },
      { pair: 'EUR/TRY', rate: eurRates.TRY },
      { pair: 'GBP/USD', rate: 1 / usdRates.GBP },
      { pair: 'USD/JPY', rate: usdRates.JPY },
    ];

    // Calculate changes based on previous rates
    const result: CurrencyRate[] = pairs.map(({ pair, rate }) => {
      const prevRate = previousRates[pair] || rate;
      const change = rate - prevRate;
      const changePercent = prevRate !== 0 ? (change / prevRate) * 100 : 0;

      return {
        pair,
        rate,
        change,
        changesPercentage: changePercent,
      };
    });

    // Store current rates for next comparison
    pairs.forEach(({ pair, rate }) => {
      previousRates[pair] = rate;
    });

    return result;
  } catch (error) {
    console.error('Failed to fetch currency rates:', error);
    throw new Error('Failed to fetch currency rates');
  }
}

/**
 * Get supported currencies
 */
export async function fetchSupportedCurrencies(): Promise<string[]> {
  try {
    const rates = await fetchExchangeRates('USD');
    return Object.keys(rates);
  } catch (error) {
    console.error('Failed to fetch supported currencies:', error);
    return [];
  }
}
