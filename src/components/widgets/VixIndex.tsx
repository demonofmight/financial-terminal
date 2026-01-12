import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { IoWarning, IoCheckmarkCircle, IoAlertCircle, IoRefresh } from 'react-icons/io5';
import { useLanguage } from '../../i18n';
import { fetchVIX } from '../../services/api/yahoo';
import { useRefresh } from '../../contexts/RefreshContext';

interface VixIndexProps {
  onClick?: () => void;
}

export function VixIndex({ onClick }: VixIndexProps) {
  const { t } = useLanguage();
  const { refreshKey } = useRefresh();
  const [vixValue, setVixValue] = useState(18.45);
  const [change, setChange] = useState(-1.23);
  const [changePercent, setChangePercent] = useState(-6.25);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchVIX();
      setVixValue(data.price);
      setChange(data.change);
      setChangePercent(data.changePercent);
    } catch (err) {
      console.error('Failed to fetch VIX data:', err);
      setError('Failed to load');
      // Keep previous values as fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for global refresh
  useEffect(() => {
    if (refreshKey > 0) {
      fetchData();
    }
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // VIX levels interpretation
  const getVixStatus = (value: number) => {
    if (value < 15) {
      return {
        level: t('lowVolatility').toUpperCase(),
        color: '#00ff88',
        bgColor: 'bg-neon-green/10',
        borderColor: 'border-neon-green/30',
        icon: IoCheckmarkCircle,
        description: t('marketCalm'),
      };
    }
    if (value < 25) {
      return {
        level: t('moderateVolatility').toUpperCase(),
        color: '#ffb000',
        bgColor: 'bg-neon-amber/10',
        borderColor: 'border-neon-amber/30',
        icon: IoAlertCircle,
        description: t('marketCautious'),
      };
    }
    if (value < 35) {
      return {
        level: t('highVolatility').toUpperCase(),
        color: '#ff6b35',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        icon: IoWarning,
        description: t('marketFearful'),
      };
    }
    return {
      level: t('extremeVolatility').toUpperCase(),
      color: '#ff3366',
      bgColor: 'bg-neon-red/10',
      borderColor: 'border-neon-red/30',
      icon: IoWarning,
      description: t('marketPanic'),
    };
  };

  const status = getVixStatus(vixValue);
  const StatusIcon = status.icon;

  // Calculate bar width based on VIX (max around 80 for display)
  const barWidth = Math.min((vixValue / 50) * 100, 100);

  return (
    <Card
      title={t('vixVolatility')}
      onClick={onClick}
      headerAction={
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
      }
    >
      <div className="space-y-4">
        {/* Main Value */}
        <div className="flex items-center justify-between">
          <div>
            <div
              className="text-4xl font-mono font-bold"
              style={{ color: status.color, textShadow: `0 0 20px ${status.color}40` }}
            >
              {vixValue.toFixed(2)}
            </div>
            <div className={`text-xs font-mono ${change >= 0 ? 'value-positive' : 'value-negative'}`}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
            </div>
          </div>

          <div
            className={`px-3 py-2 rounded ${status.bgColor} border ${status.borderColor} flex items-center gap-2`}
          >
            <StatusIcon style={{ color: status.color }} className="text-lg" />
            <div className="text-right">
              <div className="text-xs font-bold" style={{ color: status.color }}>
                {status.level}
              </div>
              <div className="text-[10px] text-gray-500">
                {status.description}
              </div>
            </div>
          </div>
        </div>

        {/* VIX Bar */}
        <div className="space-y-2">
          <div className="h-3 bg-terminal-border rounded-full overflow-hidden relative">
            {/* Gradient background */}
            <div className="absolute inset-0 opacity-30"
              style={{
                background: 'linear-gradient(90deg, #00ff88 0%, #ffb000 40%, #ff6b35 70%, #ff3366 100%)'
              }}
            />
            {/* Value indicator */}
            <div
              className="h-full rounded-full transition-all duration-500 relative"
              style={{
                width: `${barWidth}%`,
                background: `linear-gradient(90deg, ${status.color}80, ${status.color})`,
                boxShadow: `0 0 10px ${status.color}60`,
              }}
            />
          </div>

          {/* Scale */}
          <div className="flex justify-between text-[9px] text-gray-500">
            <span>0</span>
            <span>15</span>
            <span>25</span>
            <span>35</span>
            <span>50+</span>
          </div>
        </div>

        {/* Reference Levels */}
        <div className="grid grid-cols-4 gap-1 pt-3 border-t border-terminal-border">
          {[
            { label: 'Low', range: '< 15', color: '#00ff88' },
            { label: 'Normal', range: '15-25', color: '#ffb000' },
            { label: 'High', range: '25-35', color: '#ff6b35' },
            { label: 'Extreme', range: '> 35', color: '#ff3366' },
          ].map((level) => (
            <div
              key={level.label}
              className="text-center py-1 rounded"
              style={{
                backgroundColor: vixValue >= parseInt(level.range) || level.range.includes('>') ? `${level.color}10` : 'transparent',
                borderBottom: `2px solid ${level.color}40`,
              }}
            >
              <div className="text-[9px] text-gray-500">{level.range}</div>
              <div className="text-[10px]" style={{ color: level.color }}>{level.label}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="text-center">
            <span className="text-[10px] text-neon-amber">Using cached data</span>
          </div>
        )}
      </div>
    </Card>
  );
}
