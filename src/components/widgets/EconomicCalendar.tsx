import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../ui/Card';
import { IoCalendar, IoAlertCircle, IoTime, IoRefresh, IoInformationCircle } from 'react-icons/io5';
import { useLanguage } from '../../i18n';
import { fetchForexFactoryCalendar, type ForexFactoryEvent } from '../../services/api/forexfactory';
import { useRefresh } from '../../contexts/RefreshContext';
import { useLoading, DATA_SOURCE_IDS } from '../../contexts/LoadingContext';

interface ProcessedEvent {
  id: string;
  date: string;
  time: string;
  dayName: string;
  event: string;
  eventTr: string;
  country: string;
  impact: 'high' | 'medium' | 'low';
  forecast?: string;
  previous?: string;
  actual?: string;
  description: string;
  descriptionTr: string;
  // New fields for local time display
  fullDate: Date;
  localDate: string;
  localTime: string;
  timeUntil: number; // milliseconds until event
  isPast: boolean;
}

// Event descriptions for tooltips (English and Turkish)
const eventData: Record<string, { en: string; tr: string; nameTr: string }> = {
  // Employment
  'Non-Farm Payrolls': {
    en: 'Monthly change in employment excluding farm workers. Key indicator of economic health and labor market strength.',
    tr: 'Tarım dışı istihdamdaki aylık değişim. Ekonomik sağlık ve işgücü piyasası gücünün temel göstergesi.',
    nameTr: 'Tarım Dışı İstihdam',
  },
  'Nonfarm Payrolls': {
    en: 'Monthly change in employment excluding farm workers. Key indicator of economic health and labor market strength.',
    tr: 'Tarım dışı istihdamdaki aylık değişim. Ekonomik sağlık ve işgücü piyasası gücünün temel göstergesi.',
    nameTr: 'Tarım Dışı İstihdam',
  },
  'Unemployment Rate': {
    en: 'Percentage of total workforce that is unemployed and actively seeking employment.',
    tr: 'Aktif iş arayan işsizlerin toplam işgücüne oranı.',
    nameTr: 'İşsizlik Oranı',
  },
  'Initial Jobless Claims': {
    en: 'Weekly number of new unemployment insurance claims. Early indicator of labor market conditions.',
    tr: 'Haftalık yeni işsizlik sigortası başvuru sayısı. İşgücü piyasası koşullarının erken göstergesi.',
    nameTr: 'Haftalık İşsizlik Başvuruları',
  },
  'Continuing Jobless Claims': {
    en: 'Number of people receiving unemployment benefits. Shows ongoing labor market stress.',
    tr: 'İşsizlik maaşı alan kişi sayısı. Devam eden işgücü piyasası stresini gösterir.',
    nameTr: 'Devam Eden İşsizlik Başvuruları',
  },
  'JOLTS Job Openings': {
    en: 'Job Openings and Labor Turnover Survey. Shows demand for labor in the economy.',
    tr: 'İş Açıkları ve İşgücü Devir Anketi. Ekonomideki işgücü talebini gösterir.',
    nameTr: 'JOLTS İş Açıkları',
  },
  'ADP Employment Change': {
    en: 'Private sector employment change estimate. Early preview of official jobs report.',
    tr: 'Özel sektör istihdam değişikliği tahmini. Resmi istihdam raporunun erken önizlemesi.',
    nameTr: 'ADP İstihdam Değişimi',
  },

  // Inflation
  'CPI': {
    en: 'Consumer Price Index measures changes in prices paid by consumers. Key inflation gauge.',
    tr: 'Tüketici Fiyat Endeksi, tüketicilerin ödediği fiyatlardaki değişiklikleri ölçer. Temel enflasyon göstergesi.',
    nameTr: 'TÜFE',
  },
  'Core CPI': {
    en: 'CPI excluding volatile food and energy prices. Shows underlying inflation trend.',
    tr: 'Değişken gıda ve enerji fiyatları hariç TÜFE. Temel enflasyon eğilimini gösterir.',
    nameTr: 'Çekirdek TÜFE',
  },
  'PPI': {
    en: 'Producer Price Index measures wholesale price changes. Leading indicator of consumer inflation.',
    tr: 'Üretici Fiyat Endeksi toptan satış fiyat değişikliklerini ölçer. Tüketici enflasyonunun öncü göstergesi.',
    nameTr: 'ÜFE',
  },
  'Core PPI': {
    en: 'PPI excluding food and energy. Shows underlying producer inflation.',
    tr: 'Gıda ve enerji hariç ÜFE. Temel üretici enflasyonunu gösterir.',
    nameTr: 'Çekirdek ÜFE',
  },
  'PCE Price Index': {
    en: 'Personal Consumption Expenditures price index. Fed\'s preferred inflation measure.',
    tr: 'Kişisel Tüketim Harcamaları fiyat endeksi. Fed\'in tercih ettiği enflasyon ölçüsü.',
    nameTr: 'PCE Fiyat Endeksi',
  },
  'Core PCE Price Index': {
    en: 'PCE excluding food and energy. Key Fed policy indicator.',
    tr: 'Gıda ve enerji hariç PCE. Temel Fed politika göstergesi.',
    nameTr: 'Çekirdek PCE',
  },

  // GDP & Growth
  'GDP Growth Rate': {
    en: 'Quarterly change in total economic output. Broadest measure of economic activity.',
    tr: 'Toplam ekonomik çıktıdaki üç aylık değişim. En kapsamlı ekonomik aktivite ölçüsü.',
    nameTr: 'GSYİH Büyüme Oranı',
  },
  'GDP': {
    en: 'Gross Domestic Product. Total value of goods and services produced.',
    tr: 'Gayri Safi Yurtiçi Hasıla. Üretilen mal ve hizmetlerin toplam değeri.',
    nameTr: 'GSYİH',
  },

  // Manufacturing & Services
  'ISM Manufacturing PMI': {
    en: 'Purchasing Managers Index for manufacturing. Above 50 indicates expansion.',
    tr: 'İmalat sektörü Satın Alma Yöneticileri Endeksi. 50 üzeri genişlemeyi gösterir.',
    nameTr: 'ISM İmalat PMI',
  },
  'ISM Services PMI': {
    en: 'Purchasing Managers Index for services sector. Covers ~80% of economy.',
    tr: 'Hizmet sektörü Satın Alma Yöneticileri Endeksi. Ekonominin ~%80\'ini kapsar.',
    nameTr: 'ISM Hizmet PMI',
  },
  'Industrial Production': {
    en: 'Output of factories, mines, and utilities. Real-time economic activity gauge.',
    tr: 'Fabrikalar, madenler ve kamu hizmetlerinin üretimi. Gerçek zamanlı ekonomik aktivite göstergesi.',
    nameTr: 'Sanayi Üretimi',
  },
  'Durable Goods Orders': {
    en: 'New orders for long-lasting manufactured goods. Investment spending indicator.',
    tr: 'Dayanıklı mamul mallara yeni siparişler. Yatırım harcaması göstergesi.',
    nameTr: 'Dayanıklı Mal Siparişleri',
  },

  // Housing
  'Building Permits': {
    en: 'Authorized new housing units. Leading indicator of construction activity.',
    tr: 'Onaylanan yeni konut birimleri. İnşaat faaliyetinin öncü göstergesi.',
    nameTr: 'İnşaat İzinleri',
  },
  'Housing Starts': {
    en: 'New residential construction begun. Economic activity indicator.',
    tr: 'Başlayan yeni konut inşaatları. Ekonomik aktivite göstergesi.',
    nameTr: 'Konut Başlangıçları',
  },
  'Existing Home Sales': {
    en: 'Completed sales of previously owned homes. Housing market health.',
    tr: 'Mevcut konut satışları. Konut piyasası sağlığı göstergesi.',
    nameTr: 'Mevcut Konut Satışları',
  },
  'New Home Sales': {
    en: 'Sales of newly constructed homes. Housing demand indicator.',
    tr: 'Yeni inşa edilmiş konut satışları. Konut talebi göstergesi.',
    nameTr: 'Yeni Konut Satışları',
  },

  // Consumer
  'Retail Sales': {
    en: 'Total receipts of retail stores. Consumer spending indicator.',
    tr: 'Perakende mağazaların toplam gelirleri. Tüketici harcama göstergesi.',
    nameTr: 'Perakende Satışlar',
  },
  'Consumer Confidence': {
    en: 'Survey of consumer optimism about economy. Spending intentions indicator.',
    tr: 'Tüketicilerin ekonomiye bakış anketi. Harcama niyeti göstergesi.',
    nameTr: 'Tüketici Güveni',
  },
  'Consumer Sentiment': {
    en: 'University of Michigan survey. Tracks consumer attitudes.',
    tr: 'Michigan Üniversitesi anketi. Tüketici tutumlarını takip eder.',
    nameTr: 'Tüketici Duyarlılığı',
  },
  'Personal Income': {
    en: 'Income received by individuals. Consumer spending capacity.',
    tr: 'Bireylerin aldığı gelir. Tüketici harcama kapasitesi.',
    nameTr: 'Kişisel Gelir',
  },
  'Personal Spending': {
    en: 'Consumer expenditures. Drives ~70% of US GDP.',
    tr: 'Tüketici harcamaları. ABD GSYİH\'sının ~%70\'ini oluşturur.',
    nameTr: 'Kişisel Harcama',
  },

  // Fed & Central Bank
  'FOMC Meeting Minutes': {
    en: 'Detailed record of Fed policy discussions. Reveals policy direction.',
    tr: 'Fed politika tartışmalarının detaylı kaydı. Politika yönünü ortaya koyar.',
    nameTr: 'FOMC Toplantı Tutanakları',
  },
  'FOMC Rate Decision': {
    en: 'Federal Reserve interest rate decision. Key monetary policy action.',
    tr: 'Federal Rezerv faiz kararı. Temel para politikası eylemi.',
    nameTr: 'FOMC Faiz Kararı',
  },
  'Fed Interest Rate Decision': {
    en: 'Federal Reserve benchmark rate. Affects borrowing costs economy-wide.',
    tr: 'Federal Rezerv referans faizi. Ekonomi genelinde borçlanma maliyetlerini etkiler.',
    nameTr: 'Fed Faiz Kararı',
  },
  'ECB Rate Decision': {
    en: 'European Central Bank interest rate. Eurozone monetary policy.',
    tr: 'Avrupa Merkez Bankası faiz oranı. Euro bölgesi para politikası.',
    nameTr: 'AMB Faiz Kararı',
  },
  'BOJ Rate Decision': {
    en: 'Bank of Japan interest rate. Japanese monetary policy.',
    tr: 'Japonya Merkez Bankası faiz oranı. Japon para politikası.',
    nameTr: 'BOJ Faiz Kararı',
  },
  'BOE Rate Decision': {
    en: 'Bank of England interest rate. UK monetary policy.',
    tr: 'İngiltere Merkez Bankası faiz oranı. İngiltere para politikası.',
    nameTr: 'BOE Faiz Kararı',
  },

  // Trade
  'Trade Balance': {
    en: 'Difference between exports and imports. International competitiveness.',
    tr: 'İhracat ve ithalat arasındaki fark. Uluslararası rekabet gücü.',
    nameTr: 'Dış Ticaret Dengesi',
  },

  // Other
  'Beige Book': {
    en: 'Fed regional economic survey. Anecdotal economic conditions.',
    tr: 'Fed bölgesel ekonomi anketi. Ekonomik koşulların anekdotsal değerlendirmesi.',
    nameTr: 'Bej Kitap',
  },
};


const impactColors = {
  high: 'bg-neon-red/20 text-neon-red border-neon-red/30',
  medium: 'bg-neon-amber/20 text-neon-amber border-neon-amber/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const impactLabels = {
  high: '🔴',
  medium: '🟡',
  low: '⚪',
};

const countryFlags: Record<string, string> = {
  US: '🇺🇸',
  EU: '🇪🇺',
  GB: '🇬🇧',
  UK: '🇬🇧',
  JP: '🇯🇵',
  CN: '🇨🇳',
  DE: '🇩🇪',
  FR: '🇫🇷',
  TR: '🇹🇷',
};

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Format time until event in human-readable format
 */
function formatTimeUntil(diffMs: number, language: string): string {
  if (diffMs < 0) return language === 'tr' ? 'Geçti' : 'Passed';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours > 0) {
      return language === 'tr' ? `${days}g ${remainingHours}s` : `${days}d ${remainingHours}h`;
    }
    return language === 'tr' ? `${days}g` : `${days}d`;
  }

  if (hours > 0) {
    return language === 'tr' ? `${hours}s ${minutes}dk` : `${hours}h ${minutes}m`;
  }

  return language === 'tr' ? `${minutes}dk` : `${minutes}m`;
}

function getEventInfo(eventName: string): { en: string; tr: string; nameTr: string } {
  // Check for exact match
  if (eventData[eventName]) {
    return eventData[eventName];
  }

  // Check for partial matches
  for (const [key, data] of Object.entries(eventData)) {
    if (eventName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(eventName.toLowerCase())) {
      return data;
    }
  }

  return {
    en: `Economic indicator: ${eventName}`,
    tr: `Ekonomik gösterge: ${eventName}`,
    nameTr: eventName,
  };
}

function processEvent(event: ForexFactoryEvent, index: number, language: string): ProcessedEvent {
  // ForexFactory uses 'date' field (ISO 8601 with timezone)
  const eventDate = new Date(event.date);
  const now = new Date();
  const dayIndex = eventDate.getDay();
  const info = getEventInfo(event.title);

  // Calculate time difference
  const diffMs = eventDate.getTime() - now.getTime();

  // Format local date based on language
  const localDate = eventDate.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });

  // Format local time (24h format)
  const localTime = eventDate.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return {
    id: `${index}-${event.date}-${event.title}`,
    date: dayNames[dayIndex],
    dayName: fullDayNames[dayIndex],
    time: eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    event: event.title,
    eventTr: info.nameTr,
    country: 'US', // ForexFactory uses "USD" for country, we map to "US"
    impact: (event.impact?.toLowerCase() || 'medium') as 'high' | 'medium' | 'low',
    forecast: event.forecast || undefined,
    previous: event.previous || undefined,
    actual: undefined, // ForexFactory doesn't include actual in advance
    description: info.en,
    descriptionTr: info.tr,
    // New fields
    fullDate: eventDate,
    localDate,
    localTime,
    timeUntil: diffMs,
    isPast: diffMs < 0,
  };
}

// Tooltip component with Portal for proper z-index handling
function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // Position tooltip above the element
    let top = rect.top - 10;
    let left = rect.left + rect.width / 2;

    // Keep tooltip within viewport horizontally
    const tooltipWidth = 320;
    if (left - tooltipWidth / 2 < 10) {
      left = tooltipWidth / 2 + 10;
    } else if (left + tooltipWidth / 2 > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth / 2 - 10;
    }

    setPosition({ top, left });
    setShow(true);
  };

  const tooltipContent = show ? createPortal(
    <div
      className="fixed px-3 py-2 text-sm text-white bg-gray-900 border border-terminal-border rounded-lg shadow-2xl max-w-[320px] whitespace-normal pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -100%)',
        zIndex: 99999,
      }}
    >
      {content}
      <div
        className="absolute border-8 border-transparent border-t-gray-900"
        style={{
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '-1px',
        }}
      />
    </div>,
    document.body
  ) : null;

  return (
    <div
      className="w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {tooltipContent}
    </div>
  );
}

export function EconomicCalendar() {
  const { t, language } = useLanguage();
  useRefresh(); // Keep hook for consistency but don't use refreshKey
  const { markLoaded } = useLoading();
  const hasMarkedLoaded = useRef(false);
  const [events, setEvents] = useState<ProcessedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyHighImpact, setShowOnlyHighImpact] = useState(true);

  // Fetch data - uses IndexedDB cache (only fetches from API once per week)
  const fetchData = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // forceRefresh bypasses cache and fetches from API
      const data = await fetchForexFactoryCalendar(forceRefresh);
      console.log('[EconomicCalendar] Data received:', data?.length, 'events');

      if (data && data.length > 0) {
        const processed = data
          .map((event, index) => processEvent(event, index, language))
          .filter(e => !e.isPast) // Filter out past events
          .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime()); // Sort by date
        setEvents(processed);
        setError(null);
      } else {
        console.warn('[EconomicCalendar] No data received');
        setError(language === 'tr' ? 'Veri alınamadı' : 'No data available');
      }
    } catch (err) {
      console.error('[EconomicCalendar] Fetch error:', err);
      setError(language === 'tr' ? 'Veri alınamadı' : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  // Fetch on mount (will use cache if available)
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Mark as loaded for initial loading screen
  useEffect(() => {
    if (!isLoading && !hasMarkedLoaded.current) {
      markLoaded(DATA_SOURCE_IDS.CALENDAR);
      hasMarkedLoaded.current = true;
    }
  }, [isLoading, markLoaded]);

  // NOTE: Economic Calendar does NOT auto-refresh with other widgets
  // ForexFactory API only updates once per hour and has strict rate limits
  // Data is cached in IndexedDB and only refreshed when week changes

  // Filter events based on high impact toggle
  const filteredEvents = showOnlyHighImpact
    ? events.filter(e => e.impact === 'high')
    : events;

  const highImpactCount = events.filter(e => e.impact === 'high').length;
  const nextHighImpact = filteredEvents.find(e => e.impact === 'high' && !e.isPast);

  return (
    <Card
      title={t('economicCalendar')}
      headerAction={
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={isLoading}
            className="p-1.5 rounded text-gray-500 hover:text-gray-300 transition-all"
            title="Refresh"
          >
            <IoRefresh className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowOnlyHighImpact(!showOnlyHighImpact)}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-all ${
              showOnlyHighImpact
                ? 'bg-neon-red/20 text-neon-red border border-neon-red/30'
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
            }`}
            title={showOnlyHighImpact ? 'Show all events' : 'Show high impact only'}
          >
            {showOnlyHighImpact ? '🔴 HIGH' : 'ALL'}
          </button>
          <div className="flex items-center gap-1 text-xs text-neon-red">
            <IoAlertCircle />
            <span>{highImpactCount}</span>
          </div>
        </div>
      }
    >
      {isLoading && events.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Week Header */}
          <div className="flex items-center gap-2 pb-2 border-b border-terminal-border">
            <IoCalendar className="text-neon-cyan text-lg" />
            <span className="text-sm text-gray-400">{t('thisWeek')}</span>
          </div>

          {/* Events List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
            {error && events.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-neon-red text-sm mb-2">
                  {error}
                </div>
                <button
                  onClick={() => fetchData(true)}
                  className="text-xs text-neon-cyan hover:underline"
                >
                  {language === 'tr' ? 'Tekrar dene' : 'Try again'}
                </button>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                {language === 'tr' ? 'Bu hafta önemli etkinlik yok' : 'No high impact events this week'}
              </div>
            ) : (
              filteredEvents.map((event) => (
                <Tooltip
                  key={event.id}
                  content={language === 'tr' ? event.descriptionTr : event.description}
                >
                  <div
                    className={`w-full p-3 rounded border cursor-help transition-all hover:scale-[1.01] ${
                      event.impact === 'high'
                        ? 'bg-terminal-border/30 border-neon-red/20 hover:border-neon-red/40'
                        : 'bg-terminal-border/20 border-terminal-border/50 hover:border-terminal-border'
                    } ${event.isPast ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Event Name Row */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{countryFlags[event.country] || '🌍'}</span>
                          <span className="text-sm text-white font-medium truncate">
                            {language === 'tr' ? event.eventTr : event.event}
                          </span>
                          <IoInformationCircle className="text-gray-500 text-sm flex-shrink-0" />
                        </div>
                        {/* Date/Time Row */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-neon-cyan">{event.localDate}</span>
                          <span className="font-mono text-gray-400">{event.localTime}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className={`px-2 py-0.5 rounded text-xs border ${impactColors[event.impact]}`}>
                          {impactLabels[event.impact]}
                        </div>
                        {/* Countdown */}
                        <span className={`text-[10px] font-mono ${event.isPast ? 'text-gray-500' : 'text-neon-amber'}`}>
                          {formatTimeUntil(event.timeUntil, language)}
                        </span>
                      </div>
                    </div>

                    {(event.forecast || event.previous || event.actual) && (
                      <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-terminal-border/50 text-xs">
                        {event.forecast && (
                          <span className="text-gray-400">
                            {t('forecast')}: <span className="text-white font-mono font-medium">{event.forecast}</span>
                          </span>
                        )}
                        {event.previous && (
                          <span className="text-gray-400">
                            {t('previous')}: <span className="text-gray-300 font-mono">{event.previous}</span>
                          </span>
                        )}
                        {event.actual && (
                          <span className="text-neon-green">
                            {t('actual')}: <span className="font-mono font-medium">{event.actual}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Tooltip>
              ))
            )}
          </div>

          {/* Next Major Event */}
          {nextHighImpact && (
            <div className="pt-2 border-t border-terminal-border">
              <div className="flex items-center gap-2 p-2.5 rounded bg-neon-amber/10 border border-neon-amber/30">
                <IoTime className="text-neon-amber text-lg flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="text-gray-400">{t('nextHighImpact')}: </span>
                  <span className="text-white font-medium">
                    {language === 'tr' ? nextHighImpact.eventTr : nextHighImpact.event}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-neon-amber font-mono">{nextHighImpact.localDate}</div>
                  <div className="text-[10px] text-neon-amber/70 font-mono">
                    {formatTimeUntil(nextHighImpact.timeUntil, language)}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </Card>
  );
}
