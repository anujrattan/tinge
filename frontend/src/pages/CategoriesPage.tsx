import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category } from '../types';
import api from '../services/api';
import { ArrowRightIcon } from '../components/icons';

interface BentoGroup {
  large: Category;
  small: Category[];
}

export const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      const data = await api.getCategories();
      setCategories(data);
      setLoading(false);
    };
    fetchCategories();
  }, []);

  const bentoGroups = useMemo(() => {
    const groups: BentoGroup[] = [];
    const remainder: Category[] = [];

    const validCategories = categories.filter(cat =>
      cat && cat.id && cat.name && cat.slug && (cat.imageUrl || (cat as any).image_url)
    );

    for (let i = 0; i < validCategories.length; i += 3) {
      const group = validCategories.slice(i, i + 3);

      if (group.length === 3) {
        const groupIndex = i / 3;
        const hash = group.reduce((acc, cat) => {
          const idNum = parseInt(cat.id) || 0;
          return acc + idNum;
        }, groupIndex);
        const largeIndex = hash % 3;
        const large = group[largeIndex];
        const small = group.filter((_, idx) => idx !== largeIndex);

        if (large) {
          groups.push({ large, small });
        }
      } else {
        remainder.push(...group);
      }
    }

    return { groups, remainder };
  }, [categories]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 animate-fadeIn">
        <div className="mb-12">
          <div className="h-3 w-20 bg-gray-200 dark:bg-white/10 rounded animate-pulse mb-4" />
          <div className="h-9 w-64 bg-gray-200 dark:bg-white/10 rounded animate-pulse mb-3" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
        </div>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
              <div className="md:col-span-7 bg-gray-100 dark:bg-white/5 border border-gray-200/70 dark:border-white/8 animate-pulse h-[400px] md:h-[500px]" />
              <div className="md:col-span-5 flex flex-col gap-4 md:gap-6">
                <div className="bg-gray-100 dark:bg-white/5 border border-gray-200/70 dark:border-white/8 animate-pulse h-[240px] md:h-[242px]" />
                <div className="bg-gray-100 dark:bg-white/5 border border-gray-200/70 dark:border-white/8 animate-pulse h-[240px] md:h-[242px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderCategoryCard = (
    category: Category | null | undefined,
    isLarge: boolean = false,
  ) => {
    if (!category) return null;

    const imageUrl = category.imageUrl || (category as any).image_url || '';
    if (!imageUrl) return null;

    const heightClass = isLarge
      ? 'h-[400px] md:h-[500px]'
      : 'h-[240px] md:h-[242px]';
    const titleSize = isLarge
      ? 'text-3xl md:text-4xl'
      : 'text-xl md:text-2xl';
    const padding = isLarge ? 'p-8' : 'p-6';

    const hasImageError = failedImages.has(category.id);
    const shouldShowImage = imageUrl && !hasImageError;

    return (
      <div
        key={category.id}
        className={`relative group overflow-hidden cursor-pointer border border-gray-200/60 dark:border-white/8 bg-brand-surface ${heightClass}`}
        onClick={() => navigate(`/category/${category.slug}`)}
      >
        {shouldShowImage ? (
          <img
            src={imageUrl}
            alt={category.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={() => {
              setFailedImages(prev => new Set(prev).add(category.id));
            }}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 dark:bg-white/5 flex items-center justify-center">
            <span className="text-brand-secondary text-sm">No image</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent group-hover:from-black/85 transition-all duration-300" />
        <div className={`absolute bottom-0 left-0 right-0 ${padding}`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70 mb-2">
            Category
          </p>
          <h3 className={`${titleSize} font-playfair font-medium text-white leading-tight mb-3`}>
            {category.name}
          </h3>
          <div className="flex items-center gap-2 text-white/90 group-hover:translate-x-1 transition-transform duration-300">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">
              {isLarge ? 'Shop now' : 'Explore'}
            </span>
            <ArrowRightIcon className={isLarge ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 animate-fadeIn pb-16">
      <div className="mb-12 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-secondary mb-3">
          Browse
        </p>
        <h1 className="font-playfair text-3xl md:text-4xl font-medium tracking-tight text-brand-primary">
          Shop by{' '}
          <span className="bg-gradient-to-r from-[#FF7A59] to-[#FFC371] bg-clip-text text-transparent">
            Category
          </span>
        </h1>
        <p className="mt-2 text-brand-secondary font-sans">
          Find the perfect collection for your style.
        </p>
      </div>

      <div className="space-y-4 md:space-y-6">
        {bentoGroups.groups.map((group, groupIndex) => {
          if (!group || !group.large || !group.small || group.small.length === 0) {
            return null;
          }

          const isLargeOnLeft = groupIndex % 2 === 0;

          return (
            <div key={groupIndex} className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
              {isLargeOnLeft ? (
                <>
                  <div className="md:col-span-7">
                    {renderCategoryCard(group.large, true)}
                  </div>
                  <div className="md:col-span-5 flex flex-col gap-4 md:gap-6">
                    {group.small
                      .filter(cat => cat)
                      .map((category) => renderCategoryCard(category, false))}
                  </div>
                </>
              ) : (
                <>
                  <div className="md:col-span-5 flex flex-col gap-4 md:gap-6">
                    {group.small
                      .filter(cat => cat)
                      .map((category) => renderCategoryCard(category, false))}
                  </div>
                  <div className="md:col-span-7">
                    {renderCategoryCard(group.large, true)}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {bentoGroups.remainder.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {bentoGroups.remainder
              .filter(cat => cat)
              .map((category) => renderCategoryCard(category, false))}
          </div>
        )}
      </div>
    </div>
  );
};
