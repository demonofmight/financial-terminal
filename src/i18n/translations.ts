export type Language = 'en' | 'tr';

export const translations = {
  en: {
    // Header
    appName: 'FINTERM',
    appSubtitle: 'Financial Terminal Dashboard',
    live: 'LIVE',
    usMarkets: 'US MARKETS',
    open: 'OPEN',
    closed: 'CLOSED',
    refresh: 'Refresh',
    updated: 'Updated',

    // Widget Titles
    sectorPerformance: 'US Sector Performance',
    sp500TopMovers: 'S&P 500 Top Movers',
    preciousMetals: 'Precious Metals',
    cryptoTracker: 'Crypto Tracker',
    fearGreedIndex: 'Fear & Greed Index',
    vixVolatility: 'VIX Volatility',
    currencyRates: 'Currency Rates',
    bistOverview: 'BIST Overview',
    globalMarkets: 'Global Markets',
    treasuryYields: 'Treasury Yields',
    commodities: 'Commodities',
    economicCalendar: 'Economic Calendar',

    // Sector Names
    sectors: {
      XLK: 'Technology',
      XLV: 'Healthcare',
      XLF: 'Financials',
      XLE: 'Energy',
      XLY: 'Consumer Disc.',
      XLI: 'Industrials',
      XLB: 'Materials',
      XLRE: 'Real Estate',
      XLU: 'Utilities',
      XLC: 'Communication',
      XLP: 'Consumer Staples',
      ITA: 'Defense',
    },

    // S&P 500
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    topGainers: 'Top Gainers',
    topLosers: 'Top Losers',

    // Metals
    gold: 'Gold',
    silver: 'Silver',
    platinum: 'Platinum',
    palladium: 'Palladium',

    // Fear & Greed
    extremeFear: 'Extreme Fear',
    fear: 'Fear',
    neutral: 'Neutral',
    greed: 'Greed',
    extremeGreed: 'Extreme Greed',
    cryptoSentiment: 'Crypto Market Sentiment',

    // VIX
    vixIndex: 'Volatility Index',
    lowVolatility: 'Low Volatility',
    moderateVolatility: 'Moderate',
    highVolatility: 'High Volatility',
    extremeVolatility: 'Extreme',
    marketCalm: 'Market is calm - risk appetite high',
    marketCautious: 'Elevated caution in markets',
    marketFearful: 'High fear - consider hedging',
    marketPanic: 'Panic mode - extreme caution',

    // Currency
    major: 'Major',
    cross: 'Cross',

    // BIST
    bist100: 'BIST 100',
    marketClosed: 'Market Closed',
    opens: 'Opens',

    // Global Markets
    americas: 'Americas',
    europe: 'Europe',
    asiaPacific: 'Asia Pacific',
    indices: 'indices',

    // Treasury
    yieldCurve: 'Yield Curve',
    spread: 'Spread',
    inverted: 'INVERTED',
    invertedSignal: 'Inverted curve signals recession risk',
    normalSignal: 'Normal curve - growth expected',

    // Commodities
    crudeOil: 'WTI Crude Oil',
    brentCrude: 'Brent Crude',
    naturalGas: 'Natural Gas',
    copper: 'Copper',
    wheat: 'Wheat',
    drCopperSays: 'Dr. Copper Says',
    growthSignal: 'Growth Signal',
    slowdownRisk: 'Slowdown Risk',
    demandRising: 'Industrial demand rising - bullish for growth stocks',
    demandWeakening: 'Demand weakening - defensive positioning advised',

    // Economic Calendar
    thisWeek: "This Week's Key Events",
    highImpact: 'High Impact',
    nextHighImpact: 'Next High Impact',
    forecast: 'Fcst',
    previous: 'Prev',
    actual: 'Act',

    // Crypto
    add: 'Add',
    edit: 'Edit',
    done: 'Done',
    addCryptocurrency: 'Add Cryptocurrency',

    // Sector Legend
    strongSell: 'Strong Sell',
    weak: 'Weak',
    gaining: 'Gaining',
    strongBuy: 'Strong Buy',

    // Table Headers
    symbol: 'Symbol',
    name: 'Name',
    price: 'Price',
    change: 'Change',

    // Time
    last7days: 'Last 7 days',
    last24h: '24h',

    // Common
    loadingChart: 'Loading chart...',
    notFinancialAdvice: 'Not financial advice',
    dataProvidedBy: 'Data provided by Financial APIs',
    builtWith: 'Built with React + TailwindCSS',

    // Auto-refresh
    autoRefreshOn: 'Auto-refresh enabled',
    autoRefreshOff: 'Auto-refresh disabled',
    nextRefresh: 'Next refresh in',

    // Market Status Countdown
    closesIn: 'Closes in',
    opensIn: 'Opens in',
    preMarketIn: 'Pre-market in',
    futuresIn: 'Futures in',
    afterHoursIn: 'After-hours in',
    preMarket: 'PRE-MARKET',
    afterHours: 'AFTER-HOURS',
    futures: 'FUTURES',
  },

  tr: {
    // Header
    appName: 'FINTERM',
    appSubtitle: 'Finansal Terminal Paneli',
    live: 'CANLI',
    usMarkets: 'ABD PİYASALARI',
    open: 'AÇIK',
    closed: 'KAPALI',
    refresh: 'Yenile',
    updated: 'Güncellendi',

    // Widget Titles
    sectorPerformance: 'ABD Sektör Performansı',
    sp500TopMovers: 'S&P 500 En Çok Değişenler',
    preciousMetals: 'Değerli Metaller',
    cryptoTracker: 'Kripto Takip',
    fearGreedIndex: 'Korku & Açgözlülük',
    vixVolatility: 'VIX Volatilite',
    currencyRates: 'Döviz Kurları',
    bistOverview: 'BIST Özeti',
    globalMarkets: 'Dünya Borsaları',
    treasuryYields: 'Hazine Faizleri',
    commodities: 'Emtialar',
    economicCalendar: 'Ekonomik Takvim',

    // Sector Names
    sectors: {
      XLK: 'Teknoloji',
      XLV: 'Sağlık',
      XLF: 'Finans',
      XLE: 'Enerji',
      XLY: 'Tük. İhtiyari',
      XLI: 'Sanayi',
      XLB: 'Malzeme',
      XLRE: 'Gayrimenkul',
      XLU: 'Kamu Hizm.',
      XLC: 'İletişim',
      XLP: 'Temel Tüketim',
      ITA: 'Savunma',
    },

    // S&P 500
    daily: 'Günlük',
    weekly: 'Haftalık',
    monthly: 'Aylık',
    topGainers: 'En Çok Yükselenler',
    topLosers: 'En Çok Düşenler',

    // Metals
    gold: 'Altın',
    silver: 'Gümüş',
    platinum: 'Platin',
    palladium: 'Paladyum',

    // Fear & Greed
    extremeFear: 'Aşırı Korku',
    fear: 'Korku',
    neutral: 'Nötr',
    greed: 'Açgözlülük',
    extremeGreed: 'Aşırı Açgözlülük',
    cryptoSentiment: 'Kripto Piyasa Duyarlılığı',

    // VIX
    vixIndex: 'Volatilite Endeksi',
    lowVolatility: 'Düşük Volatilite',
    moderateVolatility: 'Orta',
    highVolatility: 'Yüksek Volatilite',
    extremeVolatility: 'Aşırı',
    marketCalm: 'Piyasa sakin - risk iştahı yüksek',
    marketCautious: 'Piyasalarda artan temkinlilik',
    marketFearful: 'Yüksek korku - hedge düşünün',
    marketPanic: 'Panik modu - aşırı dikkat',

    // Currency
    major: 'Ana',
    cross: 'Çapraz',

    // BIST
    bist100: 'BIST 100',
    marketClosed: 'Piyasa Kapalı',
    opens: 'Açılış',

    // Global Markets
    americas: 'Amerika',
    europe: 'Avrupa',
    asiaPacific: 'Asya Pasifik',
    indices: 'endeks',

    // Treasury
    yieldCurve: 'Getiri Eğrisi',
    spread: 'Fark',
    inverted: 'TERS',
    invertedSignal: 'Ters eğri resesyon riski sinyali',
    normalSignal: 'Normal eğri - büyüme bekleniyor',

    // Commodities
    crudeOil: 'WTI Ham Petrol',
    brentCrude: 'Brent Petrol',
    naturalGas: 'Doğal Gaz',
    copper: 'Bakır',
    wheat: 'Buğday',
    drCopperSays: 'Dr. Bakır Diyor Ki',
    growthSignal: 'Büyüme Sinyali',
    slowdownRisk: 'Yavaşlama Riski',
    demandRising: 'Endüstriyel talep artıyor - büyüme hisseleri için olumlu',
    demandWeakening: 'Talep zayıflıyor - defansif pozisyon önerilir',

    // Economic Calendar
    thisWeek: 'Bu Haftanın Önemli Olayları',
    highImpact: 'Yüksek Etki',
    nextHighImpact: 'Sonraki Yüksek Etki',
    forecast: 'Thm',
    previous: 'Önc',
    actual: 'Grç',

    // Crypto
    add: 'Ekle',
    edit: 'Düzenle',
    done: 'Tamam',
    addCryptocurrency: 'Kripto Para Ekle',

    // Sector Legend
    strongSell: 'Güçlü Sat',
    weak: 'Zayıf',
    gaining: 'Yükseliyor',
    strongBuy: 'Güçlü Al',

    // Table Headers
    symbol: 'Sembol',
    name: 'İsim',
    price: 'Fiyat',
    change: 'Değişim',

    // Time
    last7days: 'Son 7 gün',
    last24h: '24s',

    // Common
    loadingChart: 'Grafik yükleniyor...',
    notFinancialAdvice: 'Yatırım tavsiyesi değildir',
    dataProvidedBy: 'Veriler finansal API\'lerden sağlanmaktadır',
    builtWith: 'React + TailwindCSS ile geliştirildi',

    // Auto-refresh
    autoRefreshOn: 'Otomatik yenileme açık',
    autoRefreshOff: 'Otomatik yenileme kapalı',
    nextRefresh: 'Sonraki yenileme',

    // Market Status Countdown
    closesIn: 'Kapanışa',
    opensIn: 'Açılışa',
    preMarketIn: 'Ön-piyasaya',
    futuresIn: 'Vadeli işlemlere',
    afterHoursIn: 'Mesai sonrasına',
    preMarket: 'ÖN-PİYASA',
    afterHours: 'MESAİ SONRASI',
    futures: 'VADELİ',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
