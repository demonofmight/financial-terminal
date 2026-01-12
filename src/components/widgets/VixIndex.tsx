import { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { IoWarning, IoCheckmarkCircle, IoAlertCircle, IoRefresh } from 'react-icons/io5';
import { motion } from 'framer-motion';
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

  // VIX levels with modern colors
  const getVixStatus = (value: number) => {
    if (value < 15) {
      return {
        level: t('lowVolatility').toUpperCase(),
        color: '#22c55e',
        bgColor: 'bg-accent-green/10',
        borderColor: 'border-accent-green/20',
        icon: IoCheckmarkCircle,
        description: t('marketCalm'),
      };
    }
    if (value < 25) {
      return {
        level: t('moderateVolatility').toUpperCase(),
        color: '#f59e0b',
        bgColor: 'bg-accent-amber/10',
        borderColor: 'border-accent-amber/20',
        icon: IoAlertCircle,
        description: t('marketCautious'),
      };
    }
    if (value < 35) {
      return {
        level: t('highVolatility').toUpperCase(),
        color: '#f97316',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
        icon: IoWarning,
        description: t('marketFearful'),
      };
    }
    return {
      level: t('extremeVolatility').toUpperCase(),
      color: '#ef4444',
      bgColor: 'bg-accent-red/10',
      borderColor: 'border-accent-red/20',
      icon: IoWarning,
      description: t('marketPanic'),
    };
  };

  const status = getVixStatus(vixValue);
  const StatusIcon = status.icon;
  const barWidth = Math.min((vixValue / 50) * 100, 100);

  return (
    <Card
      title={t('vixVolatility')}
      onClick={onClick}
      compact
      headerAction={
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
      }
    >
      <div className="space-y-3">
        {/* Main Value */}
        <div className="flex items-center justify-between">
          <div>
            <motion.div
              className="text-3xl font-mono font-bold"
              style={{ color: status.color }}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              {vixValue.toFixed(2)}
            </motion.div>
            <div className={`text-xs font-mono ${change >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
            </div>
          </div>

          <div className={`px-2 py-1.5 rounded ${status.bgColor} border ${status.borderColor} flex items-center gap-1.5`}>
            <StatusIcon style={{ color: status.color }} className="text-base" />
            <div className="text-right">
              <div className="text-[10px] font-bold" style={{ color: status.color }}>
                {status.level}
              </div>
              <div className="text-[9px] text-neutral-500">
                {status.description}
              </div>
            </div>
          </div>
        </div>

        {/* VIX Bar */}
        <div className="space-y-1">
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 opacity-20"
              style={{
                background: 'linear-gradient(90deg, #22c55e 0%, #f59e0b 40%, #f97316 70%, #ef4444 100%)'
              }}
            />
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${barWidth}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{
                background: `linear-gradient(90deg, ${status.color}90, ${status.color})`,
              }}
            />
          </div>

          {/* Scale */}
          <div className="flex justify-between text-[8px] text-neutral-600">
            <span>0</span>
            <span>15</span>
            <span>25</span>
            <span>35</span>
            <span>50+</span>
          </div>
        </div>

        {/* Reference Levels - Compact */}
        <div className="grid grid-cols-4 gap-0.5 pt-2 border-t border-terminal-border">
          {[
            { label: 'Low', range: '< 15', color: '#22c55e' },
            { label: 'Mod', range: '15-25', color: '#f59e0b' },
            { label: 'High', range: '25-35', color: '#f97316' },
            { label: 'Ext', range: '> 35', color: '#ef4444' },
          ].map((level) => (
            <div
              key={level.label}
              className="text-center py-0.5"
            >
              <div className="text-[8px] text-neutral-600">{level.range}</div>
              <div className="text-[9px] font-medium" style={{ color: level.color }}>{level.label}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="text-center">
            <span className="text-[9px] text-accent-amber">Using cached data</span>
          </div>
        )}
      </div>
    </Card>
  );
}
