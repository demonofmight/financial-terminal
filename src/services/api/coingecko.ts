import axios from 'axios';
import type { CryptoData } from '../../types';

// Use Vite proxy to bypass CORS
const BASE_URL = '/api/coingecko/api/v3';

interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
}

interface CoinGeckoSearchResult {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  large: string;
}

/**
 * Fetch market data for specific cryptocurrencies
 */
export async function fetchCryptoMarketData(
  coinIds: string[] = ['bitcoin', 'ethereum', 'solana', 'ripple', 'binancecoin']
): Promise<CryptoData[]> {
  try {
    const response = await axios.get<CoinGeckoMarketData[]>(`${BASE_URL}/coins/markets`, {
      params: {
        vs_currency: 'usd',
        ids: coinIds.join(','),
        order: 'market_cap_desc',
        per_page: coinIds.length,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h',
      },
    });

    return response.data.map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      current_price: coin.current_price,
      price_change_24h: coin.price_change_24h,
      price_change_percentage_24h: coin.price_change_percentage_24h,
      market_cap: coin.market_cap,
      image: coin.image,
    }));
  } catch (error) {
    console.error('CoinGecko API error:', error);
    throw new Error('Failed to fetch crypto data');
  }
}

/**
 * Search for cryptocurrencies by name or symbol
 */
export async function searchCrypto(query: string): Promise<CoinGeckoSearchResult[]> {
  try {
    const response = await axios.get<{ coins: CoinGeckoSearchResult[] }>(
      `${BASE_URL}/search`,
      {
        params: { query },
      }
    );

    return response.data.coins.slice(0, 10);
  } catch (error) {
    console.error('CoinGecko search error:', error);
    throw new Error('Failed to search crypto');
  }
}

/**
 * Get list of top cryptocurrencies by market cap
 */
export async function fetchTopCryptos(limit: number = 100): Promise<CoinGeckoSearchResult[]> {
  try {
    const response = await axios.get<CoinGeckoMarketData[]>(`${BASE_URL}/coins/markets`, {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: limit,
        page: 1,
        sparkline: false,
      },
    });

    return response.data.map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      market_cap_rank: coin.market_cap_rank,
      thumb: coin.image,
      large: coin.image,
    }));
  } catch (error) {
    console.error('CoinGecko top cryptos error:', error);
    throw new Error('Failed to fetch top cryptos');
  }
}

/**
 * Get simple price for multiple coins (lightweight endpoint)
 */
export async function fetchSimplePrices(
  coinIds: string[]
): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  try {
    const response = await axios.get<Record<string, { usd: number; usd_24h_change: number }>>(
      `${BASE_URL}/simple/price`,
      {
        params: {
          ids: coinIds.join(','),
          vs_currencies: 'usd',
          include_24hr_change: true,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('CoinGecko simple price error:', error);
    throw new Error('Failed to fetch prices');
  }
}
