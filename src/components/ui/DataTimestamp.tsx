import { useLanguage } from '../../i18n';

interface DataTimestampProps {
  timestamp: Date | number | null;
  className?: string;
}

/**
 * Displays a timestamp indicating when data was last updated
 * Useful for showing when market data was captured (e.g., when market is closed)
 */
export function DataTimestamp({ timestamp, className = '' }: DataTimestampProps) {
  const { language } = useLanguage();

  if (!timestamp) return null;

  const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : timestamp;

  // Check if the date is valid
  if (isNaN(date.getTime())) return null;

  const formatTimestamp = (d: Date): string => {
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();

    const timeStr = d.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    if (isToday) {
      return language === 'tr' ? `Bugün ${timeStr}` : `Today ${timeStr}`;
    }

    if (isYesterday) {
      return language === 'tr' ? `Dün ${timeStr}` : `Yesterday ${timeStr}`;
    }

    const dateStr = d.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });

    return `${dateStr} ${timeStr}`;
  };

  return (
    <span className={`text-[10px] text-gray-500 font-mono ${className}`}>
      {language === 'tr' ? 'Veri: ' : 'Data: '}
      {formatTimestamp(date)}
    </span>
  );
}
