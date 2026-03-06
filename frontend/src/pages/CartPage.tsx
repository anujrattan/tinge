import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { TrashIcon, PlusIcon, MinusIcon } from '../components/icons';
import { ProductCard } from '../components/ProductCard';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/currency';
import api from '../services/api';
import { getComplementSlugsForCategories } from '../utils/recommendationCategories';
import type { Product } from '../types';

const RECOMMENDATIONS_LIMIT = 4;
const WISHLIST_DISPLAY_LIMIT = 4;

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, currency, wishlist } = useApp();
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [loadingWishlist, setLoadingWishlist] = useState(false);

  // Fetch upsell recommendations from complement categories (exclude cart items)
  useEffect(() => {
    if (cart.length === 0) {
      setRecommendedProducts([]);
      return;
    }
    const cartIds = new Set(cart.map(item => item.id));
    const categorySlugs = [...new Set(cart.map(item => item.category).filter(Boolean))] as string[];
    const complementSlugs = getComplementSlugsForCategories(categorySlugs);
    if (complementSlugs.length === 0) {
      setRecommendedProducts([]);
      return;
    }
    let cancelled = false;
    setLoadingRecommendations(true);
    (async () => {
      try {
        const results = await Promise.all(complementSlugs.map(slug => api.getProducts(slug)));
        const merged = results.flat();
        const seen = new Set<string>();
        const out: Product[] = [];
        for (const p of merged) {
          if (cartIds.has(p.id) || seen.has(p.id)) continue;
          seen.add(p.id);
          out.push(p);
          if (out.length >= RECOMMENDATIONS_LIMIT) break;
        }
        if (!cancelled) setRecommendedProducts(out);
      } catch {
        if (!cancelled) setRecommendedProducts([]);
      } finally {
        if (!cancelled) setLoadingRecommendations(false);
      }
    })();
    return () => { cancelled = true; };
  }, [cart]);

  // Fetch wishlist product details for "From your wishlist" section
  useEffect(() => {
    if (wishlist.length === 0) {
      setWishlistProducts([]);
      return;
    }
    const ids = wishlist.slice(0, WISHLIST_DISPLAY_LIMIT);
    let cancelled = false;
    setLoadingWishlist(true);
    (async () => {
      try {
        const products = await Promise.all(
          ids.map(id => api.getProductById(id).then(p => p).catch(() => null))
        );
        const valid = products.filter((p): p is Product => p != null);
        if (!cancelled) setWishlistProducts(valid);
      } catch {
        if (!cancelled) setWishlistProducts([]);
      } finally {
        if (!cancelled) setLoadingWishlist(false);
      }
    })();
    return () => { cancelled = true; };
  }, [wishlist]);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  // Prices shown to customers are tax-inclusive. We don't add extra tax on top.
  const total = subtotal;

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-brand-primary">Your Cart is Empty</h1>
        <p className="mt-4 text-brand-secondary">Looks like you haven't added anything to your cart yet.</p>
        <Button onClick={() => navigate('/categories')} className="mt-6">Continue Shopping</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-8 text-brand-primary">Shopping Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <ul role="list" className="divide-y divide-white/10 border-t border-b border-white/10">
            {cart.map(item => (
              <li key={item.id} className="flex py-6">
                <div className="flex-shrink-0 w-24 h-24 border border-white/10 rounded-md overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="ml-4 flex-1 flex flex-col">
                  <div>
                    <div className="flex justify-between text-base font-medium text-brand-primary">
                      <h3>{item.name}</h3>
                      <p className="ml-4">{formatCurrency(item.price * item.quantity, currency)}</p>
                    </div>
                    <p className="mt-1 text-sm text-brand-secondary">{item.selectedColor} / {item.selectedSize}</p>
                  </div>
                  <div className="flex-1 flex items-end justify-between text-sm">
                    <div className="flex items-center border border-white/20 rounded-md">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="p-2 disabled:opacity-50">
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      <p className="px-3 text-brand-primary">{item.quantity}</p>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2">
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex">
                      <button onClick={() => removeFromCart(item.id)} type="button" className="font-medium text-red-500 hover:text-red-400 flex items-center">
                        <TrashIcon className="w-4 h-4 mr-1" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-brand-surface p-6 rounded-lg shadow-sm border border-white/10">
            <h2 className="text-lg font-medium text-brand-primary">Order Summary</h2>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-brand-secondary">Subtotal</p>
                <p className="text-sm font-medium text-brand-primary">{formatCurrency(subtotal, currency)}</p>
              </div>
              <p className="text-xs text-brand-secondary">
                Prices shown are inclusive of all applicable GST.
              </p>
              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <p className="text-base font-medium text-brand-primary">Order total</p>
                <p className="text-base font-medium text-brand-primary">{formatCurrency(total, currency)}</p>
              </div>
            </div>
            <Button onClick={() => navigate('/checkout')} className="w-full mt-6">
              Proceed to Checkout
            </Button>
          </div>
        </div>
      </div>

      {/* Recommendations (complement categories, exclude cart) */}
      {(loadingRecommendations || recommendedProducts.length > 0) && (
        <div className="mt-16 border-t border-white/10 pt-12">
          <h2 className="text-2xl font-display font-bold tracking-tight text-brand-primary">
            You may also like
          </h2>
          {loadingRecommendations ? (
            <p className="mt-4 text-brand-secondary">Loading recommendations...</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 gap-x-6">
              {recommendedProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* From your wishlist */}
      {(loadingWishlist || wishlistProducts.length > 0) && (
        <div className="mt-16 border-t border-white/10 pt-12">
          <h2 className="text-2xl font-display font-bold tracking-tight text-brand-primary">
            From your wishlist
          </h2>
          {loadingWishlist ? (
            <p className="mt-4 text-brand-secondary">Loading wishlist...</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 gap-x-6">
              {wishlistProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
