import React, { useState, useEffect, useRef } from 'react';
import { StarIcon } from './icons';
import api from '../services/api';

interface RatingData {
  averageRating: number;
  totalRatings: number;
  breakdown: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
}

interface RatingBreakdownProps {
  productId: string;
}

const EMPTY_BREAKDOWN: RatingData['breakdown'] = {
  '5': 0,
  '4': 0,
  '3': 0,
  '2': 0,
  '1': 0,
};

export const RatingBreakdown: React.FC<RatingBreakdownProps> = ({ productId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<Map<string, RatingData>>(new Map());
  const [isInView, setIsInView] = useState(false);
  const [ratingData, setRatingData] = useState<RatingData | null>(null);
  const [loadedForProductId, setLoadedForProductId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready'>('idle');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px', threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!productId || !isInView) return;

    const cached = cacheRef.current.get(productId);
    if (cached) {
      setRatingData(cached);
      setLoadedForProductId(productId);
      setStatus('ready');
      return;
    }

    let cancelled = false;
    setRatingData(null);
    setLoadedForProductId(null);
    setStatus('loading');

    const fetchRatings = async () => {
      try {
        const response = await api.getProductRatings(productId);
        if (cancelled) return;

        if (response.success) {
          const data: RatingData = {
            averageRating: response.averageRating || 0,
            totalRatings: response.totalRatings || 0,
            breakdown: response.breakdown || EMPTY_BREAKDOWN,
          };
          cacheRef.current.set(productId, data);
          setRatingData(data);
        } else {
          setRatingData(null);
        }
        setLoadedForProductId(productId);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch ratings:', error);
          setRatingData(null);
          setLoadedForProductId(productId);
        }
      } finally {
        if (!cancelled) setStatus('ready');
      }
    };

    fetchRatings();
    return () => {
      cancelled = true;
    };
  }, [productId, isInView]);

  if (!isInView) {
    return <div ref={containerRef} className="min-h-[120px]" aria-hidden />;
  }

  const isCurrentProduct = loadedForProductId === productId;
  const showSkeleton = status !== 'ready' || !isCurrentProduct;

  if (showSkeleton) {
    return (
      <div ref={containerRef} className="bg-brand-surface rounded-lg border border-white/10 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        </div>
      </div>
    );
  }

  if (!ratingData || !isCurrentProduct || ratingData.totalRatings === 0) {
    return (
      <div ref={containerRef} className="bg-brand-surface rounded-lg border border-white/10 p-6">
        <h3 className="text-lg font-bold text-brand-primary mb-2">Customer Ratings</h3>
        <p className="text-brand-secondary">
          No ratings yet. Be the first to rate this product!
        </p>
      </div>
    );
  }

  const { averageRating, totalRatings, breakdown } = ratingData;

  const getPercentage = (count: number): number =>
    totalRatings > 0 ? (count / totalRatings) * 100 : 0;

  return (
    <div ref={containerRef} className="bg-brand-surface rounded-lg border border-white/10 p-6">
      <h3 className="text-lg font-bold text-brand-primary mb-4">Customer Ratings</h3>

      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
        <div className="text-center">
          <div className="text-4xl font-bold text-brand-primary">
            {averageRating.toFixed(1)}
          </div>
          <div className="text-sm text-brand-secondary mt-1">out of 5</div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(averageRating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
                filled={star <= Math.round(averageRating)}
              />
            ))}
          </div>
          <div className="text-sm text-brand-secondary">
            {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = breakdown[stars.toString() as keyof typeof breakdown];
          const percentage = getPercentage(count);

          return (
            <div key={stars} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-12 flex-shrink-0">
                <span className="text-sm font-medium text-brand-primary">{stars}</span>
                <StarIcon className="w-3 h-3 text-yellow-400 fill-yellow-400" filled />
              </div>

              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="w-16 text-right text-sm text-brand-secondary">
                {count} ({percentage.toFixed(0)}%)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
