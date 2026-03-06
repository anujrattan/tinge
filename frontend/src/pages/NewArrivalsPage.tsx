import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import api from '../services/api';
import { ProductCard } from '../components/ProductCard';

export const NewArrivalsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const data = await api.getNewArrivals();
      setProducts(data);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-brand-primary">New Arrivals</h1>
        <p className="mt-2 text-brand-secondary font-sans">Be the first to discover our latest additions.</p>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-brand-surface animate-pulse aspect-[4/5] rounded-lg"></div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-brand-secondary">No new arrivals found.</p>
        </div>
      )}
    </div>
  );
};

