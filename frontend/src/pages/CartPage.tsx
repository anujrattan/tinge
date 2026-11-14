import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import {
  TrashIcon,
  PlusIcon,
  MinusIcon,
  TruckIcon,
  PackageIcon,
  ShieldIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '../components/icons';
import { ProductCard } from '../components/ProductCard';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/currency';
import api from '../services/api';
import { buildComplementMap, getComplementSlugsForCategories } from '../utils/recommendationCategories';
import type { Product } from '../types';

const RECOMMENDATIONS_LIMIT = 4;
const WISHLIST_DISPLAY_LIMIT = 4;
const FREE_SHIPPING_THRESHOLD = 999;

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, currency, wishlist } = useApp();
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [loadingWishlist, setLoadingWishlist] = useState(false);

  // Fetch upsell recommendations — uses DB complement_slugs per category, falls back to static map
  useEffect(() => {
    if (cart.length === 0) {
      setRecommendedProducts([]);
      return;
    }
    let cancelled = false;
    setLoadingRecommendations(true);
    (async () => {
      try {
        // Fetch live categories to get DB-managed complement_slugs
        const categories = await api.getCategories();
        const complementMap = buildComplementMap(categories);

        const cartIds = new Set(cart.map(item => item.id));
        const categorySlugs = [...new Set(cart.map(item => item.category).filter(Boolean))] as string[];
        const complementSlugs = getComplementSlugsForCategories(categorySlugs, complementMap);

        if (complementSlugs.length === 0) {
          if (!cancelled) setRecommendedProducts([]);
          return;
        }

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
  const total = subtotal;
  const freeShippingNeeded = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="font-playfair text-3xl font-medium tracking-tight text-brand-primary">Your Cart is Empty</h1>
        <p className="mt-4 text-brand-secondary">Looks like you haven't added anything to your cart yet.</p>
        <Button onClick={() => navigate('/categories')} className="mt-6">Continue Shopping</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-playfair text-3xl md:text-4xl font-medium tracking-tight mb-6 text-brand-primary">Shopping Cart</h1>

      {/* Free Express Shipping Meter */}
      <div className="mb-8 p-4 sm:p-5 rounded-2xl border border-white/10 bg-brand-surface/70 shadow-sm max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 mb-2.5">
          <span className="font-medium text-brand-primary flex items-center gap-2">
            <TruckIcon className="w-4 h-4 text-[#FF7A59] shrink-0" />
            {freeShippingNeeded > 0
              ? `Add ${formatCurrency(freeShippingNeeded, currency, { showDecimals: false })} more for FREE Express Shipping & Mounting Kit`
              : '🎉 You have unlocked FREE Express Pan-India Delivery & Mounting Hardware!'}
          </span>
          <span className="text-brand-secondary font-mono text-[11px] self-end sm:self-auto">{Math.round(freeShippingProgress)}% achieved</span>
        </div>
        <div className="w-full h-2 rounded-full bg-black/20 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FF7A59] via-[#FF5E62] to-[#FFC371] transition-all duration-500 rounded-full"
            style={{ width: `${freeShippingProgress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <ul role="list" className="divide-y divide-white/10 border-t border-b border-white/10">
            {cart.map(item => (
              <li key={item.id} className="flex py-6">
                <div className="flex-shrink-0 w-24 h-24 border border-white/10 rounded-xl overflow-hidden bg-brand-surface">
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
                      <h3 className="font-playfair text-lg">{item.name}</h3>
                      <p className="ml-4 font-semibold">{formatCurrency(item.price * item.quantity, currency, { showDecimals: false })}</p>
                    </div>
                    <p className="mt-1 text-xs text-brand-secondary">
                      {[item.material?.replace('_', ' '), item.selectedSize].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex-1 flex items-end justify-between text-sm mt-4">
                    <div className="flex items-center border border-white/20 rounded-lg overflow-hidden bg-brand-surface/50">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="p-2 disabled:opacity-50 hover:bg-white/5">
                        <MinusIcon className="w-3.5 h-3.5" />
                      </button>
                      <p className="px-3 text-xs font-mono font-medium text-brand-primary">{item.quantity}</p>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 hover:bg-white/5">
                        <PlusIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex">
                      <button onClick={() => removeFromCart(item.id)} type="button" className="text-xs font-medium text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                        <TrashIcon className="w-3.5 h-3.5" />
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
          <div className="bg-brand-surface p-6 rounded-2xl shadow-sm border border-white/10">
            <h2 className="font-playfair text-xl font-medium tracking-tight text-brand-primary">Order Summary</h2>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-brand-secondary">Subtotal</p>
                <p className="text-sm font-medium text-brand-primary">{formatCurrency(subtotal, currency, { showDecimals: false })}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <p className="text-brand-secondary">Shipping</p>
                <p className="font-medium text-emerald-400">
                  {subtotal >= FREE_SHIPPING_THRESHOLD ? 'FREE' : 'Calculated at checkout'}
                </p>
              </div>
              <p className="text-xs text-brand-secondary/70">
                Prices shown are inclusive of all applicable GST.
              </p>
              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <p className="text-base font-semibold text-brand-primary">Order total</p>
                <p className="text-lg font-bold font-playfair text-brand-primary">{formatCurrency(total, currency, { showDecimals: false })}</p>
              </div>
            </div>
            <Button onClick={() => navigate('/checkout')} className="w-full mt-6 py-3.5 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl font-medium shadow-md">
              Proceed to Checkout
            </Button>

            {/* Trust Guarantees */}
            <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5 text-xs text-brand-secondary">
              <div className="flex items-center gap-2">
                <ShieldIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Safe Transit Guarantee (Free 48h replacement)</span>
              </div>
              <div className="flex items-center gap-2">
                <PackageIcon className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Framed ACP includes the frame. Sunboard does not.</span>
              </div>
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-[#FF7A59] shrink-0" />
                <span>256-bit SSL encrypted secure checkout</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-sell: complement categories */}
      {(loadingRecommendations || recommendedProducts.length > 0) && (
        <div className="mt-16 border-t border-white/10 pt-12">
          <h2 className="font-playfair text-2xl font-medium tracking-tight text-brand-primary">
            Complete the look
          </h2>
          <p className="mt-1 text-sm text-brand-secondary">You might also love these</p>
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
          <h2 className="font-playfair text-2xl font-medium tracking-tight text-brand-primary">
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
