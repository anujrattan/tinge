import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { Product } from '../types';
import { Button } from '../components/ui';
import { HeartIcon, ShoppingBagIcon, TrashIcon, LinkIcon } from '../components/icons';
import { formatCurrency } from '../utils/currency';
import { getCssColorValue, getColorName } from '../utils/colorUtils';

export const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const { wishlist, removeFromWishlist, addToCart, currency, isAuthenticated, loadWishlist } = useApp();
  const { showToast } = useToast();
  
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  const [sharingEnabled, setSharingEnabled] = useState(false);

  // Check if Web Share API is available
  useEffect(() => {
    setSharingEnabled(typeof navigator.share !== 'undefined' || typeof navigator.clipboard !== 'undefined');
  }, []);

  // Load wishlist items
  useEffect(() => {
    const fetchWishlistItems = async () => {
      setLoading(true);
      try {
        if (isAuthenticated) {
          // Load from API for authenticated users
          const response = await api.getWishlist();
          const items = response.items
            .map((item: any) => item.product)
            .filter((product: Product | null) => product !== null);
          setWishlistItems(items);
        } else {
          // Load from localStorage for guests
          const productPromises = wishlist.map(id => api.getProductById(id));
          const products = await Promise.all(productPromises);
          const validProducts = products.filter((p): p is Product => p !== undefined);
          setWishlistItems(validProducts);
        }
      } catch (error) {
        console.error('Failed to load wishlist items:', error);
        showToast('Failed to load wishlist', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchWishlistItems();
  }, [wishlist, isAuthenticated, showToast]);

  const handleRemoveFromWishlist = async (productId: string) => {
    setRemovingItems(prev => new Set(prev).add(productId));
    try {
      await removeFromWishlist(productId);
      setWishlistItems(prev => prev.filter(item => item.id !== productId));
      showToast('Removed from wishlist', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to remove from wishlist', 'error');
    } finally {
      setRemovingItems(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleMoveToCart = async (product: Product) => {
    try {
      // Add to cart with default variant
      addToCart({
        ...product,
        quantity: 1,
        selectedSize: product.variants?.sizes?.[0] || '',
        selectedColor: product.color || '',
      });
      
      // Remove from wishlist
      await removeFromWishlist(product.id);
      setWishlistItems(prev => prev.filter(item => item.id !== product.id));
      
      showToast('Moved to cart', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to move to cart', 'error');
    }
  };

  const handleShareWishlist = async () => {
    const wishlistUrl = `${window.location.origin}/wishlist?items=${wishlist.join(',')}`;
    
    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Wishlist - Luxe Threads',
          text: `Check out my wishlist with ${wishlist.length} items!`,
          url: wishlistUrl,
        });
        showToast('Wishlist shared successfully', 'success');
        return;
      } catch (error: any) {
        // User cancelled share or error occurred
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    }
    
    // Fallback to Clipboard API (desktop)
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(wishlistUrl);
        showToast('Wishlist link copied to clipboard', 'success');
        return;
      } catch (error) {
        console.error('Clipboard write failed:', error);
      }
    }
    
    // Final fallback: manual copy
    try {
      const textArea = document.createElement('textarea');
      textArea.value = wishlistUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('Wishlist link copied', 'success');
    } catch (error) {
      showToast('Failed to share wishlist', 'error');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          <p className="mt-4 text-brand-secondary">Loading your wishlist...</p>
        </div>
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fadeIn">
        <div className="max-w-md mx-auto text-center py-20">
          <HeartIcon className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-6" />
          <h2 className="text-2xl font-bold text-brand-primary mb-3">
            Your wishlist is empty
          </h2>
          <p className="text-brand-secondary mb-8">
            Start adding items you love to your wishlist!
          </p>
          <Button onClick={() => navigate('/categories')} className="px-8">
            Browse Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-brand-primary">
            My Wishlist
          </h1>
          <p className="text-brand-secondary mt-1">
            {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        
        {sharingEnabled && wishlistItems.length > 0 && (
          <Button 
            onClick={handleShareWishlist}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LinkIcon className="w-4 h-4" />
            Share Wishlist
          </Button>
        )}
      </div>

      {/* Wishlist Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {wishlistItems.map((product) => {
          const sellingPrice = parseFloat(String(product.selling_price || 0));
          const discountPercentage = product.discount_percentage ? parseFloat(String(product.discount_percentage)) : 0;
          const onSale = product.on_sale === true;
          const saleDiscountPercentage = onSale && product.sale_discount_percentage ? parseFloat(String(product.sale_discount_percentage)) : 0;
          
          // Calculate final price
          let finalPrice = sellingPrice;
          if (discountPercentage > 0) {
            finalPrice = finalPrice * (1 - discountPercentage / 100);
          }
          if (saleDiscountPercentage > 0) {
            finalPrice = finalPrice * (1 - saleDiscountPercentage / 100);
          }
          
          const hasDiscount = discountPercentage > 0 || saleDiscountPercentage > 0;
          const isRemoving = removingItems.has(product.id);

          return (
            <div 
              key={product.id}
              className={`bg-brand-surface rounded-lg border border-white/10 shadow-md hover:shadow-xl transition-all ${
                isRemoving ? 'opacity-50' : ''
              }`}
            >
              {/* Product Image */}
              <div 
                className="relative aspect-[4/3] cursor-pointer group"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <img
                  src={product.main_image_url || product.imageUrl}
                  alt={product.title || product.name}
                  className="w-full h-full object-cover rounded-t-lg group-hover:opacity-90 transition-opacity"
                  loading="lazy"
                  decoding="async"
                />
                {onSale && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    SALE
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="p-4">
                <h3 
                  className="text-base font-bold text-brand-primary truncate cursor-pointer hover:text-brand-accent"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {product.title || product.name}
                </h3>
                
                {/* Price */}
                <div className="mt-2">
                  <p className="text-xl font-bold text-pink-500">
                    {formatCurrency(finalPrice, currency)}
                  </p>
                  {hasDiscount && (
                    <p className="text-sm text-brand-secondary line-through">
                      {formatCurrency(sellingPrice, currency)}
                    </p>
                  )}
                </div>

                {product.color && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-brand-secondary">Color:</span>
                    <span
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: getCssColorValue(product.color) }}
                      title={getColorName(product.color)}
                    />
                    <span className="text-xs text-brand-secondary">{getColorName(product.color)}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => handleMoveToCart(product)}
                    disabled={isRemoving}
                    className="flex-1 flex items-center justify-center gap-2 text-sm py-2"
                  >
                    <ShoppingBagIcon className="w-4 h-4" />
                    Add to Cart
                  </Button>
                  <button
                    onClick={() => handleRemoveFromWishlist(product.id)}
                    disabled={isRemoving}
                    className="p-2 rounded-lg border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove from wishlist"
                    aria-label="Remove from wishlist"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Message */}
      <div className="mt-8 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
        <p className="text-sm text-brand-secondary">
          <strong className="text-brand-primary">Tip:</strong> Items in your wishlist will be saved 
          {isAuthenticated ? ' to your account' : ' in your browser'} so you can come back to them anytime!
        </p>
      </div>
    </div>
  );
};
