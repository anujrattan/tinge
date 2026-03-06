import React, { useState } from 'react';
import { Category } from '../../../types';
import { Button, Card } from '../../../components/ui';
import { Toggle } from '../../../components/Toggle';
import { TagIcon, PlusIcon, EditIcon, TrashIcon } from '../../../components/icons';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';

interface CategoriesViewProps {
  categories: Category[];
  loading: boolean;
  failedCategoryImages: Set<string>;
  onImageError: (categoryId: string) => void;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  loading,
  failedCategoryImages,
  onImageError,
  onEdit,
  onDelete,
  onAddNew,
}) => {
  const { showToast } = useToast();
  const [togglingCategory, setTogglingCategory] = useState<string | null>(null);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);

  // Sync local categories when prop changes
  React.useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const handleToggleActive = async (category: Category) => {
    try {
      setTogglingCategory(category.id);
      const updated = await api.toggleCategoryActive(category.id);
      // Update the category in the local list
      setLocalCategories(localCategories.map(cat =>
        cat.id === category.id ? updated : cat
      ));
      // Use the updated category's isActive value for the toast message
      const isNowActive = updated.isActive !== false;
      showToast(
        isNowActive 
          ? `${category.name} enabled` 
          : `${category.name} disabled`,
        'success'
      );
    } catch (error: any) {
      console.error('Error toggling category:', error);
      showToast(error.message || 'Failed to update category status', 'error');
    } finally {
      setTogglingCategory(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-48 bg-white/10 rounded-lg mb-4"></div>
            <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-white/10 rounded w-1/2"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (localCategories.length === 0) {
    return (
      <Card className="p-12 text-center">
        <TagIcon className="w-16 h-16 mx-auto mb-4 text-brand-secondary opacity-50" />
        <h3 className="text-xl font-semibold text-brand-primary mb-2">No Categories Yet</h3>
        <p className="text-brand-secondary mb-6">Create your first category to organize your products</p>
        <Button onClick={onAddNew} className="bg-gradient-to-r from-purple-500 to-pink-500">
          <PlusIcon className="w-5 h-5 inline mr-2" />
          Create Category
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {localCategories.map(category => {
        const hasImageError = failedCategoryImages.has(category.id);
        const shouldShowImage = category.imageUrl && !hasImageError;
        
        return (
          <Card key={category.id} className="group overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-white/10">
            <div className="relative h-48 overflow-hidden">
              {shouldShowImage ? (
                <img 
                  src={category.imageUrl} 
                  alt={category.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={() => onImageError(category.id)}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400 text-xs">No image</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-xs font-medium">{category.slug}</p>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-display font-bold text-brand-primary mb-2">{category.name}</h3>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <span className="text-xs text-brand-secondary font-mono">{category.slug}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-brand-secondary">Active</span>
                    <Toggle
                      checked={category.isActive !== false}
                      onChange={() => handleToggleActive(category)}
                      disabled={togglingCategory === category.id}
                      label={`Toggle ${category.name} active status`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      onClick={() => onEdit(category)}
                      className="p-2 hover:bg-purple-500/10"
                      aria-label="Edit category"
                    >
                      <EditIcon className="w-4 h-4 text-brand-secondary hover:text-purple-400" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => onDelete(category.id)}
                      className="p-2 hover:bg-red-500/10"
                      aria-label="Delete category"
                    >
                      <TrashIcon className="w-4 h-4 text-brand-secondary hover:text-red-400" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

