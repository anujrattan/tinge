import { useState, useEffect } from 'react';
import { Product, Category } from '../../../types';
import api from '../../../services/api';

export const useAdminData = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      // Admin panel should see all categories (active and inactive)
      const data = await api.getAllCategoriesAdmin();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Load both categories and products on mount to ensure metrics are accurate
  // Backend uses cache-first approach: checks Redis cache, falls back to DB if miss, then updates cache
  useEffect(() => {
    // Fetch both in parallel for better performance
    Promise.all([
      fetchCategories(),
      fetchProducts()
    ]);
  }, []); // Only run on mount

  const refetchAll = async () => {
    await Promise.all([
      fetchCategories(),
      fetchProducts()
    ]);
  };

  return {
    products,
    categories,
    productsLoading,
    categoriesLoading,
    fetchProducts,
    fetchCategories,
    refetchAll,
  };
};

