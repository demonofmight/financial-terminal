import axios from 'axios';

// Use Vite proxy to bypass CORS - Alternative.me Crypto Fear & Greed Index
const BASE_URL = '/api/feargreed/fng';

interface FearGreedApiResponse {
  name?: string;
  data?: Array<{
    value: string;
    value_classification: string;
    timestamp: string;
    time_until_update?: string;
  }>;
  metadata?: {
    error?: null | string;
  };
}

export interface FearGreedData {
  value: number;
  classification: string;
  timestamp: Date;
  historicalData: Array<{
    value: number;
    classification: string;
    date: Date;
  }>;
}

// Fallback mock data when API fails
const FALLBACK_DATA: FearGreedData = {
  value: 45,
  classification: 'Fear',
  timestamp: new Date(),
  historicalData: [
    { value: 45, classification: 'Fear', date: new Date() },
    { value: 42, classification: 'Fear', date: new Date(Date.now() - 86400000) },
    { value: 38, classification: 'Fear', date: new Date(Date.now() - 86400000 * 2) },
    { value: 52, classification: 'Neutral', date: new Date(Date.now() - 86400000 * 3) },
    { value: 55, classification: 'Neutral', date: new Date(Date.now() - 86400000 * 4) },
    { value: 48, classification: 'Fear', date: new Date(Date.now() - 86400000 * 5) },
    { value: 51, classification: 'Neutral', date: new Date(Date.now() - 86400000 * 6) },
  ],
};

/**
 * Fetch current Fear & Greed Index with historical data
 * This is the Crypto Fear & Greed Index from Alternative.me
 */
export async function fetchFearGreedIndex(limit: number = 7): Promise<FearGreedData> {
  try {
    const response = await axios.get<FearGreedApiResponse>(BASE_URL, {
      params: {
        limit: limit,
        format: 'json',
      },
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
      },
    });

    // Log response for debugging
    console.log('Fear & Greed API response:', response.data);

    // Check for error in metadata (if exists)
    if (response.data?.metadata?.error) {
      console.warn('Fear & Greed API returned error:', response.data.metadata.error);
      return FALLBACK_DATA;
    }

    const data = response.data?.data;

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('Fear & Greed API returned empty data, using fallback');
      return FALLBACK_DATA;
    }

    const current = data[0];

    return {
      value: parseInt(current.value, 10) || 50,
      classification: current.value_classification || 'Neutral',
      timestamp: new Date(parseInt(current.timestamp, 10) * 1000),
      historicalData: data.map((item) => ({
        value: parseInt(item.value, 10) || 50,
        classification: item.value_classification || 'Neutral',
        date: new Date(parseInt(item.timestamp, 10) * 1000),
      })),
    };
  } catch (error) {
    console.error('Fear & Greed API error:', error);
    // Return fallback data instead of throwing
    console.warn('Using fallback Fear & Greed data');
    return FALLBACK_DATA;
  }
}

/**
 * Get classification label based on value
 */
export function getClassificationFromValue(value: number): string {
  if (value <= 25) return 'Extreme Fear';
  if (value <= 45) return 'Fear';
  if (value <= 55) return 'Neutral';
  if (value <= 75) return 'Greed';
  return 'Extreme Greed';
}

/**
 * Get color based on Fear & Greed value
 */
export function getColorFromValue(value: number): string {
  if (value <= 25) return '#ff3366';
  if (value <= 45) return '#ff6b35';
  if (value <= 55) return '#ffb000';
  if (value <= 75) return '#7ed321';
  return '#00ff88';
}
