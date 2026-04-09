import React, { useState, useEffect } from 'react';
import { Collection } from '../../../types';
import { Button, Card } from '../../../components/ui';
import { Toggle } from '../../../components/Toggle';
import { TagIcon, PlusIcon, EditIcon, TrashIcon } from '../../../components/icons';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';

interface CollectionsViewProps {
  collections: Collection[];
  loading: boolean;
  failedCollectionImages: Set<string>;
  onImageError: (collectionId: string) => void;
  onEdit: (collection: Collection) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  collections,
  loading,
  failedCollectionImages,
  onImageError,
  onEdit,
  onDelete,
  onAddNew,
}) => {
  const { showToast } = useToast();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [localCollections, setLocalCollections] = useState<Collection[]>(collections);

  useEffect(() => {
    setLocalCollections(collections);
  }, [collections]);

  const handleToggleActive = async (collection: Collection) => {
    try {
      setTogglingId(collection.id);
      const updated = await api.toggleCollectionActive(collection.id);
      setLocalCollections((prev) =>
        prev.map((c) => (c.id === collection.id ? updated : c)),
      );
      const isNowActive = updated.isActive !== false;
      showToast(
        isNowActive
          ? `${collection.name} enabled`
          : `${collection.name} disabled`,
        'success',
      );
    } catch (error: any) {
      console.error('Error toggling collection:', error);
      showToast(error.message || 'Failed to update collection status', 'error');
    } finally {
      setTogglingId(null);
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

  if (localCollections.length === 0) {
    return (
      <Card className="p-12 text-center">
        <TagIcon className="w-16 h-16 mx-auto mb-4 text-brand-secondary opacity-50" />
        <h3 className="text-xl font-semibold text-brand-primary mb-2">
          No Collections Yet
        </h3>
        <p className="text-brand-secondary mb-6">
          Create your first collection to merchandise your products
        </p>
        <Button
          onClick={onAddNew}
          className="bg-gradient-to-r from-purple-500 to-pink-500"
        >
          <PlusIcon className="w-5 h-5 inline mr-2" />
          Create Collection
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {localCollections.map((collection) => {
        const hasImageError = failedCollectionImages.has(collection.id);
        const shouldShowImage = collection.imageUrl && !hasImageError;

        return (
          <Card
            key={collection.id}
            className="group overflow-visible hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-white/10"
          >
            <div className="relative h-48 overflow-hidden">
              {shouldShowImage ? (
                <img
                  src={collection.imageUrl}
                  alt={collection.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={() => onImageError(collection.id)}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400 text-xs">
                    No image
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-xs font-medium">
                  {collection.slug}
                </p>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <h3 className="text-xl font-display font-bold text-brand-primary mb-1">
                {collection.name}
              </h3>
              {collection.description && (
                <p className="text-sm text-brand-secondary line-clamp-2">
                  {collection.description}
                </p>
              )}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <span className="block text-xs text-brand-secondary font-mono break-words">
                  {collection.slug}
                </span>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-brand-secondary">Active</span>
                    <Toggle
                      checked={collection.isActive !== false}
                      onChange={() => handleToggleActive(collection)}
                      disabled={togglingId === collection.id}
                      label={`Toggle ${collection.name} active status`}
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      onClick={() => onEdit(collection)}
                      className="p-2 hover:bg-purple-500/10 rounded-md"
                      aria-label="Edit collection"
                    >
                      <EditIcon className="w-4 h-4 text-brand-secondary hover:text-purple-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => onDelete(collection.id)}
                      className="p-2 hover:bg-red-500/10 rounded-md"
                      aria-label="Delete collection"
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

