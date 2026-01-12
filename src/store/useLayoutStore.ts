import { create } from 'zustand';
import { saveWidgetOrder, loadWidgetOrder } from '../services/db/layoutDb';

// All widget IDs
export const ALL_WIDGET_IDS = [
  'sector-heatmap',
  'market-sentiment',
  'global-markets',
  'economic-calendar',
  'sp500-movers',
  'treasury-yields',
  'precious-metals',
  'crypto-tracker',
  'currency-rates',
  'bist-overview',
  'commodities',
];

// Default widget order
export const DEFAULT_WIDGET_ORDER = [...ALL_WIDGET_IDS];

// Widget metadata for display
export const WIDGET_INFO: Record<string, { title: string; titleTr: string }> = {
  'sector-heatmap': { title: 'US Sector Performance', titleTr: 'ABD Sektör Performansı' },
  'market-sentiment': { title: 'Market Sentiment', titleTr: 'Piyasa Duyarlılığı' },
  'global-markets': { title: 'Global Markets', titleTr: 'Dünya Borsaları' },
  'economic-calendar': { title: 'Economic Calendar', titleTr: 'Ekonomik Takvim' },
  'sp500-movers': { title: 'S&P 500 Top Movers', titleTr: 'S&P 500 En Çok Değişenler' },
  'treasury-yields': { title: 'Treasury Yields', titleTr: 'Hazine Faizleri' },
  'precious-metals': { title: 'Precious Metals', titleTr: 'Değerli Metaller' },
  'crypto-tracker': { title: 'Crypto Tracker', titleTr: 'Kripto Takip' },
  'currency-rates': { title: 'Currency Rates', titleTr: 'Döviz Kurları' },
  'bist-overview': { title: 'BIST Overview', titleTr: 'BIST Özeti' },
  'commodities': { title: 'Commodities', titleTr: 'Emtialar' },
};

interface LayoutState {
  // Widget order
  widgetOrder: string[];

  // Edit mode
  isEditMode: boolean;

  // Drag state
  isDragging: boolean;
  draggedWidget: string | null;

  // Loading state
  isInitialized: boolean;

  // Actions
  swapWidgets: (fromId: string, toId: string) => void;
  resetToDefault: () => void;

  // Drag actions
  setDragging: (isDragging: boolean, widgetId?: string | null) => void;
  setEditMode: (enabled: boolean) => void;
  toggleEditMode: () => void;

  // Persistence
  loadLayout: () => Promise<void>;
  saveLayout: () => Promise<void>;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  widgetOrder: DEFAULT_WIDGET_ORDER,
  isEditMode: false,
  isDragging: false,
  draggedWidget: null,
  isInitialized: false,

  swapWidgets: (fromId, toId) => {
    const { widgetOrder } = get();
    const fromIndex = widgetOrder.indexOf(fromId);
    const toIndex = widgetOrder.indexOf(toId);

    if (fromIndex === -1 || toIndex === -1) return;

    const newOrder = [...widgetOrder];
    // Swap positions
    [newOrder[fromIndex], newOrder[toIndex]] = [newOrder[toIndex], newOrder[fromIndex]];

    set({ widgetOrder: newOrder });
    get().saveLayout();
  },

  resetToDefault: () => {
    set({ widgetOrder: [...DEFAULT_WIDGET_ORDER] });
    get().saveLayout();
  },

  setDragging: (isDragging, widgetId = null) => {
    set({ isDragging, draggedWidget: widgetId });
  },

  setEditMode: (enabled) => {
    set({ isEditMode: enabled });
  },

  toggleEditMode: () => {
    set((state) => ({ isEditMode: !state.isEditMode }));
  },

  loadLayout: async () => {
    try {
      const savedOrder = await loadWidgetOrder();
      if (savedOrder && savedOrder.length > 0) {
        // Validate saved order has all widgets
        const savedSet = new Set(savedOrder);
        const validOrder = savedOrder.filter(id => ALL_WIDGET_IDS.includes(id));

        // Add any missing widgets at the end
        const missingWidgets = ALL_WIDGET_IDS.filter(id => !savedSet.has(id));
        const finalOrder = [...validOrder, ...missingWidgets];

        set({ widgetOrder: finalOrder, isInitialized: true });
      } else {
        set({ isInitialized: true });
      }
    } catch (error) {
      console.error('[LayoutStore] Failed to load layout:', error);
      set({ isInitialized: true });
    }
  },

  saveLayout: async () => {
    try {
      const { widgetOrder } = get();
      await saveWidgetOrder(widgetOrder);
    } catch (error) {
      console.error('[LayoutStore] Failed to save layout:', error);
    }
  },
}));
