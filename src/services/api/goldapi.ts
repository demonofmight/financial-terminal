import axios from 'axios';
import type { MetalPrice } from '../../types';

// Use Vite proxy to bypass CORS
const BASE_URL = '/api/gold/api';
const API_KEY = import.meta.env.VITE_GOLD_API_KEY;

interface GoldApiResponse {
  timestamp: number;
  metal: string;
  currency: string;
  exchange: string;
  symbol: string;
  prev_close_price: number;
  open_price: number;
  low_price: number;
  high_price: number;
  open_time: number;
  price: number;
  ch: number;
  chp: number;
  ask: number;
  bid: number;
  price_gram_24k: number;
  price_gram_22k: number;
  price_gram_21k: number;
  price_gram_20k: number;
  price_gram_18k: number;
  price_gram_16k: number;
  price_gram_14k: number;
  price_gram_10k: number;
}

const METAL_NAMES: Record<string, string> = {
  XAU: 'Gold',
  XAG: 'Silver',
  XPT: 'Platinum',
  XPD: 'Palladium',
};

/**
 * Fetch price for a single metal
 */
export async function fetchMetalPrice(
  metal: 'XAU' | 'XAG' | 'XPT' | 'XPD',
  currency: string = 'USD'
): Promise<MetalPrice> {
  try {
    const response = await axios.get<GoldApiResponse>(
      `${BASE_URL}/${metal}/${currency}`,
      {
        headers: {
          'x-access-token': API_KEY,
        },
      }
    );

    const data = response.data;

    return {
      symbol: metal,
      name: METAL_NAMES[metal] || metal,
      price: data.price,
      change: data.ch,
      changesPercentage: data.chp,
      currency: currency,
    };
  } catch (error) {
    console.error(`Gold API error for ${metal}:`, error);
    throw new Error(`Failed to fetch ${metal} price`);
  }
}

/**
 * Fetch prices for all precious metals
 */
export async function fetchAllMetalPrices(currency: string = 'USD'): Promise<MetalPrice[]> {
  const metals: Array<'XAU' | 'XAG' | 'XPT' | 'XPD'> = ['XAU', 'XAG', 'XPT', 'XPD'];

  // Fetch all metals in parallel
  const results = await Promise.allSettled(
    metals.map((metal) => fetchMetalPrice(metal, currency))
  );

  return results
    .filter((result): result is PromiseFulfilledResult<MetalPrice> => result.status === 'fulfilled')
    .map((result) => result.value);
}

/**
 * Fetch gold price with gram breakdown
 */
export async function fetchGoldWithGrams(currency: string = 'USD'): Promise<{
  price: number;
  change: number;
  changePercent: number;
  grams: {
    '24k': number;
    '22k': number;
    '21k': number;
    '18k': number;
    '14k': number;
  };
}> {
  try {
    const response = await axios.get<GoldApiResponse>(
      `${BASE_URL}/XAU/${currency}`,
      {
        headers: {
          'x-access-token': API_KEY,
        },
      }
    );

    const data = response.data;

    return {
      price: data.price,
      change: data.ch,
      changePercent: data.chp,
      grams: {
        '24k': data.price_gram_24k,
        '22k': data.price_gram_22k,
        '21k': data.price_gram_21k,
        '18k': data.price_gram_18k,
        '14k': data.price_gram_14k,
      },
    };
  } catch (error) {
    console.error('Gold API error:', error);
    throw new Error('Failed to fetch gold price');
  }
}
