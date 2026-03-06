import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      
      // Redirect based on user role
      if (response.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/'); // Redirect to home for regular users
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${isSignup ? 'sign up' : 'sign in'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-brand-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-display font-extrabold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="mt-2 text-sm text-brand-secondary">
            {isSignup 
              ? 'Join us to start shopping premium apparel' 
              : 'Sign in to your account to continue'}
          </p>
        </div>
        
        <Card className="p-8">
          {/* Toggle between Sign In and Sign Up */}
          <div className="flex gap-2 mb-6 p-1 bg-brand-surface rounded-lg">
            <button
              type="button"
              onClick={() => {
                setIsSignup(false);
                setError('');
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                !isSignup
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-brand-secondary hover:text-brand-primary'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignup(true);
                setError('');
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                isSignup
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-brand-secondary hover:text-brand-primary'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {isSignup && (
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-brand-primary mb-2">
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
            
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-brand-primary mb-2">
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
            
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-brand-primary mb-2">
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
                <p className="mt-1 text-xs text-brand-secondary">
                  Password must be at least 6 characters long
                </p>
              )}
            </div>
            
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            
            <div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl" 
                disabled={loading}
              >
                {loading 
                  ? (isSignup ? 'Creating account...' : 'Signing in...') 
                  : (isSignup ? 'Create Account' : 'Sign In')}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

