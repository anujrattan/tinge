import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import api from '../services/api';

export const GuestOrderLookupPage: React.FC = () => {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orderNumber.trim() || !email.trim()) {
      setError('Please enter both order number and email');
      return;
    }

    try {
      setLoading(true);
      const response = await api.lookupOrder(orderNumber.trim(), email.trim());
      
      if (response.success && response.order) {
        // Navigate to order details page with email as query param
        navigate(`/order-details/${orderNumber}?email=${encodeURIComponent(email.trim())}`);
      } else {
        setError(response.message || 'Order not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to lookup order. Please check your order number and email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-md mx-auto">
        <div className="bg-brand-surface rounded-lg border border-white/10 p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-brand-primary/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold font-display text-brand-primary mb-2">
              Lookup Your Order
            </h1>
            <p className="text-brand-secondary text-sm">
              Enter your order number and email to view order details
            </p>
          </div>

          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label htmlFor="orderNumber" className="block text-sm font-medium text-brand-secondary mb-2">
                Order Number
              </label>
              <input
                id="orderNumber"
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g., TC-241229-0001"
                className="w-full px-4 py-3 bg-brand-surface border border-white/20 rounded-lg text-brand-primary placeholder-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-secondary mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 bg-brand-surface border border-white/20 rounded-lg text-brand-primary placeholder-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !orderNumber.trim() || !email.trim()}
            >
              {loading ? 'Looking up...' : 'Lookup Order'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-sm text-brand-secondary mb-2">
              Have an account?
            </p>
            <Button
              variant="outline"
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              Sign In
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => navigate('/')}>
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

