import { useEffect, useRef } from 'react';
import { IoClose } from 'react-icons/io5';
import { useLanguage } from '../../i18n';

interface TradingViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  title?: string;
}

export function TradingViewModal({ isOpen, onClose, symbol, title }: TradingViewModalProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  // Store onClose in a ref to avoid dependency issues
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = '';

    // Create container structure that TradingView expects
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const innerContainer = document.createElement('div');
    innerContainer.className = 'tradingview-widget-container__widget';
    innerContainer.style.height = '100%';
    innerContainer.style.width = '100%';

    widgetContainer.appendChild(innerContainer);

    // Create TradingView widget script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: 'D',
      timezone: 'Europe/Istanbul',
      theme: 'dark',
      style: '1',
      locale: 'en',
      allow_symbol_change: true,
      enable_publishing: false,
      backgroundColor: 'rgba(10, 10, 15, 1)',
      gridColor: 'rgba(30, 32, 40, 0.5)',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
    });

    widgetContainer.appendChild(script);
    containerRef.current.appendChild(widgetContainer);

    // Escape key to close
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, symbol]); // Removed onClose from dependencies

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl h-[80vh] bg-terminal-bg border border-terminal-border rounded-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 0 60px rgba(0, 255, 136, 0.1), 0 0 100px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border bg-gray-950/50">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></span>
            <h3 className="font-display text-sm uppercase tracking-wider text-gray-300">
              {title || symbol}
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">{symbol}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-terminal-border/50 text-gray-400 hover:text-white transition-colors"
          >
            <IoClose className="text-xl" />
          </button>
        </div>

        {/* Chart Container */}
        <div
          ref={containerRef}
          className="tradingview-widget-container w-full"
          style={{ height: 'calc(100% - 52px)' }}
        >
          {/* Loading state */}
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-neon-green/30 border-t-neon-green rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-gray-500">{t('loadingChart')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
