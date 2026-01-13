import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../ui/Card';
import { IoNewspaper, IoRefresh, IoOpenOutline, IoTrendingUp, IoTrendingDown, IoRemove } from 'react-icons/io5';
import { useLanguage } from '../../i18n';
import { useRefresh } from '../../contexts/RefreshContext';
import { useLoading, DATA_SOURCE_IDS } from '../../contexts/LoadingContext';
import {
  fetchMarketNews,
  formatNewsTime,
  getNewsSentiment,
  type MarketNews as MarketNewsType,
} from '../../services/api/finnhub';

type NewsCategory = 'general' | 'crypto' | 'forex' | 'merger';

const categoryStyles: Record<NewsCategory, { bg: string; text: string; border: string }> = {
  general: { bg: 'bg-neon-cyan/10', text: 'text-neon-cyan', border: 'border-neon-cyan/30' },
  crypto: { bg: 'bg-neon-green/10', text: 'text-neon-green', border: 'border-neon-green/30' },
  forex: { bg: 'bg-neon-amber/10', text: 'text-neon-amber', border: 'border-neon-amber/30' },
  merger: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
};

const sentimentIcons = {
  positive: <IoTrendingUp className="text-neon-green" />,
  negative: <IoTrendingDown className="text-neon-red" />,
  neutral: <IoRemove className="text-gray-500" />,
};

interface MarketNewsProps {
  onNewsClick?: (url: string) => void;
}

export function MarketNews({ onNewsClick }: MarketNewsProps) {
  const { t, language } = useLanguage();
  const { refreshKey } = useRefresh();
  const { markLoaded } = useLoading();
  const hasMarkedLoaded = useRef(false);

  const [news, setNews] = useState<MarketNewsType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<NewsCategory>('general');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchMarketNews(activeCategory);

      if (data && data.length > 0) {
        // Sort by date (newest first) and limit to 15 items
        const sortedNews = data
          .sort((a, b) => b.datetime - a.datetime)
          .slice(0, 15);
        setNews(sortedNews);
        setError(null);
      } else {
        setError(language === 'tr' ? 'Haber bulunamadı' : 'No news available');
      }
    } catch (err) {
      console.error('[MarketNews] Fetch error:', err);
      setError(language === 'tr' ? 'Haberler yüklenemedi' : 'Failed to load news');
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, language]);

  // Fetch on mount and when category changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh when global refresh is triggered
  useEffect(() => {
    if (refreshKey > 0) {
      fetchData();
    }
  }, [refreshKey, fetchData]);

  // Mark as loaded for initial loading screen
  useEffect(() => {
    if (!isLoading && !hasMarkedLoaded.current) {
      markLoaded(DATA_SOURCE_IDS.NEWS);
      hasMarkedLoaded.current = true;
    }
  }, [isLoading, markLoaded]);

  const handleNewsClick = (url: string) => {
    if (onNewsClick) {
      onNewsClick(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const categories: { key: NewsCategory; label: string }[] = [
    { key: 'general', label: t('newsGeneral') },
    { key: 'crypto', label: t('newsCrypto') },
    { key: 'forex', label: t('newsForex') },
    { key: 'merger', label: t('newsMerger') },
  ];

  return (
    <Card
      title={t('marketNews')}
      headerAction={
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            disabled={isLoading}
            className="p-1.5 rounded text-gray-500 hover:text-gray-300 transition-all"
            title="Refresh"
          >
            <IoRefresh className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <IoNewspaper className="text-neon-cyan" />
        </div>
      }
    >
      <div className="space-y-3">
        {/* Category Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((cat) => {
            const styles = categoryStyles[cat.key];
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-2.5 py-1 text-[10px] font-medium rounded border whitespace-nowrap transition-all ${
                  isActive
                    ? `${styles.bg} ${styles.text} ${styles.border}`
                    : 'bg-terminal-border/20 text-gray-500 border-terminal-border/50 hover:text-gray-300'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* News List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
          {isLoading && news.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin"></div>
            </div>
          ) : error && news.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-neon-red text-sm mb-2">{error}</div>
              <button
                onClick={() => fetchData()}
                className="text-xs text-neon-cyan hover:underline"
              >
                {language === 'tr' ? 'Tekrar dene' : 'Try again'}
              </button>
            </div>
          ) : news.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {t('noNews')}
            </div>
          ) : (
            news.map((item) => {
              const sentiment = getNewsSentiment(item.headline);
              const timeAgo = formatNewsTime(item.datetime);

              return (
                <div
                  key={item.id}
                  onClick={() => handleNewsClick(item.url)}
                  className="group p-3 rounded border border-terminal-border/50 bg-terminal-border/10
                    hover:border-neon-cyan/30 hover:bg-terminal-border/20 cursor-pointer transition-all"
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    {item.image && (
                      <div className="flex-shrink-0 w-16 h-12 rounded overflow-hidden bg-terminal-border/30">
                        <img
                          src={item.image}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm text-white font-medium line-clamp-2 group-hover:text-neon-cyan transition-colors">
                          {item.headline}
                        </h4>
                        <div className="flex-shrink-0">
                          {sentimentIcons[sentiment]}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-gray-500 uppercase font-medium">
                          {item.source}
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="text-neon-amber font-mono">
                          {timeAgo}
                        </span>
                        {item.related && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span className="text-neon-cyan">
                              {item.related.split(',')[0]}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Summary preview */}
                      {item.summary && (
                        <p className="text-[11px] text-gray-500 mt-1.5 line-clamp-2">
                          {item.summary}
                        </p>
                      )}
                    </div>

                    {/* External link icon */}
                    <IoOpenOutline className="flex-shrink-0 text-gray-600 group-hover:text-neon-cyan transition-colors" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        {news.length > 0 && (
          <div className="pt-2 border-t border-terminal-border text-center">
            <span className="text-[10px] text-gray-600">
              {language === 'tr' ? 'Finnhub tarafından sağlanmaktadır' : 'Powered by Finnhub'}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
