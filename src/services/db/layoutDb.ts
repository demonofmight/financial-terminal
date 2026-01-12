/**
 * IndexedDB service for persisting user layout preferences
 * Simple widget order storage
 */

const DB_NAME = 'finterm_db';
const DB_VERSION = 1;
const STORE_NAME = 'user_preferences';
const LAYOUT_KEY = 'widget_layout';

interface LayoutData {
  key: string;
  widgetOrder: string[];
  updatedAt: number;
}

let db: IDBDatabase | null = null;

/**
 * Initialize the IndexedDB database
 */
async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[LayoutDB] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
        console.log('[LayoutDB] Created object store:', STORE_NAME);
      }
    };
  });
}

/**
 * Save widget order to IndexedDB
 */
export async function saveWidgetOrder(widgetOrder: string[]): Promise<void> {
  try {
    const database = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const data: LayoutData = {
        key: LAYOUT_KEY,
        widgetOrder,
        updatedAt: Date.now(),
      };

      const request = store.put(data);

      request.onsuccess = () => {
        console.log('[LayoutDB] Widget order saved:', widgetOrder.length, 'widgets');
        resolve();
      };

      request.onerror = () => {
        console.error('[LayoutDB] Failed to save widget order:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[LayoutDB] Error saving widget order:', error);
    throw error;
  }
}

/**
 * Load widget order from IndexedDB
 */
export async function loadWidgetOrder(): Promise<string[] | null> {
  try {
    const database = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.get(LAYOUT_KEY);

      request.onsuccess = () => {
        const result = request.result as LayoutData | undefined;

        if (result && result.widgetOrder) {
          console.log('[LayoutDB] Widget order loaded:', result.widgetOrder.length, 'widgets');
          resolve(result.widgetOrder);
        } else {
          console.log('[LayoutDB] No saved widget order found');
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[LayoutDB] Failed to load widget order:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[LayoutDB] Error loading widget order:', error);
    return null;
  }
}

/**
 * Clear saved widget order
 */
export async function clearWidgetOrder(): Promise<void> {
  try {
    const database = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.delete(LAYOUT_KEY);

      request.onsuccess = () => {
        console.log('[LayoutDB] Widget order cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('[LayoutDB] Failed to clear widget order:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[LayoutDB] Error clearing widget order:', error);
    throw error;
  }
}
