import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui';
import { useApp } from '../context/AppContext';

/**
 * Payment Callback Page
 * Displays payment result after Razorpay redirect
 * 
 * Backend handles all verification and database updates before redirecting here.
 * This page only displays the result based on query params.
 * 
 * Query params from backend:
 * - status: 'success' | 'error'
 * - order_id: Our internal order ID
 * - order_number: Our order number
 * - payment_status: Payment status (paid/failed)
 * - error: Error code (if status is 'error')
 */
export const PaymentCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useApp();
  
  // Extract status from query params (backend sets this after verification)
  const statusParam = searchParams.get('status');
  const orderNumber = searchParams.get('order_number');
  const orderId = searchParams.get('order_id');
  const paymentStatus = searchParams.get('payment_status');
  const errorCode = searchParams.get('error');

  // Determine display status based on query params
  const getDisplayStatus = (): 'success' | 'failed' | 'error' => {
    if (statusParam === 'success' && paymentStatus === 'paid') {
      return 'success';
    }
    if (statusParam === 'success' && paymentStatus === 'failed') {
      return 'failed';
    }
    return 'error';
  };

  const status = getDisplayStatus();

  useEffect(() => {
    // Clear cart on successful payment
    if (status === 'success') {
      clearCart();
    }
  }, [status, clearCart]);

  // After showing success message, redirect to the dedicated order success page
  useEffect(() => {
    if (status !== 'success' || !orderNumber || paymentStatus !== 'paid') {
      return;
    }

    const timeout = setTimeout(() => {
      const gateway = 'Prepaid';
      navigate(
        `/order-success?orderNumber=${encodeURIComponent(orderNumber)}&gateway=${encodeURIComponent(
          gateway
        )}&paymentStatus=${encodeURIComponent(paymentStatus!)}`
      );
    }, 3000); // show message briefly, then redirect

    return () => clearTimeout(timeout);
  }, [status, orderNumber, paymentStatus, navigate]);

  // Get appropriate message based on status
  const getMessage = (): string => {
    switch (status) {
      case 'success':
        return 'Payment verified successfully! Your order has been confirmed.';
      case 'failed':
        return 'Payment verification failed. Please contact support with your order number.';
      case 'error':
        switch (errorCode) {
          case 'missing_payment_details':
            return 'Payment details are missing. Please contact support.';
          case 'invalid_signature':
            return 'Payment verification failed due to invalid signature. Please contact support.';
          case 'payment_not_found':
            return 'Payment record not found. Please contact support with your order number.';
          case 'callback_processing_failed':
            return 'An error occurred while processing payment. Please contact support.';
          default:
            return 'An error occurred. Please contact support with your order number.';
        }
      default:
        return 'Please contact support with your order number.';
    }
  };

  const message = getMessage();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center animate-fadeIn">
      <div className="max-w-2xl mx-auto bg-brand-surface p-8 rounded-lg shadow-sm border border-white/10">
        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold font-display text-brand-primary">
              Payment Successful!
            </h1>
            {orderNumber && (
              <p className="mt-4 text-lg text-brand-secondary">
                Order Number: <span className="font-semibold text-brand-primary">{orderNumber}</span>
              </p>
            )}
            <p className="mt-4 text-brand-secondary">
              {message}
            </p>
            <p className="mt-4 text-sm text-brand-secondary">
              You'll receive a confirmation email shortly.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate("/")} className="px-6">
                Back to Home
              </Button>
              {orderNumber && (
                <Button 
                  onClick={() => navigate(`/order-details/${orderNumber}`)} 
                  variant="outline"
                  className="px-6"
                >
                  View Order Details
                </Button>
              )}
            </div>
          </>
        )}

        {(status === 'failed' || status === 'error') && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold font-display text-brand-primary">
              {status === 'failed' ? 'Payment Failed' : 'Error'}
            </h1>
            {orderNumber && (
              <p className="mt-4 text-lg text-brand-secondary">
                Order Number: <span className="font-semibold text-brand-primary">{orderNumber}</span>
              </p>
            )}
            <p className="mt-4 text-brand-secondary">
              {message}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate("/checkout")} className="px-6">
                Try Again
              </Button>
              <Button onClick={() => navigate("/")} variant="outline" className="px-6">
                Back to Home
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

