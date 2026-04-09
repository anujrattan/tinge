import React from 'react';
import { Product, Category } from '../../../types';
import { Button, Card } from '../../../components/ui';
import { PackageIcon, PlusIcon, EditIcon, TrashIcon, TagIcon, SearchIcon } from '../../../components/icons';
import { formatCurrency, CurrencyCode } from '../../../utils/currency';
import { toAnchoredDisplayPrice } from '../../../utils/pricing';

interface ProductsViewProps {
  products: Product[];
  categories: Category[];
  loading: boolean;
  currency: CurrencyCode;
  failedProductImages: Set<string>;
  onImageError: (productId: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: (checked: boolean) => void;
  onBulkDelete?: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  loading,
  currency,
  failedProductImages,
  onImageError,
  onEdit,
  onDelete,
  onAddNew,
  searchQuery = '',
  onSearchChange,
  selectedIds = new Set(),
  onToggleSelect,
  onSelectAll,
  onBulkDelete,
}) => {
  const hasSelection = selectedIds.size > 0;
  const allFilteredSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const isIndeterminate = hasSelection && !allFilteredSelected;
  if (loading) {
    return (
      <Card className="p-8">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="h-16 w-16 bg-white/10 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-white/10 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-white/10 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="p-12 text-center">
        <PackageIcon className="w-16 h-16 mx-auto mb-4 text-brand-secondary opacity-50" />
        <h3 className="text-xl font-semibold text-brand-primary mb-2">
          {searchQuery.trim() ? 'No products match your search' : 'No Products Yet'}
        </h3>
        <p className="text-brand-secondary mb-6">
          {searchQuery.trim() ? 'Try a different search term.' : 'Add your first product to start selling'}
        </p>
        {!searchQuery.trim() && (
          <Button onClick={onAddNew} className="bg-gradient-to-r from-purple-500 to-pink-500">
            <PlusIcon className="w-5 h-5 inline mr-2" />
            Create Product
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-white/10">
      <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search products by name or description..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-brand-primary placeholder-brand-secondary focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>
        {hasSelection && onBulkDelete && (
          <Button
            variant="secondary"
            onClick={onBulkDelete}
            className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30"
          >
            <TrashIcon className="w-4 h-4 mr-2" />
            Delete selected ({selectedIds.size})
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-gradient-to-r from-purple-500/10 to-pink-500/10">
            <tr>
              {onToggleSelect && onSelectAll && (
                <th className="px-4 py-4 text-center w-12">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
                    aria-label="Select all"
                  />
                </th>
              )}
              <th className="px-6 py-4 text-center text-xs font-semibold text-brand-primary uppercase tracking-wider">Product</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-brand-primary uppercase tracking-wider">Price</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-brand-primary uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-brand-primary uppercase tracking-wider">Variants</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-brand-primary uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-brand-surface divide-y divide-white/10">
            {products.map((product, index) => (
              <tr 
                key={product.id} 
                className={`hover:bg-white/5 transition-colors group ${selectedIds.has(product.id) ? 'bg-purple-500/10' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {onToggleSelect && (
                  <td className="px-4 py-4 text-center w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => onToggleSelect(product.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500"
                      aria-label={`Select ${product.title || product.name}`}
                    />
                  </td>
                )}
                <td className="px-6 py-4 text-left">
                  <div className="flex items-center justify-start gap-4">
                    <div className="flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 border-white/10 group-hover:border-purple-500/50 transition-colors">
                      {product.imageUrl && !failedProductImages.has(product.id) ? (
                        <img 
                          className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" 
                          src={product.imageUrl} 
                          alt={product.name}
                          onError={() => onImageError(product.id)}
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-500 dark:text-gray-400 text-xs">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-brand-primary group-hover:text-purple-400 transition-colors">
                        {product.name}
                      </div>
                      <div className="text-xs text-brand-secondary mt-1 line-clamp-2 max-w-md">
                        {product.description}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-left">
                  <div className="flex items-baseline justify-start gap-2">
                    <span className="text-lg font-bold text-pink-500">
                      {formatCurrency(toAnchoredDisplayPrice(product.price ?? 0), currency, { showDecimals: false })}
                    </span>
                    {product.originalPrice && (
                      <span className="text-xs text-brand-secondary line-through">
                        {formatCurrency(toAnchoredDisplayPrice(product.originalPrice), currency, { showDecimals: false })}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center justify-center gap-1 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium">
                    <TagIcon className="w-3 h-3" />
                    {categories.find(c => c.slug === product.category)?.name || product.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {product.variants && (
                    <span className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                      {product.variants.sizes?.length || 0} sizes{product.color ? ` · ${product.color}` : ''}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button 
                      variant="ghost" 
                      onClick={() => onEdit(product)}
                      className="p-2 hover:bg-purple-500/10"
                      aria-label="Edit product"
                    >
                      <EditIcon className="w-4 h-4 text-brand-secondary group-hover:text-purple-400" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => onDelete(product.id)}
                      className="p-2 hover:bg-red-500/10"
                      aria-label="Delete product"
                    >
                      <TrashIcon className="w-4 h-4 text-brand-secondary group-hover:text-red-400" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

