import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { IoTrendingUp, IoTrendingDown, IoWarning, IoRefresh } from 'react-icons/io5';
import { useLanguage } from '../../i18n';
import { fetchTreasuryYields } from '../../services/api/yahoo';
import type { QuoteData } from '../../services/api/yahoo';

interface YieldData {
  maturity: string;
  rate: number;
  change: number;
}

// Yield symbol to maturity mapping
const yieldInfo: Record<string, string> = {
  '^IRX': '3M',
  '^FVX': '5Y',
  '^TNX': '10Y',
  '^TYX': '30Y',
};

// Fallback mock data
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
  const [yields, setYields] = useState<YieldData[]>(mockYields);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Sort by maturity order
      const maturityOrder = ['3M', '5Y', '10Y', '30Y'];
      processedYields.sort((a, b) =>
        maturityOrder.indexOf(a.maturity) - maturityOrder.indexOf(b.maturity)
      );

      setYields(processedYields);
    } catch (err) {
      console.error('Failed to fetch treasury yields:', err);
      setError('Failed to load');
      // Keep mock data as fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate spread (10Y - 2Y equivalent, using 5Y as proxy)
  const yield5Y = yields.find(y => y.maturity === '5Y')?.rate || 0;
  const yield10Y = yields.find(y => y.maturity === '10Y')?.rate || 0;
  const spread = yield10Y - yield5Y;
  const isInverted = spread < 0;

  // Calculate bar heights for yield curve visualization
  const maxRate = Math.max(...yields.map(y => y.rate));
  const minRate = Math.min(...yields.map(y => y.rate));
  const range = maxRate - minRate;

  return (
    <Card
      title={t('treasuryYields')}
      onClick={onClick}
      headerAction={
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchData();
            }}
            disabled={isLoading}
            className="p-1.5 rounded text-gray-500 hover:text-gray-300 transition-all"
            title="Refresh"
          >
            <IoRefresh className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {isInverted && (
            <div className="flex items-center gap-1 text-[10px] text-neon-amber">
              <IoWarning />
              <span>{t('inverted')}</span>
            </div>
          )}
        </div>
      }
    >
      {isLoading && yields === mockYields ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Key Yields */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded bg-terminal-border/30">
              <div className="text-[10px] text-gray-500">5Y</div>
              <div className="text-lg font-mono text-white">{yield5Y.toFixed(2)}%</div>
            </div>
            <div className="text-center p-2 rounded bg-terminal-border/30">
              <div className="text-[10px] text-gray-500">10Y</div>
              <div className="text-lg font-mono text-neon-cyan">{yield10Y.toFixed(2)}%</div>
            </div>
            <div className={`text-center p-2 rounded ${isInverted ? 'bg-neon-red/10 border border-neon-red/30' : 'bg-neon-green/10 border border-neon-green/30'}`}>
              <div className="text-[10px] text-gray-500">{t('spread')}</div>
              <div className={`text-lg font-mono ${isInverted ? 'text-neon-red' : 'text-neon-green'}`}>
                {spread >= 0 ? '+' : ''}{(spread * 100).toFixed(0)}bp
              </div>
            </div>
          </div>

          {/* Yield Curve Visualization */}
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{t('yieldCurve')}</div>
            <div className="flex items-end justify-between h-16 gap-1 px-1">
              {yields.map((y) => {
                const height = range > 0 ? ((y.rate - minRate) / range) * 100 : 50;
                return (
                  <div key={y.maturity} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t transition-all ${
                        y.maturity === '10Y' ? 'bg-neon-cyan' :
                        y.change >= 0 ? 'bg-neon-green/60' : 'bg-neon-red/60'
                      }`}
                      style={{ height: `${Math.max(height, 10)}%` }}
                    />
                    <span className="text-[9px] text-gray-500">{y.maturity}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Table */}
          <div className="space-y-1">
            {yields.map((y) => (
              <div
                key={y.maturity}
                className="flex items-center justify-between text-xs py-1 border-b border-terminal-border/30 last:border-0"
              >
                <span className="text-gray-400 font-mono w-10">{y.maturity}</span>
                <span className="text-white font-mono">{y.rate.toFixed(2)}%</span>
                <span className={`font-mono text-[10px] ${y.change >= 0 ? 'value-positive' : 'value-negative'}`}>
                  {y.change >= 0 ? '+' : ''}{y.change.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>

          {/* Signal */}
          <div className={`flex items-center gap-2 p-2 rounded text-xs ${
            isInverted ? 'bg-neon-red/10 border border-neon-red/30' : 'bg-terminal-border/30'
          }`}>
            {isInverted ? (
              <>
                <IoTrendingDown className="text-neon-red" />
                <span className="text-gray-400">{t('invertedSignal')}</span>
              </>
            ) : (
              <>
                <IoTrendingUp className="text-neon-green" />
                <span className="text-gray-400">{t('normalSignal')}</span>
              </>
            )}
          </div>

          {error && (
            <div className="text-center">
              <span className="text-[10px] text-neon-amber">Using cached data</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
