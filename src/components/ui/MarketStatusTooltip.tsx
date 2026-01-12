import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getMarketStatus, formatLocalTime, type MarketStatusInfo } from '../../utils/marketHours';
import { useLanguage } from '../../i18n';

interface MarketStatusTooltipProps {
  marketId: string;
  children: React.ReactNode;
}

export function MarketStatusTooltip({ marketId, children }: MarketStatusTooltipProps) {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [statusInfo, setStatusInfo] = useState<MarketStatusInfo | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Update status info every minute
  useEffect(() => {
    const updateStatus = () => {
      setStatusInfo(getMarketStatus(marketId));
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [marketId]);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      });
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  if (!statusInfo) return <>{children}</>;

  const getCountdownMessage = () => {
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
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-help inline-flex"
      >
        {children}
      </div>

      {isVisible &&
        createPortal(
          <div
            className="fixed pointer-events-none"
            style={{
              top: position.top,
              left: position.left,
              transform: 'translateX(-50%)',
              zIndex: 99999,
            }}
          >
            <div className="bg-terminal-card border border-terminal-border rounded-lg shadow-xl p-3 min-w-[180px]">
              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    statusInfo.status === 'open'
                      ? 'bg-neon-green animate-pulse'
                      : statusInfo.status === 'pre' || statusInfo.status === 'post'
                      ? 'bg-neon-amber'
                      : statusInfo.status === 'futures'
                      ? 'bg-purple-400'
                      : 'bg-gray-500'
                  }`}
                />
                <span className={`text-xs font-mono font-medium ${statusInfo.statusClass}`}>
                  {statusInfo.status === 'open' && t('open')}
                  {statusInfo.status === 'closed' && t('closed')}
                  {statusInfo.status === 'pre' && t('preMarket')}
                  {statusInfo.status === 'post' && t('afterHours')}
                  {statusInfo.status === 'futures' && t('futures')}
                </span>
              </div>

              {/* Countdown */}
              <div className="text-sm text-white font-medium mb-1">
                {getCountdownMessage()}
              </div>

              {/* Next Event Time */}
              <div className="text-[10px] text-gray-500">
                {formatLocalTime(statusInfo.nextEventTime)} (local)
              </div>

              {/* Arrow */}
              <div
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-terminal-card border-l border-t border-terminal-border rotate-45"
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
