'use client';

import { useEffect, useState } from 'react';
import { Newspaper, ExternalLink } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Loading';
import { getInvestmentNews } from '@/lib/api';
import { NewsArticle } from '@/types';
import { formatDate, getSentimentColor, classNames } from '@/lib/utils';

export function NewsWidget() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await getInvestmentNews('시장 전망', 5);
        setNews(data.articles);
      } catch (error) {
        console.error('Failed to fetch news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader title="투자 뉴스" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0">
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="투자 뉴스"
        subtitle="최신 시장 뉴스"
        action={
          <Badge variant="info">
            <Newspaper className="w-3 h-3 mr-1" />
            실시간
          </Badge>
        }
      />

      <div className="space-y-4">
        {news.map((article, index) => (
          <a
            key={index}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 last:pb-0 group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                  {article.title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {article.summary}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {article.source}
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(article.publishedAt)}
                  </span>
                  <Badge
                    variant={
                      article.sentiment === 'positive'
                        ? 'success'
                        : article.sentiment === 'negative'
                        ? 'danger'
                        : 'default'
                    }
                    size="sm"
                  >
                    {article.sentiment === 'positive' && '긍정'}
                    {article.sentiment === 'neutral' && '중립'}
                    {article.sentiment === 'negative' && '부정'}
                  </Badge>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        ))}
      </div>
    </Card>
  );
}
