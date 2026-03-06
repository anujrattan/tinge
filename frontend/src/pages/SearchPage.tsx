import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Product } from '../types';
import api from '../services/api';
import { ProductCard } from '../components/ProductCard';
import { Button } from '../components/ui';
import { SearchIcon } from '../components/icons';

export const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        setTotal(0);
        return;
      }

      setLoading(true);
      try {
        const response = await api.searchProducts({
          q: query,
          limit,
          offset: (page - 1) * limit,
        });
        setResults(response.results);
        setTotal(response.total);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-brand-primary mb-2">
          Search Results
        </h1>
        {query && (
          <p className="text-lg text-brand-secondary">
            {loading ? (
              'Searching...'
            ) : (
              <>
                Found <span className="font-semibold text-brand-primary">{total}</span> {total === 1 ? 'result' : 'results'} for{' '}
                <span className="font-semibold text-brand-primary">"{query}"</span>
              </>
            )}
          </p>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent"></div>
        </div>
      )}

      {/* No Query State */}
      {!query.trim() && !loading && (
        <div className="text-center py-20">
          <SearchIcon className="w-16 h-16 mx-auto mb-4 text-brand-secondary opacity-50" />
          <h2 className="text-2xl font-bold text-brand-primary mb-2">Start Searching</h2>
          <p className="text-brand-secondary mb-6">
            Enter a search term to find products
          </p>
        </div>
      )}

      {/* No Results State */}
      {query.trim() && !loading && results.length === 0 && (
        <div className="text-center py-20">
          <SearchIcon className="w-16 h-16 mx-auto mb-4 text-brand-secondary opacity-50" />
          <h2 className="text-2xl font-bold text-brand-primary mb-2">No Results Found</h2>
          <p className="text-brand-secondary mb-6">
            We couldn't find any products matching "{query}"
          </p>
          <Button onClick={() => navigate('/categories')}>
            Browse All Products
          </Button>
        </div>
      )}

      {/* Results Grid */}
      {!loading && results.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center gap-4">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-brand-secondary">
                Page {page} of {totalPages}
              </span>
              <Button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

