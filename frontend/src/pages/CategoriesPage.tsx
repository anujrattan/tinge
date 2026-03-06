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

  // Organize categories into bento groups with randomization
  const bentoGroups = useMemo(() => {
    const groups: BentoGroup[] = [];
    const remainder: Category[] = [];
    
    // Filter out any invalid categories first
    const validCategories = categories.filter(cat => 
      cat && cat.id && cat.name && cat.slug && (cat.imageUrl || (cat as any).image_url)
    );
    
    // Process categories in groups of 3
    for (let i = 0; i < validCategories.length; i += 3) {
      const group = validCategories.slice(i, i + 3);
      
      if (group.length === 3) {
        // Randomize which one is large (deterministic based on group index and category IDs)
        // Use a simple hash-like function for variety
        const groupIndex = i / 3;
        const hash = group.reduce((acc, cat) => {
          const idNum = parseInt(cat.id) || 0;
          return acc + idNum;
        }, groupIndex);
        const largeIndex = hash % 3;
        const large = group[largeIndex];
        const small = group.filter((_, idx) => idx !== largeIndex);
        
        // Only add group if large category is valid
        if (large) {
          groups.push({ large, small });
        }
      } else {
        // Remainder categories (standalone)
        remainder.push(...group);
      }
    }
    
    return { groups, remainder };
  }, [categories]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fadeIn">
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-7 bg-brand-surface animate-pulse h-[500px] rounded-2xl"></div>
              <div className="md:col-span-5 flex flex-col gap-6">
                <div className="bg-brand-surface animate-pulse h-[242px] rounded-2xl"></div>
                <div className="bg-brand-surface animate-pulse h-[242px] rounded-2xl"></div>
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
    index?: number
  ) => {
    // Safety check: return null if category is invalid
    if (!category) {
      return null;
    }

    // Handle both snake_case and camelCase formats (fallback)
    const imageUrl = category.imageUrl || (category as any).image_url || '';
    
    if (!imageUrl) {
      return null; // Skip rendering if no image URL
    }

    const heightClass = isLarge 
      ? 'h-[400px] md:h-[500px]' 
      : 'h-[240px] md:h-[242px]';
    const textSize = isLarge 
      ? 'text-4xl md:text-5xl' 
      : 'text-2xl md:text-3xl';
    const padding = isLarge ? 'p-8' : 'p-6';
    const description = isLarge 
      ? 'Express yourself with bold designs and premium quality.'
      : null;

    const hasImageError = failedImages.has(category.id);
    const shouldShowImage = imageUrl && !hasImageError;

    return (
      <div
        key={category.id}
        className={`relative group overflow-hidden rounded-2xl cursor-pointer ${heightClass}`}
        onClick={() => navigate(`/category/${category.slug}`)}
      >
        {shouldShowImage ? (
          <img
            src={imageUrl}
            alt={category.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => {
              setFailedImages(prev => new Set(prev).add(category.id));
            }}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400 text-sm">No image</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent group-hover:from-black/90 transition-all duration-300"></div>
        <div className={`absolute bottom-0 left-0 right-0 ${padding}`}>
          <h3 className={`${textSize} font-display font-bold text-white ${isLarge ? 'mb-3' : 'mb-2'}`}>
            {category.name}
          </h3>
          {description && (
            <p className="text-white/90 text-lg mb-4 max-w-md">
              {description}
            </p>
          )}
          <div className="flex items-center gap-2 text-white/90 group-hover:translate-x-2 transition-transform duration-300">
            <span className={isLarge ? 'font-semibold' : 'text-sm font-medium'}>
              {isLarge ? 'Shop Now' : 'Explore'}
            </span>
            <ArrowRightIcon className={isLarge ? 'w-5 h-5' : 'w-4 h-4'} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fadeIn">
      <div className="mb-12 text-left">
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-brand-primary mb-2">
          Shop By <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Category</span>
        </h1>
        <p className="text-brand-secondary font-sans">Find the perfect collection for your style.</p>
      </div>
      
      <div className="space-y-6">
        {/* Bento Groups */}
        {bentoGroups.groups.map((group, groupIndex) => {
          // Safety check: skip if group is invalid
          if (!group || !group.large || !group.small || group.small.length === 0) {
            return null;
          }

          // Alternate layout: odd groups (0, 2, 4...) = large left, even groups (1, 3, 5...) = large right
          const isLargeOnLeft = groupIndex % 2 === 0;
          
          return (
            <div key={groupIndex} className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {isLargeOnLeft ? (
                <>
                  {/* Large Card on Left */}
                  <div className="md:col-span-7">
                    {renderCategoryCard(group.large, true)}
                  </div>
                  
                  {/* Two Small Cards on Right */}
                  <div className="md:col-span-5 flex flex-col gap-6">
                    {group.small
                      .filter(cat => cat) // Filter out any null/undefined categories
                      .map((category, idx) => 
                        renderCategoryCard(category, false, idx)
                      )}
                  </div>
                </>
              ) : (
                <>
                  {/* Two Small Cards on Left */}
                  <div className="md:col-span-5 flex flex-col gap-6">
                    {group.small
                      .filter(cat => cat) // Filter out any null/undefined categories
                      .map((category, idx) => 
                        renderCategoryCard(category, false, idx)
                      )}
                  </div>
                  
                  {/* Large Card on Right */}
                  <div className="md:col-span-7">
                    {renderCategoryCard(group.large, true)}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Standalone Remainder Cards */}
        {bentoGroups.remainder.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bentoGroups.remainder
              .filter(cat => cat) // Filter out any null/undefined categories
              .map((category) => 
                renderCategoryCard(category, false)
              )}
          </div>
        )}
      </div>
    </div>
  );
};