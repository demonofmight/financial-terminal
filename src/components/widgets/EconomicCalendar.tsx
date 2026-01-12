import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../ui/Card';
import { IoCalendar, IoAlertCircle, IoTime, IoRefresh, IoInformationCircle } from 'react-icons/io5';
import { useLanguage } from '../../i18n';
import { fetchEconomicCalendar, type EconomicCalendarEvent } from '../../services/api/fmp';
import { useRefresh } from '../../contexts/RefreshContext';

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

// Fallback mock data
const mockEvents: ProcessedEvent[] = [
  {
    id: '1',
    date: 'Mon',
    dayName: 'Monday',
    time: '15:00',
    event: 'ISM Manufacturing PMI',
    eventTr: 'ISM İmalat PMI',
    country: 'US',
    impact: 'high',
    forecast: '49.5',
    previous: '49.2',
    description: eventData['ISM Manufacturing PMI']?.en || 'Manufacturing sector health indicator.',
    descriptionTr: eventData['ISM Manufacturing PMI']?.tr || 'İmalat sektörü sağlık göstergesi.',
  },
  {
    id: '2',
    date: 'Tue',
    dayName: 'Tuesday',
    time: '10:00',
    event: 'JOLTS Job Openings',
    eventTr: 'JOLTS İş Açıkları',
    country: 'US',
    impact: 'medium',
    forecast: '8.75M',
    previous: '8.76M',
    description: eventData['JOLTS Job Openings']?.en || 'Job openings data.',
    descriptionTr: eventData['JOLTS Job Openings']?.tr || 'İş açıkları verisi.',
  },
  {
    id: '3',
    date: 'Wed',
    dayName: 'Wednesday',
    time: '19:00',
    event: 'FOMC Meeting Minutes',
    eventTr: 'FOMC Toplantı Tutanakları',
    country: 'US',
    impact: 'high',
    description: eventData['FOMC Meeting Minutes']?.en || 'Federal Reserve meeting minutes.',
    descriptionTr: eventData['FOMC Meeting Minutes']?.tr || 'Federal Rezerv toplantı tutanakları.',
  },
  {
    id: '4',
    date: 'Thu',
    dayName: 'Thursday',
    time: '13:30',
    event: 'Initial Jobless Claims',
    eventTr: 'Haftalık İşsizlik Başvuruları',
    country: 'US',
    impact: 'medium',
    forecast: '215K',
    previous: '211K',
    description: eventData['Initial Jobless Claims']?.en || 'Weekly unemployment claims.',
    descriptionTr: eventData['Initial Jobless Claims']?.tr || 'Haftalık işsizlik başvuruları.',
  },
  {
    id: '5',
    date: 'Fri',
    dayName: 'Friday',
    time: '13:30',
    event: 'Non-Farm Payrolls',
    eventTr: 'Tarım Dışı İstihdam',
    country: 'US',
    impact: 'high',
    forecast: '180K',
    previous: '199K',
    description: eventData['Non-Farm Payrolls']?.en || 'Monthly employment report.',
    descriptionTr: eventData['Non-Farm Payrolls']?.tr || 'Aylık istihdam raporu.',
  },
];

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

function processEvent(event: EconomicCalendarEvent, index: number): ProcessedEvent {
  const eventDate = new Date(event.date);
  const dayIndex = eventDate.getDay();
  const info = getEventInfo(event.event);

  return {
    id: `${index}-${event.date}-${event.event}`,
    date: dayNames[dayIndex],
    dayName: fullDayNames[dayIndex],
    time: eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    event: event.event,
    eventTr: info.nameTr,
    country: event.country,
    impact: (event.impact?.toLowerCase() || 'medium') as 'high' | 'medium' | 'low',
    forecast: event.estimate || undefined,
    previous: event.previous || undefined,
    actual: event.actual || undefined,
    description: info.en,
    descriptionTr: info.tr,
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

const CALENDAR_STORAGE_KEY = 'economic_calendar_last_fetch';

// Check if we need to refresh (new week started)
function shouldRefreshCalendar(): boolean {
  const lastFetch = localStorage.getItem(CALENDAR_STORAGE_KEY);
  if (!lastFetch) return true;

  const lastFetchDate = new Date(parseInt(lastFetch, 10));
  const now = new Date();

  // Get the Monday of the current week
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - now.getDay() + 1);
  currentMonday.setHours(0, 0, 0, 0);

  // Get the Monday of the last fetch week
  const lastFetchMonday = new Date(lastFetchDate);
  lastFetchMonday.setDate(lastFetchDate.getDate() - lastFetchDate.getDay() + 1);
  lastFetchMonday.setHours(0, 0, 0, 0);

  // Refresh if it's a new week
  return currentMonday.getTime() > lastFetchMonday.getTime();
}

export function EconomicCalendar() {
  const { t, language } = useLanguage();
  const { refreshKey } = useRefresh();
  const [events, setEvents] = useState<ProcessedEvent[]>(mockEvents);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRefreshKeyRef = useRef(0);

  const fetchData = useCallback(async (force = false) => {
    // Skip refresh if not forced and data is fresh (same week)
    if (!force && !shouldRefreshCalendar()) {
      console.log('[EconomicCalendar] Skipping refresh - data is from this week');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchEconomicCalendar();
      console.log('Economic calendar data:', data);

      if (data && data.length > 0) {
        const processed = data.map((event, index) => processEvent(event, index));
        setEvents(processed);
        localStorage.setItem(CALENDAR_STORAGE_KEY, Date.now().toString());
      } else {
        console.warn('No economic calendar data, using mock');
        setError('Using cached data');
      }
    } catch (err) {
      console.error('Failed to fetch economic calendar:', err);
      setError('Using cached data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true); // Force fetch on mount
  }, [fetchData]);

  // Listen for global refresh - but only refresh if it's a new week
  useEffect(() => {
    if (refreshKey > 0 && refreshKey !== lastRefreshKeyRef.current) {
      lastRefreshKeyRef.current = refreshKey;
      fetchData(false); // Don't force - let it check if new week
    }
  }, [refreshKey, fetchData]);

  const highImpactCount = events.filter(e => e.impact === 'high').length;
  const nextHighImpact = events.find(e => e.impact === 'high');

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
          <div className="flex items-center gap-1 text-xs text-neon-red">
            <IoAlertCircle />
            <span>{highImpactCount} {t('highImpact')}</span>
          </div>
        </div>
      }
    >
      {isLoading && events === mockEvents ? (
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
            {events.map((event) => (
              <Tooltip
                key={event.id}
                content={language === 'tr' ? event.descriptionTr : event.description}
              >
                <div
                  className={`w-full p-3 rounded border cursor-help transition-all hover:scale-[1.01] ${
                    event.impact === 'high'
                      ? 'bg-terminal-border/30 border-neon-red/20 hover:border-neon-red/40'
                      : 'bg-terminal-border/20 border-terminal-border/50 hover:border-terminal-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono text-neon-cyan font-semibold">{event.date}</span>
                        <span className="text-xs font-mono text-gray-500">{event.time}</span>
                        <span className="text-base">{countryFlags[event.country] || '🌍'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium">
                          {language === 'tr' ? event.eventTr : event.event}
                        </span>
                        <IoInformationCircle className="text-gray-500 text-sm flex-shrink-0" />
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs border flex-shrink-0 ${impactColors[event.impact]}`}>
                      {impactLabels[event.impact]}
                    </div>
                  </div>

                  {(event.forecast || event.previous || event.actual) && (
                    <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs">
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
            ))}
          </div>

          {/* Next Major Event */}
          {nextHighImpact && (
            <div className="pt-2 border-t border-terminal-border">
              <div className="flex items-center gap-2 p-2.5 rounded bg-neon-amber/10 border border-neon-amber/30">
                <IoTime className="text-neon-amber text-lg flex-shrink-0" />
                <div className="text-sm">
                  <span className="text-gray-400">{t('nextHighImpact')}: </span>
                  <span className="text-white font-medium">
                    {language === 'tr' ? nextHighImpact.eventTr : nextHighImpact.event}
                  </span>
                  <span className="text-neon-amber ml-2">{nextHighImpact.date} {nextHighImpact.time}</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-center mt-2">
              <span className="text-xs text-neon-amber">{error}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
