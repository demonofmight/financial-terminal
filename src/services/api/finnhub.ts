import axios from 'axios';

const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const BASE_URL = '/api/finnhub';

// Cache for news data (5 minutes) - category-based
const newsCache: Record<string, { data: MarketNews[]; timestamp: number }> = {};
const NEWS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface MarketNews {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface CompanyNews {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

/**
 * Fetch general market news from Finnhub
 * Free tier: 60 calls/min
 */
export async function fetchMarketNews(category: 'general' | 'forex' | 'crypto' | 'merger' = 'general'): Promise<MarketNews[]> {
  // Check cache for this specific category
  const cachedData = newsCache[category];
  if (cachedData && Date.now() - cachedData.timestamp < NEWS_CACHE_DURATION) {
    console.log('[Finnhub] Returning cached news data for category:', category);
    return cachedData.data;
  }

  try {
    const response = await axios.get<MarketNews[]>(`${BASE_URL}/api/v1/news`, {
      params: {
        category,
        token: FINNHUB_API_KEY,
      },
      timeout: 10000,
    });

    if (response.data && Array.isArray(response.data)) {
      // Cache the result for this category
      newsCache[category] = {
        data: response.data,
        timestamp: Date.now(),
      };
      console.log('[Finnhub] Fetched', response.data.length, 'news articles for category:', category);
      return response.data;
    }

    return [];
  } catch (error) {
    console.error('[Finnhub] Error fetching market news:', error);

    // Return cached data for this category if available
    if (newsCache[category]) {
      console.log('[Finnhub] Returning stale cache due to error for category:', category);
      return newsCache[category].data;
    }

    return [];
  }
}

/**
 * Fetch company-specific news from Finnhub
 * @param symbol Stock symbol (e.g., 'AAPL', 'MSFT')
 * @param from Start date (YYYY-MM-DD)
 * @param to End date (YYYY-MM-DD)
 */
export async function fetchCompanyNews(
  symbol: string,
  from?: string,
  to?: string
): Promise<CompanyNews[]> {
  // Default to last 7 days if no dates provided
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const toDate = to || today.toISOString().split('T')[0];
  const fromDate = from || weekAgo.toISOString().split('T')[0];

  try {
    const response = await axios.get<CompanyNews[]>(`${BASE_URL}/api/v1/company-news`, {
      params: {
        symbol: symbol.toUpperCase(),
        from: fromDate,
        to: toDate,
        token: FINNHUB_API_KEY,
      },
      timeout: 10000,
    });

    if (response.data && Array.isArray(response.data)) {
      console.log('[Finnhub] Fetched', response.data.length, 'company news for', symbol);
      return response.data;
    }

    return [];
  } catch (error) {
    console.error('[Finnhub] Error fetching company news:', error);
    return [];
  }
}

/**
 * Format relative time for news display
 */
export function formatNewsTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000; // Convert to milliseconds

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * Get sentiment indicator based on keywords in headline
 * This is a simple heuristic, not AI-based
 */
export function getNewsSentiment(headline: string): 'positive' | 'negative' | 'neutral' {
  const lowerHeadline = headline.toLowerCase();

  const positiveKeywords = [
    'surge', 'soar', 'jump', 'gain', 'rise', 'rally', 'boost', 'high', 'record',
    'profit', 'growth', 'beat', 'outperform', 'upgrade', 'buy', 'bullish',
    'breakthrough', 'success', 'win', 'strong'
  ];

  const negativeKeywords = [
    'fall', 'drop', 'plunge', 'crash', 'decline', 'loss', 'down', 'low', 'miss',
    'cut', 'slash', 'warning', 'concern', 'fear', 'sell', 'bearish', 'weak',
    'layoff', 'bankruptcy', 'lawsuit', 'investigation', 'scandal'
  ];

  let positiveScore = 0;
  let negativeScore = 0;

  for (const keyword of positiveKeywords) {
    if (lowerHeadline.includes(keyword)) positiveScore++;
  }

  for (const keyword of negativeKeywords) {
    if (lowerHeadline.includes(keyword)) negativeScore++;
  }

  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
}

/**
 * Get category color for news display
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    general: 'text-neon-cyan',
    forex: 'text-neon-amber',
    crypto: 'text-neon-green',
    merger: 'text-purple-400',
    company: 'text-blue-400',
  };
  return colors[category.toLowerCase()] || 'text-gray-400';
}
