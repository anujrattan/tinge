import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../components/ui';
import api from '../services/api';
import { authService } from '../services/auth';
import { useApp } from '../context/AppContext';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useApp();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (isSignup) {
        response = await api.signup(email, password, name);
      } else {
        response = await api.login(email, password);
      }

      authService.setToken(response.token);
      setUser(response.user);

      if (response.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${isSignup ? 'sign up' : 'sign in'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (signup: boolean) => {
    setIsSignup(signup);
    setError('');
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center bg-gradient-to-b from-white to-[#FAFAFA] dark:from-brand-bg dark:to-brand-surface py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-3">
          <Link to="/" className="inline-flex justify-center mb-2" aria-label="Tinge Clothing home">
            <img
              src={encodeURI('/Tinge Clothing - Logo - No background.png')}
              alt="Tinge Clothing"
              className="h-14 w-auto object-contain"
            />
          </Link>
          <h1 className="font-playfair text-3xl md:text-4xl font-medium tracking-tight text-brand-primary">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-brand-secondary leading-relaxed max-w-sm mx-auto">
            {isSignup
              ? 'Join Tinge to save wishlists, track orders, and checkout faster.'
              : 'Sign in to access your orders, wishlist, and saved details.'}
          </p>
        </div>

        <Card className="p-6 sm:p-8 border-gray-200/80 dark:border-white/10 shadow-sm">
          <div className="flex gap-1.5 p-1 mb-8 rounded-xl bg-gray-100 dark:bg-brand-bg/60 border border-gray-200/60 dark:border-white/10">
            <button
              type="button"
              onClick={() => switchMode(false)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                !isSignup
                  ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/20'
                  : 'text-brand-secondary hover:text-brand-primary'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode(true)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                isSignup
                  ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/20'
                  : 'text-brand-secondary hover:text-brand-primary'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {isSignup && (
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-brand-primary">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required={isSignup}
                  className="w-full"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-brand-primary">
                Email <span className="text-red-400">*</span>
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                className="w-full"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-brand-primary">
                Password <span className="text-red-400">*</span>
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="w-full"
                placeholder={isSignup ? 'At least 6 characters' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {isSignup && (
                <p className="text-xs text-brand-secondary">Password must be at least 6 characters long.</p>
              )}
            </div>

            {error && (
              <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading
                ? isSignup
                  ? 'Creating account…'
                  : 'Signing in…'
                : isSignup
                  ? 'Create Account'
                  : 'Sign In'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-brand-secondary leading-relaxed">
            By continuing, you agree to our{' '}
            <Link to="/terms-of-service" className="text-brand-accent hover:text-brand-accent-hover font-medium">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy-policy" className="text-brand-accent hover:text-brand-accent-hover font-medium">
              Privacy Policy
            </Link>
            .
          </p>
        </Card>
      </div>
    </div>
  );
};
