import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../ui/Card';
import { IoTrendingUp, IoTrendingDown, IoWarning, IoRefresh } from 'react-icons/io5';
import { motion } from 'framer-motion';
import { useLanguage } from '../../i18n';
import { fetchTreasuryYields } from '../../services/api/yahoo';
import { useRefresh } from '../../contexts/RefreshContext';
import { useLoading, DATA_SOURCE_IDS } from '../../contexts/LoadingContext';
import { isMarketOpen } from '../../utils/marketHours';
import { DataTimestamp } from '../ui/DataTimestamp';
import type { QuoteData } from '../../services/api/yahoo';

interface YieldData {
  maturity: string;
  rate: number;
  change: number;
}

const yieldInfo: Record<string, string> = {
  '^IRX': '3M',
  '^FVX': '5Y',
  '^TNX': '10Y',
  '^TYX': '30Y',
};

const mockYields: YieldData[] = [
  { maturity: '3M', rate: 5.24, change: 0.02 },
  { maturity: '5Y', rate: 4.12, change: -0.02 },
  { maturity: '10Y', rate: 4.28, change: 0.03 },
  { maturity: '30Y', rate: 4.45, change: 0.05 },
];

interface TreasuryYieldsProps {
  onClick?: () => void;
}

export function TreasuryYields({ onClick }: TreasuryYieldsProps) {
  const { t } = useLanguage();
  const { refreshKey } = useRefresh();
  const { markLoaded } = useLoading();
  const hasMarkedLoaded = useRef(false);
  const [yields, setYields] = useState<YieldData[]>(mockYields);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastTradeTime, setLastTradeTime] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchTreasuryYields();

      const processedYields: YieldData[] = data.map((quote: QuoteData) => ({
        maturity: yieldInfo[quote.symbol] || quote.symbol,
        rate: quote.price,
        change: quote.changePercent,
      }));

      const maturityOrder = ['3M', '5Y', '10Y', '30Y'];
      processedYields.sort((a, b) =>
        maturityOrder.indexOf(a.maturity) - maturityOrder.indexOf(b.maturity)
      );

      setYields(processedYields);

      if (data.length > 0 && data[0].lastTradeTime) {
        setLastTradeTime(data[0].lastTradeTime);
      }
    } catch (err) {
      console.error('Failed to fetch treasury yields:', err);
      setError('Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refreshKey > 0) {
      fetchData();
    }
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark as loaded for initial loading screen
  useEffect(() => {
    if (!isLoading && !hasMarkedLoaded.current) {
      markLoaded(DATA_SOURCE_IDS.TREASURY);
      hasMarkedLoaded.current = true;
    }
  }, [isLoading, markLoaded]);

  const yield5Y = yields.find(y => y.maturity === '5Y')?.rate || 0;
  const yield10Y = yields.find(y => y.maturity === '10Y')?.rate || 0;
  const spread = yield10Y - yield5Y;
  const isInverted = spread < 0;

  const maxRate = Math.max(...yields.map(y => y.rate));
  const minRate = Math.min(...yields.map(y => y.rate));
  const range = maxRate - minRate;

  return (
    <Card
      title={t('treasuryYields')}
      onClick={onClick}
      compact
      headerAction={
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchData();
            }}
            disabled={isLoading}
            className="p-1 rounded text-neutral-500 hover:text-neutral-300 transition-colors"
            title="Refresh"
          >
            <IoRefresh className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {isInverted && (
            <div className="flex items-center gap-1 text-[11px] text-accent-amber">
              <IoWarning />
              <span>{t('inverted')}</span>
            </div>
          )}
        </div>
      }
    >
      {isLoading && yields === mockYields ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Key Yields */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="text-center p-1.5 rounded bg-terminal-card-hover">
              <div className="text-[11px] text-neutral-500">5Y</div>
              <div className="text-base font-mono text-neutral-200">{yield5Y.toFixed(2)}%</div>
            </div>
            <div className="text-center p-1.5 rounded bg-terminal-card-hover">
              <div className="text-[11px] text-neutral-500">10Y</div>
              <div className="text-base font-mono text-accent-cyan">{yield10Y.toFixed(2)}%</div>
            </div>
            <div className={`text-center p-1.5 rounded ${isInverted ? 'bg-accent-red/10 border border-accent-red/20' : 'bg-accent-green/10 border border-accent-green/20'}`}>
              <div className="text-[11px] text-neutral-500">{t('spread')}</div>
              <div className={`text-base font-mono ${isInverted ? 'text-accent-red' : 'text-accent-green'}`}>
                {spread >= 0 ? '+' : ''}{(spread * 100).toFixed(0)}bp
              </div>
            </div>
          </div>

          {/* Yield Curve */}
          <div>
            <div className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1.5">{t('yieldCurve')}</div>
            <div className="flex items-end justify-between h-12 gap-1">
              {yields.map((y, index) => {
                const height = range > 0 ? ((y.rate - minRate) / range) * 100 : 50;
                return (
                  <motion.div
                    key={y.maturity}
                    className="flex-1 flex flex-col items-center gap-0.5"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: index * 0.1 }}
                    style={{ transformOrigin: 'bottom' }}
                  >
                    <div
                      className={`w-full rounded-t transition-colors ${
                        y.maturity === '10Y' ? 'bg-accent-cyan' :
                        y.change >= 0 ? 'bg-accent-green/50' : 'bg-accent-red/50'
                      }`}
                      style={{ height: `${Math.max(height, 15)}%` }}
                    />
                    <span className="text-[10px] text-neutral-600">{y.maturity}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="space-y-0.5">
            {yields.map((y) => (
              <div
                key={y.maturity}
                className="flex items-center justify-between text-[11px] py-1 border-b border-terminal-border/30 last:border-0"
              >
                <span className="text-neutral-500 font-mono w-8">{y.maturity}</span>
                <span className="text-neutral-200 font-mono">{y.rate.toFixed(2)}%</span>
                <span className={`font-mono text-[10px] ${y.change >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {y.change >= 0 ? '+' : ''}{y.change.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>

          {/* Signal */}
          <div className={`flex items-center gap-1.5 p-1.5 rounded text-[10px] ${
            isInverted ? 'bg-accent-red/10 border border-accent-red/20' : 'bg-terminal-card-hover'
          }`}>
            {isInverted ? (
              <>
                <IoTrendingDown className="text-accent-red" />
                <span className="text-neutral-400">{t('invertedSignal')}</span>
              </>
            ) : (
              <>
                <IoTrendingUp className="text-accent-green" />
                <span className="text-neutral-400">{t('normalSignal')}</span>
              </>
            )}
          </div>

          {!isMarketOpen('US') && lastTradeTime && (
            <div className="text-center">
              <DataTimestamp timestamp={lastTradeTime} />
            </div>
          )}

          {error && (
            <div className="text-center">
              <span className="text-[11px] text-accent-amber">Using cached data</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
