import React, { useState, useEffect } from 'react';
import { StarIcon } from './icons';
import api from '../services/api';

interface RatingBreakdownProps {
  productId: string;
}

export const RatingBreakdown: React.FC<RatingBreakdownProps> = ({
  productId,
}) => {
  const [ratingData, setRatingData] = useState<{
    averageRating: number;
    totalRatings: number;
    breakdown: {
      "5": number;
      "4": number;
      "3": number;
      "2": number;
      "1": number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        setLoading(true);
        const response = await api.getProductRatings(productId);
        if (response.success) {
          setRatingData({
            averageRating: response.averageRating || 0,
            totalRatings: response.totalRatings || 0,
            breakdown: response.breakdown || {
              "5": 0,
              "4": 0,
              "3": 0,
              "2": 0,
              "1": 0,
            },
          });
        }
      } catch (error) {
        console.error('Failed to fetch ratings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchRatings();
    }
  }, [productId]);

  if (loading) {
    return (
      <div className="bg-brand-surface rounded-lg border border-white/10 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (!ratingData || ratingData.totalRatings === 0) {
    return (
      <div className="bg-brand-surface rounded-lg border border-white/10 p-6">
        <h3 className="text-lg font-bold text-brand-primary mb-2">
          Customer Ratings
        </h3>
        <p className="text-brand-secondary">
          No ratings yet. Be the first to rate this product!
        </p>
      </div>
    );
  }

  const { averageRating, totalRatings, breakdown } = ratingData;

  const getPercentage = (count: number): number => {
    return totalRatings > 0 ? (count / totalRatings) * 100 : 0;
  };

  return (
    <div className="bg-brand-surface rounded-lg border border-white/10 p-6">
      <h3 className="text-lg font-bold text-brand-primary mb-4">
        Customer Ratings
      </h3>

      {/* Average Rating Display */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
        <div className="text-center">
          <div className="text-4xl font-bold text-brand-primary">
            {averageRating.toFixed(1)}
          </div>
          <div className="text-sm text-brand-secondary mt-1">
            out of 5
          </div>
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

      {/* Rating Breakdown Bars */}
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = breakdown[stars.toString() as keyof typeof breakdown];
          const percentage = getPercentage(count);
          
          return (
            <div key={stars} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-12 flex-shrink-0">
                <span className="text-sm font-medium text-brand-primary">
                  {stars}
                </span>
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
