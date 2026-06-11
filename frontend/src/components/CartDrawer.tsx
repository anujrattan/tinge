/**
 * CartDrawer — clean structured slide-in cart
 * Light, editorial layout inspired by premium D2C cart drawers.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, ShieldCheck, RefreshCw, Palette, type LucideIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/currency';
import api from '../services/api';
import { buildComplementMap, getComplementSlugsForCategories } from '../utils/recommendationCategories';
import type { Product } from '../types';

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M5 5l10 10M15 5L5 15" />
  </svg>
);

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M7 2v10M2 7h10" />
  </svg>
);

const MinusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M2 7h10" />
  </svg>
);

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4h12M5 4V2.5A.5.5 0 015.5 2h5a.5.5 0 01.5.5V4M6.5 7.5v5M9.5 7.5v5M3 4l.9 9.1A1 1 0 004.9 14h6.2a1 1 0 001-.9L13 4" />
  </svg>
);

const TRUST_ITEMS: {
  label: string;
  sub: string;
  Icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}[] = [
  { label: 'Free Shipping', sub: 'Across India', Icon: Truck, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { label: 'Razorpay Secure', sub: '100% protected', Icon: ShieldCheck, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
  { label: 'Easy Exchanges', sub: 'Hassle-free', Icon: RefreshCw, iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
  { label: 'Made To Order', sub: 'Premium quality', Icon: Palette, iconBg: 'bg-orange-50', iconColor: 'text-brand-coral' },
];

interface QtyControlProps {
  qty: number;
  onDecrease: () => void;
  onIncrease: () => void;
}

const QtyControl: React.FC<QtyControlProps> = ({ qty, onDecrease, onIncrease }) => (
  <div className="inline-flex items-center rounded-full border border-gray-200 bg-white">
    <button
      onClick={onDecrease}
      disabled={qty <= 1}
      className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors"
      aria-label="Decrease quantity"
    >
      <MinusIcon />
    </button>
    <span className="w-7 text-center text-xs font-medium text-gray-900 tabular-nums">{qty}</span>
    <button
      onClick={onIncrease}
      className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
      aria-label="Increase quantity"
    >
      <PlusIcon />
    </button>
  </div>
);

const RecCard: React.FC<{ product: Product; onClose: () => void }> = ({ product, onClose }) => {
  const navigate = useNavigate();
  const price = product.price ?? product.selling_price;
  const imageUrl = product.imageUrl ?? product.main_image_url;

  return (
    <button
      type="button"
      onClick={() => { navigate(`/product/${product.id}`); onClose(); }}
      className="flex-shrink-0 w-28 text-left group"
    >
      <div className="w-28 h-28 rounded-lg overflow-hidden bg-gray-100 border border-gray-100 mb-2">
        <img
          src={imageUrl}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>
      <p className="text-[11px] font-medium text-gray-900 leading-tight line-clamp-2">{product.title}</p>
      <p className="text-[11px] text-brand-coral font-semibold mt-0.5">
        ₹{Math.round(price).toLocaleString('en-IN')}
      </p>
    </button>
  );
};

const RECS_LIMIT = 4;

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, currency, isCartOpen, closeCart } = useApp();
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [visible, setVisible] = useState(false);
  const [drawerPhase, setDrawerPhase] = useState<'entering' | 'open' | 'leaving'>('entering');
  const scrollRef = useRef<HTMLDivElement>(null);

  const DRAWER_ANIM_MS = 300;

  useEffect(() => {
    if (isCartOpen) {
      setVisible(true);
      setDrawerPhase('entering');
      document.body.style.overflow = 'hidden';
      const t = setTimeout(() => setDrawerPhase('open'), DRAWER_ANIM_MS);
      return () => clearTimeout(t);
    }

    if (visible) {
      setDrawerPhase('leaving');
      document.body.style.overflow = '';
      const t = setTimeout(() => {
        setVisible(false);
        setDrawerPhase('entering');
      }, DRAWER_ANIM_MS);
      return () => clearTimeout(t);
    }
  }, [isCartOpen, visible]);

  useEffect(() => () => { document.body.style.overflow = ''; }, []);

  useEffect(() => {
    if (!isCartOpen || cart.length === 0) {
      setRecommendations([]);
      return;
    }
    let cancelled = false;
    setLoadingRecs(true);
    (async () => {
      try {
        const categories = await api.getCategories();
        const complementMap = buildComplementMap(categories);
        const cartIds = new Set(cart.map(i => i.id));
        const categorySlugs = [...new Set(cart.map(i => i.category).filter(Boolean))] as string[];
        const complementSlugs = getComplementSlugsForCategories(categorySlugs, complementMap);
        if (complementSlugs.length === 0) { if (!cancelled) setRecommendations([]); return; }
        const results = await Promise.all(complementSlugs.map(s => api.getProducts(s)));
        const merged = results.flat();
        const seen = new Set<string>();
        const out: Product[] = [];
        for (const p of merged) {
          if (cartIds.has(p.id) || seen.has(p.id)) continue;
          seen.add(p.id);
          out.push(p);
          if (out.length >= RECS_LIMIT) break;
        }
        if (!cancelled) setRecommendations(out);
      } catch {
        if (!cancelled) setRecommendations([]);
      } finally {
        if (!cancelled) setLoadingRecs(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isCartOpen, cart]);

  useEffect(() => {
    if (!isCartOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCartOpen, closeCart]);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCheckout = useCallback(() => {
    closeCart();
    navigate('/checkout');
  }, [closeCart, navigate]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[110]" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div
        className={`absolute inset-0 z-0 bg-black/45 transition-opacity duration-300 ${
          drawerPhase === 'leaving' ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      <div
        className={`absolute top-0 right-0 z-10 h-full flex flex-col w-full max-w-[480px] bg-white shadow-[-16px_0_48px_rgba(0,0,0,0.12)] ${
          drawerPhase === 'entering'
            ? 'animate-slideInRight'
            : drawerPhase === 'leaving'
            ? 'animate-slideOutRight'
            : ''
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Your cart</h2>
          <button
            onClick={closeCart}
            className="flex items-center justify-center w-9 h-9 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Close cart"
          >
            <CloseIcon />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-base font-medium text-gray-900">Your cart is empty</p>
            <p className="text-sm text-gray-500 mt-1">Add something you love to get started.</p>
            <button
              onClick={() => { closeCart(); navigate('/categories'); }}
              className="mt-6 px-6 py-2.5 rounded-full text-sm font-semibold bg-brand-coral text-white hover:bg-brand-coral-hover transition-colors"
            >
              Shop Collection
            </button>
          </div>
        ) : (
          <>
            {/* Trust strip */}
            <div className="flex-shrink-0 grid grid-cols-4 border-b border-gray-100">
              {TRUST_ITEMS.map((item, i) => (
                <div
                  key={item.label}
                  className={`flex flex-col items-center px-2 py-3 ${i < TRUST_ITEMS.length - 1 ? 'border-r border-gray-100' : ''}`}
                >
                  <span className={`flex items-center justify-center w-7 h-7 rounded-full mb-1.5 ${item.iconBg}`}>
                    <item.Icon className={`w-3.5 h-3.5 ${item.iconColor}`} strokeWidth={2} />
                  </span>
                  <p className="text-[9px] font-semibold text-gray-800 leading-tight text-center">{item.label}</p>
                  <p className="text-[8px] text-gray-400 mt-0.5 leading-tight text-center">{item.sub}</p>
                </div>
              ))}
            </div>

            {/* Scrollable content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain bg-white">
              {/* Column headers */}
              <div className="flex items-center justify-between px-5 py-2.5 bg-white">
                <span className="text-[10px] font-medium tracking-widest text-gray-400 uppercase">Product</span>
                <span className="text-[10px] font-medium tracking-widest text-gray-400 uppercase">Total</span>
              </div>

              {/* Product rows */}
              <ul className="px-4 pb-4 space-y-3">
                {cart.map((item) => {
                  const variantLabel = item.category_product_type === 'poster'
                    ? `Size: ${item.selectedSize}`
                    : `Size: ${item.selectedSize}${item.selectedColor ? ` · ${item.selectedColor}` : ''}`;
                  const lineTotal = item.price * item.quantity;

                  return (
                    <li
                      key={`${item.id}-${item.selectedColor}-${item.selectedSize}`}
                      className="relative bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm"
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden bg-gray-50">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        <div className="flex-1 min-w-0 pr-14">
                          <h3 className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2">
                            {item.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatCurrency(item.price, currency, { showDecimals: false })}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{variantLabel}</p>

                          <div className="flex items-center gap-2.5 mt-2.5">
                            <QtyControl
                              qty={item.quantity}
                              onDecrease={() => updateQuantity(item.id, item.quantity - 1)}
                              onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
                            />
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-gray-300 hover:text-red-500 transition-colors p-0.5"
                              aria-label={`Remove ${item.name}`}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </div>

                        <div className="absolute top-3.5 right-3.5 text-right">
                          <p className="text-sm font-semibold text-gray-900 tabular-nums">
                            {formatCurrency(lineTotal, currency, { showDecimals: false })}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Recommendations */}
              {(loadingRecs || recommendations.length > 0) && (
                <div className="px-4 pb-5">
                  <p className="text-[10px] font-medium tracking-widest text-gray-400 uppercase mb-3">
                    You may also like
                  </p>
                  {loadingRecs ? (
                    <div className="flex gap-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="w-28 h-36 rounded-lg bg-gray-200 animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
                      {recommendations.map(p => (
                        <RecCard key={p.id} product={p} onClose={closeCart} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 bg-white">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-900">Estimated total</span>
                <span className="text-lg font-bold text-gray-900 tabular-nums">
                  {formatCurrency(subtotal, currency, { showDecimals: false })}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 text-center mb-3">
                Prices inclusive of GST · Free shipping
              </p>
              <button
                onClick={handleCheckout}
                className="w-full h-[52px] rounded-full text-sm font-bold tracking-wide uppercase bg-brand-coral text-white hover:bg-brand-coral-hover shadow-[0_4px_14px_rgba(255,122,89,0.35)] transition-colors"
              >
                Check out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
