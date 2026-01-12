import axios from 'axios';
import type { CryptoData } from '../../types';
import { cache } from '../db';

// CoinLore API - Free, no API key, no rate limit
const BASE_URL = '/api/coinlore';

// Cache duration in minutes
const CACHE_DURATION = 2;
const LIST_CACHE_DURATION = 30;

// CoinLore API response types
interface CoinLoreTicker {
  id: string;
  symbol: string;
  name: string;
  nameid: string;
  rank: number;
  price_usd: string;
  percent_change_24h: string;
  percent_change_1h: string;
  percent_change_7d: string;
  market_cap_usd: string;
  volume24: string;
  volume24a: string;
  csupply: string;
  tsupply: string;
  msupply: string;
}

interface CoinLoreTickersResponse {
  data: CoinLoreTicker[];
  info: {
    coins_num: number;
    time: number;
  };
}

// Crypto icon URL (using CoinGecko's CDN as CoinLore doesn't provide icons)
function getCryptoIcon(symbol: string): string {
  const symbolLower = symbol.toLowerCase();
  // Use a reliable icon service
  return `https://assets.coincap.io/assets/icons/${symbolLower}@2x.png`;
}

/**
 * Fetch market data for specific cryptocurrencies by their CoinLore IDs
 */
export async function fetchCryptoMarketData(coinIds: string[]): Promise<CryptoData[]> {
  if (coinIds.length === 0) return [];

  const cacheKey = `coinlore_market_${coinIds.sort().join(',')}`;

  // Try cache first
  const cached = await cache.get<CryptoData[]>(cacheKey);
  if (cached) {
    console.log('[CoinLore] Using cached data');
    return cached;
  }

  try {
    // CoinLore uses numeric IDs, so we pass them directly
    const response = await axios.get<CoinLoreTicker[]>(`${BASE_URL}/api/ticker/`, {
      params: {
        id: coinIds.join(','),
      },
    });

    // Sort by the original order
    const dataMap = new Map(response.data.map((coin) => [coin.id, coin]));

    const data = coinIds
      .map((id) => {
        const coin = dataMap.get(id);
        if (!coin) return null;

        const price = parseFloat(coin.price_usd) || 0;
        const change24h = parseFloat(coin.percent_change_24h) || 0;

        return {
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          current_price: price,
          price_change_24h: (price * change24h) / 100,
          price_change_percentage_24h: change24h,
          market_cap: parseFloat(coin.market_cap_usd) || 0,
          image: getCryptoIcon(coin.symbol),
        };
      })
      .filter((item): item is CryptoData => item !== null);

    // Cache the result
    await cache.set(cacheKey, data, CACHE_DURATION);
    console.log('[CoinLore] Data fetched and cached');

    return data;
  } catch (error) {
    console.error('CoinLore API error:', error);
    throw new Error('Failed to fetch crypto data');
  }
}

/**
 * Get all available cryptocurrencies for search
 * Fetches top 500 by market cap
 */
export async function fetchAllCryptos(): Promise<Array<{
  id: string;
  name: string;
  symbol: string;
  rank: number;
}>> {
  const cacheKey = 'coinlore_all_list';

  // Try cache first
  const cached = await cache.get<Array<{
    id: string;
    name: string;
    symbol: string;
    rank: number;
  }>>(cacheKey);

  if (cached) {
    console.log('[CoinLore] Using cached crypto list');
    return cached;
  }

  try {
    // Fetch multiple pages to get more cryptos
    const allCoins: CoinLoreTicker[] = [];

    // Fetch first 500 cryptos (5 pages of 100)
    for (let start = 0; start < 500; start += 100) {
      const response = await axios.get<CoinLoreTickersResponse>(`${BASE_URL}/api/tickers/`, {
        params: {
          start,
          limit: 100,
        },
      });

      if (response.data.data) {
        allCoins.push(...response.data.data);
      }

      // Small delay between requests to be nice to the API
      if (start < 400) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const data = allCoins.map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      rank: coin.rank,
    }));

    // Cache for 30 minutes
    await cache.set(cacheKey, data, LIST_CACHE_DURATION);
    console.log('[CoinLore] Fetched', data.length, 'cryptos');

    return data;
  } catch (error) {
    console.error('CoinLore all cryptos error:', error);
    throw new Error('Failed to fetch crypto list');
  }
}

/**
 * Get top cryptocurrencies (for quick list)
 */
export async function fetchTopCryptos(limit: number = 100): Promise<Array<{
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  large: string;
}>> {
  const cacheKey = `coinlore_top_${limit}`;

  const cached = await cache.get<Array<{
    id: string;
    name: string;
    symbol: string;
    market_cap_rank: number;
    thumb: string;
    large: string;
  }>>(cacheKey);

  if (cached) {
    console.log('[CoinLore] Using cached top cryptos');
    return cached;
  }

  try {
    const response = await axios.get<CoinLoreTickersResponse>(`${BASE_URL}/api/tickers/`, {
      params: {
        start: 0,
        limit: Math.min(limit, 100),
      },
    });

    const data = response.data.data.map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      market_cap_rank: coin.rank,
      thumb: getCryptoIcon(coin.symbol),
      large: getCryptoIcon(coin.symbol),
    }));

    // Cache for 10 minutes
    await cache.set(cacheKey, data, 10);

    return data;
  } catch (error) {
    console.error('CoinLore top cryptos error:', error);
    throw new Error('Failed to fetch top cryptos');
  }
}
