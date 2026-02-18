'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Loading';
import { getInvestmentNews } from '@/lib/api';
import { NewsArticle } from '@/types';
import { formatDate } from '@/lib/utils';

interface StockNewsProps {
  query: string;
}

export function StockNews({ query }: StockNewsProps) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await getInvestmentNews(query, 5);
        setNews(data.articles);
      } catch (error) {
        console.error('Failed to fetch news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [query]);

  if (loading) {
    return (
      <Card>
        <CardHeader title="관련 뉴스" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="관련 뉴스" subtitle={`"${query}" 관련 최신 뉴스`} />

      {news.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
          관련 뉴스가 없습니다.
        </p>
      ) : (
        <div className="space-y-4">
          {news.map((article, index) => (
            <a
              key={index}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2">
                    {article.title}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {article.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400">{article.source}</span>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <span className="text-xs text-gray-400">
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
                <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
