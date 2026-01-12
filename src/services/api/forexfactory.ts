import axios from 'axios';
import { db } from '../db';

// ForexFactory calendar JSON API (via proxy)
const BASE_URL = '/api/forexfactory';
const CACHE_KEY = 'economic_calendar';

/**
 * ForexFactory Economic Calendar Event
 */
export interface ForexFactoryEvent {
  title: string;
  country: string;  // USD, EUR, GBP, JPY, etc.
  date: string;     // ISO 8601 format with timezone
  impact: string;   // High, Medium, Low, Holiday
  forecast?: string;
  previous?: string;
}

interface CachedCalendarData {
  events: ForexFactoryEvent[];
  weekNumber: number;
  year: number;
  fetchedAt: string;
}

/**
 * Get ISO week number for a date
 */
function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

/**
 * Check if cached data is still valid (same week)
 */
function isCacheValid(cached: CachedCalendarData): boolean {
  const now = new Date();
  const current = getWeekNumber(now);
  return cached.weekNumber === current.week && cached.year === current.year;
}

/**
 * Get cached calendar data from IndexedDB
 */
async function getCachedCalendar(): Promise<CachedCalendarData | null> {
  try {
    const item = await db.cache.where('key').equals(CACHE_KEY).first();
    if (!item) return null;

    const cached = JSON.parse(item.data) as CachedCalendarData;

    if (isCacheValid(cached)) {
      console.log('[ForexFactory] Using cached data from', cached.fetchedAt);
      return cached;
    }

    // Cache is from a different week, delete it
    console.log('[ForexFactory] Cache expired (different week), will fetch fresh data');
    await db.cache.delete(item.id);
    return null;
  } catch (error) {
    console.error('[ForexFactory] Cache read error:', error);
    return null;
  }
}

/**
 * Save calendar data to IndexedDB cache
 */
async function setCachedCalendar(events: ForexFactoryEvent[]): Promise<void> {
  try {
    const now = new Date();
    const { week, year } = getWeekNumber(now);

    const cacheData: CachedCalendarData = {
      events,
      weekNumber: week,
      year,
      fetchedAt: now.toISOString(),
    };

    // Set cache to expire in 7 days (will be invalidated by week check anyway)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.cache.put({
      id: `cache_${CACHE_KEY}`,
      key: CACHE_KEY,
      data: JSON.stringify(cacheData),
      expiresAt,
      createdAt: now,
    });

    console.log('[ForexFactory] Cached', events.length, 'events for week', week);
  } catch (error) {
    console.error('[ForexFactory] Cache write error:', error);
  }
}

/**
 * Fetch economic calendar events from ForexFactory
 * Uses IndexedDB cache - only fetches once per week
 *
 * @param forceRefresh - If true, bypasses cache and fetches fresh data
 */
export async function fetchForexFactoryCalendar(forceRefresh = false): Promise<ForexFactoryEvent[]> {
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = await getCachedCalendar();
    if (cached) {
      return cached.events;
    }
  }

  // Fetch from API
  try {
    console.log('[ForexFactory] Fetching fresh data from API...');

    const response = await axios.get<ForexFactoryEvent[]>(
      `${BASE_URL}/ff_calendar_thisweek.json`,
      {
        timeout: 15000,
      }
    );

    if (response.data && Array.isArray(response.data)) {
      // Filter for USD events only (US economic data)
      // Exclude holidays
      const filtered = response.data
        .filter(event => event.country === 'USD')
        .filter(event => event.impact !== 'Holiday')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      console.log('[ForexFactory] Fetched', filtered.length, 'USD events');

      // Cache the results
      await setCachedCalendar(filtered);

      return filtered;
    }

    return [];
  } catch (error) {
    console.error('[ForexFactory] API fetch error:', error);

    // If API fails, try to return cached data even if from different week
    const cached = await getCachedCalendar();
    if (cached) {
      console.log('[ForexFactory] API failed, using stale cache');
      return cached.events;
    }

    throw new Error('Failed to fetch economic calendar');
  }
}

/**
 * Check if we have cached data (without fetching)
 */
export async function hasCalendarCache(): Promise<boolean> {
  const cached = await getCachedCalendar();
  return cached !== null;
}

/**
 * Clear the calendar cache
 */
export async function clearCalendarCache(): Promise<void> {
  await db.cache.where('key').equals(CACHE_KEY).delete();
  console.log('[ForexFactory] Cache cleared');
}
