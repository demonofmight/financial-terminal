import Dexie, { type EntityTable } from 'dexie';

// User preferences entity
interface UserPreference {
  id: string;
  value: string;
  updatedAt: Date;
}

// Crypto watchlist entity
interface CryptoWatchlistItem {
  id: string;
  cryptoId: string;
  order: number;
  addedAt: Date;
}

// Cache entity for API responses
interface CachedData {
  id: string;
  key: string;
  data: string; // JSON stringified
  expiresAt: Date;
  createdAt: Date;
}

// Create database class
class FinTermDatabase extends Dexie {
  preferences!: EntityTable<UserPreference, 'id'>;
  cryptoWatchlist!: EntityTable<CryptoWatchlistItem, 'id'>;
  cache!: EntityTable<CachedData, 'id'>;

  constructor() {
    super('FinTermDB');

    this.version(1).stores({
      preferences: 'id, updatedAt',
      cryptoWatchlist: 'id, cryptoId, order, addedAt',
      cache: 'id, key, expiresAt',
    });
  }
}

// Create singleton instance
export const db = new FinTermDatabase();

// Preference keys
export const PREF_KEYS = {
  SELECTED_CRYPTOS: 'selected_cryptos',
  REFRESH_INTERVAL: 'refresh_interval',
  THEME: 'theme',
} as const;

// Default crypto IDs (using CoinLore numeric IDs)
// Bitcoin: 90, Ethereum: 80, XRP: 58, BNB: 2710, Solana: 48543
const DEFAULT_CRYPTOS = ['90', '80', '58', '2710', '48543'];

// Preference helpers
export const preferences = {
  async get(key: string): Promise<string | null> {
    const pref = await db.preferences.get(key);
    return pref?.value ?? null;
  },

  async set(key: string, value: string): Promise<void> {
    await db.preferences.put({
      id: key,
      value,
      updatedAt: new Date(),
    });
  },

  async delete(key: string): Promise<void> {
    await db.preferences.delete(key);
  },
};

// Crypto watchlist helpers
export const cryptoWatchlist = {
  async getAll(): Promise<string[]> {
    const items = await db.cryptoWatchlist.orderBy('order').toArray();
    if (items.length === 0) {
      // Initialize with defaults
      await this.setAll(DEFAULT_CRYPTOS);
      return DEFAULT_CRYPTOS;
    }
    return items.map((item) => item.cryptoId);
  },

  async setAll(cryptoIds: string[]): Promise<void> {
    await db.cryptoWatchlist.clear();
    const items: CryptoWatchlistItem[] = cryptoIds.map((cryptoId, index) => ({
      id: `crypto_${cryptoId}`,
      cryptoId,
      order: index,
      addedAt: new Date(),
    }));
    await db.cryptoWatchlist.bulkPut(items);
  },

  async add(cryptoId: string): Promise<void> {
    const existing = await db.cryptoWatchlist.where('cryptoId').equals(cryptoId).first();
    if (existing) return;

    const count = await db.cryptoWatchlist.count();
    await db.cryptoWatchlist.put({
      id: `crypto_${cryptoId}`,
      cryptoId,
      order: count,
      addedAt: new Date(),
    });
  },

  async remove(cryptoId: string): Promise<void> {
    await db.cryptoWatchlist.where('cryptoId').equals(cryptoId).delete();
    // Re-order remaining items
    const items = await db.cryptoWatchlist.orderBy('order').toArray();
    const updates = items.map((item, index) => ({
      ...item,
      order: index,
    }));
    await db.cryptoWatchlist.bulkPut(updates);
  },

  async reorder(cryptoIds: string[]): Promise<void> {
    await this.setAll(cryptoIds);
  },
};

// Cache helpers (for API responses)
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const item = await db.cache.where('key').equals(key).first();
    if (!item) return null;

    // Check if expired
    if (new Date() > item.expiresAt) {
      await db.cache.delete(item.id);
      return null;
    }

    try {
      return JSON.parse(item.data) as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, data: T, ttlMinutes: number = 5): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

    await db.cache.put({
      id: `cache_${key}`,
      key,
      data: JSON.stringify(data),
      expiresAt,
      createdAt: new Date(),
    });
  },

  async delete(key: string): Promise<void> {
    await db.cache.where('key').equals(key).delete();
  },

  async clear(): Promise<void> {
    await db.cache.clear();
  },

  async clearExpired(): Promise<void> {
    const now = new Date();
    await db.cache.where('expiresAt').below(now).delete();
  },
};

// Initialize database and load preferences into store
export async function initializeDatabase(): Promise<{
  selectedCryptos: string[];
}> {
  try {
    // Clear expired cache on startup
    await cache.clearExpired();

    // Load crypto watchlist
    const selectedCryptos = await cryptoWatchlist.getAll();

    return {
      selectedCryptos,
    };
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return {
      selectedCryptos: DEFAULT_CRYPTOS,
    };
  }
}
