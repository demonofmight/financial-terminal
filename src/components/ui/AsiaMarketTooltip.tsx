import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatLocalTime, type AsiaGroupedStatus, getAsiaGroupedStatus } from '../../utils/marketHours';
import { useLanguage } from '../../i18n';

interface AsiaMarketTooltipProps {
  asiaStatus: AsiaGroupedStatus;
  children: React.ReactNode;
}

export function AsiaMarketTooltip({ asiaStatus, children }: AsiaMarketTooltipProps) {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [liveStatus, setLiveStatus] = useState<AsiaGroupedStatus>(asiaStatus);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Update status info every minute
  useEffect(() => {
    const updateStatus = () => {
      setLiveStatus(getAsiaGroupedStatus());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

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

  const getCountdownMessage = (market: AsiaGroupedStatus['markets'][0]) => {
    const statusInfo = market.status;
    if (statusInfo.isOpen) {
      return `${t('closesIn')} ${statusInfo.countdownText}`;
    }
    return `${t('opensIn')} ${statusInfo.countdownText}`;
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
            <div className="bg-terminal-card border border-terminal-border rounded-lg shadow-xl p-3 min-w-[220px]">
              {/* Header */}
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 pb-1 border-b border-terminal-border/50">
                Asia Pacific Markets
              </div>

              {/* Individual Market Status */}
              <div className="space-y-2">
                {liveStatus.markets.map((market) => (
                  <div key={market.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          market.status.isOpen
                            ? 'bg-neon-green animate-pulse'
                            : 'bg-gray-500'
                        }`}
                      />
                      <span className="text-xs text-white font-medium">{market.name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-mono ${market.status.statusClass}`}>
                        {market.status.isOpen ? t('open') : t('closed')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Countdown Details */}
              <div className="mt-2 pt-2 border-t border-terminal-border/50 space-y-1">
                {liveStatus.markets.map((market) => (
                  <div key={`${market.id}-countdown`} className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-500">{market.name}</span>
                    <span className="text-gray-400 font-mono">
                      {getCountdownMessage(market)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Next Event Time */}
              <div className="mt-2 pt-2 border-t border-terminal-border/50">
                <div className="text-[10px] text-gray-500">
                  Next change: {formatLocalTime(
                    liveStatus.markets.reduce((earliest, m) =>
                      m.status.timeUntilChange < earliest.status.timeUntilChange ? m : earliest
                    ).status.nextEventTime
                  )} (local)
                </div>
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
