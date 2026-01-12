/**
 * Market Hours Utility
 * Centralized market hours, status calculation, and countdown formatting
 */

export type MarketStatus = 'open' | 'closed' | 'pre' | 'post' | 'futures';

export interface MarketInfo {
  id: string;
  name: string;
  timezone: string;
  // Opening hours in UTC (as decimal hours, e.g., 14.5 = 14:30)
  regularOpen: number;
  regularClose: number;
  // Pre/Post market (optional)
  preMarketOpen?: number;
  preMarketClose?: number;
  afterHoursOpen?: number;
  afterHoursClose?: number;
  // Futures trading (optional) - typically Sunday evening to Friday
  futuresOpen?: number; // Sunday UTC time when futures open
  hasFutures?: boolean;
}

// Market definitions (all times in UTC)
export const MARKETS: Record<string, MarketInfo> = {
  US: {
    id: 'US',
    name: 'US Markets',
    timezone: 'America/New_York',
    regularOpen: 14.5, // 09:30 ET = 14:30 UTC
    regularClose: 21, // 16:00 ET = 21:00 UTC
    preMarketOpen: 9, // 04:00 ET = 09:00 UTC
    preMarketClose: 14.5,
    afterHoursOpen: 21,
    afterHoursClose: 25, // 20:00 ET = 01:00 UTC next day (25 for calculation)
    futuresOpen: 23, // Sunday 18:00 ET = 23:00 UTC
    hasFutures: true,
  },
  EU: {
    id: 'EU',
    name: 'Europe',
    timezone: 'Europe/London',
    regularOpen: 8, // 08:00 UTC
    regularClose: 16.5, // 16:30 UTC
  },
  ASIA: {
    id: 'ASIA',
    name: 'Asia',
    timezone: 'Asia/Tokyo',
    regularOpen: 0, // 00:00 UTC (09:00 Tokyo)
    regularClose: 6, // 06:00 UTC (15:00 Tokyo) - simplified
  },
  BIST: {
    id: 'BIST',
    name: 'BIST',
    timezone: 'Europe/Istanbul',
    regularOpen: 7, // 10:00 Istanbul = 07:00 UTC
    regularClose: 15, // 18:00 Istanbul = 15:00 UTC
  },
};

export interface MarketStatusInfo {
  status: MarketStatus;
  isOpen: boolean;
  statusText: string;
  statusClass: string;
  timeUntilChange: number; // minutes until next status change
  countdownText: string;
  nextEventTime: Date;
  nextEvent: 'open' | 'close' | 'pre' | 'post' | 'futures';
}

/**
 * Get current UTC time as decimal hours
 */
function getCurrentUTCTime(): number {
  const now = new Date();
  return now.getUTCHours() + now.getUTCMinutes() / 60;
}

/**
 * Get current UTC day of week (0 = Sunday, 6 = Saturday)
 */
function getCurrentUTCDay(): number {
  return new Date().getUTCDay();
}

/**
 * Check if it's a weekend (Saturday or Sunday)
 */
export function isWeekend(): boolean {
  const day = getCurrentUTCDay();
  return day === 0 || day === 6;
}

/**
 * Check if it's Sunday (for futures check)
 */
function isSunday(): boolean {
  return getCurrentUTCDay() === 0;
}

/**
 * Check if it's Saturday
 */
function isSaturday(): boolean {
  return getCurrentUTCDay() === 6;
}

/**
 * Calculate minutes until a specific UTC time
 */
function minutesUntil(targetHour: number): number {
  const now = new Date();
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  let targetMinutes = Math.floor(targetHour) * 60 + Math.round((targetHour % 1) * 60);

  if (targetMinutes <= currentMinutes) {
    // Target is tomorrow
    targetMinutes += 24 * 60;
  }

  return targetMinutes - currentMinutes;
}

/**
 * Calculate minutes until next weekday at a specific UTC time
 */
function minutesUntilNextWeekday(targetHour: number): number {
  const now = new Date();
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const targetMinutes = Math.floor(targetHour) * 60 + Math.round((targetHour % 1) * 60);
  const day = getCurrentUTCDay();

  let daysToAdd = 0;

  if (day === 6) {
    // Saturday: next Monday
    daysToAdd = 2;
  } else if (day === 0) {
    // Sunday: next Monday
    daysToAdd = 1;
  } else if (targetMinutes <= currentMinutes) {
    // Today but time passed: tomorrow (or Monday if Friday)
    daysToAdd = day === 5 ? 3 : 1;
  }

  return daysToAdd * 24 * 60 + (targetMinutes - currentMinutes);
}

/**
 * Format minutes as human-readable countdown
 */
export function formatCountdown(minutes: number): string {
  if (minutes < 0) return '--';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }

  return `${mins}m`;
}

/**
 * Get enhanced market status with countdown
 */
export function getMarketStatus(marketId: string): MarketStatusInfo {
  const market = MARKETS[marketId];
  if (!market) {
    return {
      status: 'closed',
      isOpen: false,
      statusText: 'Unknown',
      statusClass: 'text-gray-500',
      timeUntilChange: 0,
      countdownText: '--',
      nextEventTime: new Date(),
      nextEvent: 'open',
    };
  }

  const time = getCurrentUTCTime();

  // Check for futures (US market on Sunday evening)
  if (market.hasFutures && isSunday() && market.futuresOpen !== undefined) {
    if (time >= market.futuresOpen) {
      // Futures are open on Sunday evening
      const minutesToClose = minutesUntilNextWeekday(market.regularClose);
      return {
        status: 'futures',
        isOpen: true,
        statusText: 'FUTURES',
        statusClass: 'text-purple-400',
        timeUntilChange: minutesToClose,
        countdownText: formatCountdown(minutesToClose),
        nextEventTime: new Date(Date.now() + minutesToClose * 60000),
        nextEvent: 'close',
      };
    }
    // Before futures open on Sunday
    const minutesToFutures = minutesUntil(market.futuresOpen);
    return {
      status: 'closed',
      isOpen: false,
      statusText: 'CLOSED',
      statusClass: 'text-gray-500',
      timeUntilChange: minutesToFutures,
      countdownText: formatCountdown(minutesToFutures),
      nextEventTime: new Date(Date.now() + minutesToFutures * 60000),
      nextEvent: 'futures',
    };
  }

  // Saturday - market closed until Sunday futures or Monday open
  if (isSaturday()) {
    let minutesToNext: number;
    let nextEvent: 'open' | 'futures';

    if (market.hasFutures && market.futuresOpen !== undefined) {
      // Time until Sunday futures open
      minutesToNext = 24 * 60 - (time * 60) + (market.futuresOpen * 60);
      nextEvent = 'futures';
    } else {
      // Time until Monday open
      minutesToNext = minutesUntilNextWeekday(market.regularOpen);
      nextEvent = 'open';
    }

    return {
      status: 'closed',
      isOpen: false,
      statusText: 'CLOSED',
      statusClass: 'text-gray-500',
      timeUntilChange: minutesToNext,
      countdownText: formatCountdown(minutesToNext),
      nextEventTime: new Date(Date.now() + minutesToNext * 60000),
      nextEvent,
    };
  }

  // Sunday before futures open (for non-US markets or before futures time)
  if (isSunday() && (!market.hasFutures || market.futuresOpen === undefined || time < market.futuresOpen)) {
    const minutesToOpen = minutesUntilNextWeekday(market.regularOpen);
    return {
      status: 'closed',
      isOpen: false,
      statusText: 'CLOSED',
      statusClass: 'text-gray-500',
      timeUntilChange: minutesToOpen,
      countdownText: formatCountdown(minutesToOpen),
      nextEventTime: new Date(Date.now() + minutesToOpen * 60000),
      nextEvent: 'open',
    };
  }

  // Weekday logic
  // Check pre-market
  if (market.preMarketOpen !== undefined && market.preMarketClose !== undefined) {
    if (time >= market.preMarketOpen && time < market.preMarketClose) {
      const minutesToOpen = minutesUntil(market.regularOpen);
      return {
        status: 'pre',
        isOpen: false,
        statusText: 'PRE-MARKET',
        statusClass: 'text-neon-amber',
        timeUntilChange: minutesToOpen,
        countdownText: formatCountdown(minutesToOpen),
        nextEventTime: new Date(Date.now() + minutesToOpen * 60000),
        nextEvent: 'open',
      };
    }
  }

  // Check regular trading hours
  if (time >= market.regularOpen && time < market.regularClose) {
    const minutesToClose = minutesUntil(market.regularClose);
    return {
      status: 'open',
      isOpen: true,
      statusText: 'LIVE',
      statusClass: 'text-neon-green',
      timeUntilChange: minutesToClose,
      countdownText: formatCountdown(minutesToClose),
      nextEventTime: new Date(Date.now() + minutesToClose * 60000),
      nextEvent: 'close',
    };
  }

  // Check after-hours
  if (market.afterHoursOpen !== undefined && market.afterHoursClose !== undefined) {
    const afterClose = market.afterHoursClose > 24 ? market.afterHoursClose - 24 : market.afterHoursClose;
    if ((time >= market.afterHoursOpen && time < 24) || (market.afterHoursClose > 24 && time < afterClose)) {
      // Calculate time until after-hours end or pre-market start
      let minutesToNext: number;
      if (market.afterHoursClose > 24) {
        minutesToNext = minutesUntil(afterClose);
      } else {
        minutesToNext = minutesUntil(market.afterHoursClose);
      }
      return {
        status: 'post',
        isOpen: false,
        statusText: 'AFTER-HOURS',
        statusClass: 'text-neon-cyan',
        timeUntilChange: minutesToNext,
        countdownText: formatCountdown(minutesToNext),
        nextEventTime: new Date(Date.now() + minutesToNext * 60000),
        nextEvent: 'pre',
      };
    }
  }

  // Market is closed (not in any trading session)
  let minutesToNext: number;
  let nextEvent: 'open' | 'pre' = 'open';

  if (market.preMarketOpen !== undefined && time < market.preMarketOpen) {
    minutesToNext = minutesUntil(market.preMarketOpen);
    nextEvent = 'pre';
  } else if (time < market.regularOpen) {
    minutesToNext = minutesUntil(market.regularOpen);
    nextEvent = 'open';
  } else {
    // After all sessions, wait for next day
    minutesToNext = minutesUntilNextWeekday(market.preMarketOpen ?? market.regularOpen);
    nextEvent = market.preMarketOpen !== undefined ? 'pre' : 'open';
  }

  return {
    status: 'closed',
    isOpen: false,
    statusText: 'CLOSED',
    statusClass: 'text-gray-500',
    timeUntilChange: minutesToNext,
    countdownText: formatCountdown(minutesToNext),
    nextEventTime: new Date(Date.now() + minutesToNext * 60000),
    nextEvent,
  };
}

/**
 * Simple boolean check if market is open (for backward compatibility)
 */
export function isMarketOpen(marketId: string): boolean {
  const status = getMarketStatus(marketId);
  return status.isOpen;
}

/**
 * Get localized countdown message
 */
export function getCountdownMessage(
  statusInfo: MarketStatusInfo,
  t: (key: string) => string
): string {
  if (statusInfo.isOpen) {
    return `${t('closesIn')} ${statusInfo.countdownText}`;
  }

  switch (statusInfo.nextEvent) {
    case 'open':
      return `${t('opensIn')} ${statusInfo.countdownText}`;
    case 'pre':
      return `${t('preMarketIn')} ${statusInfo.countdownText}`;
    case 'futures':
      return `${t('futuresIn')} ${statusInfo.countdownText}`;
    case 'post':
      return `${t('afterHoursIn')} ${statusInfo.countdownText}`;
    default:
      return `${t('opensIn')} ${statusInfo.countdownText}`;
  }
}

/**
 * Format next event time in user's local timezone
 */
export function formatLocalTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
