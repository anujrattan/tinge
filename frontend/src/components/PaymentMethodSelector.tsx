import React from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import { ShieldIcon, CheckCircleIcon, CreditCardIcon, SmartphoneIcon, WalletIcon, BanknoteIcon } from './icons';
import { formatCurrency } from '../utils/currency';
import type { CurrencyCode } from '../utils/currency';

interface PaymentMethodSelectorProps {
  selectedMethod: 'COD' | 'Prepaid';
  onMethodChange: (method: 'COD' | 'Prepaid') => void;
  codFee: number;
  currency: CurrencyCode;
  prepaidOffers?: string[]; // Optional array of promotional messages for prepaid
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onMethodChange,
  codFee,
  currency,
  prepaidOffers = ['Free Shipping', 'Instant confirmation'],
}) => {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-brand-primary">Payment Method</h2>
        
        {/* Trust Badges */}
        <div className="hidden sm:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-green-500">
            <ShieldIcon className="w-4 h-4" />
            <span className="font-medium">Secure</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-500">
            <CheckCircleIcon className="w-4 h-4" />
            <span className="font-medium">SSL Encrypted</span>
          </div>
        </div>
      </div>

      {/* Trust badges mobile */}
      <div className="flex sm:hidden items-center justify-center gap-4 text-xs pb-2">
        <div className="flex items-center gap-1.5 text-green-500">
          <ShieldIcon className="w-3.5 h-3.5" />
          <span className="font-medium">Secure</span>
        </div>
        <div className="flex items-center gap-1.5 text-blue-500">
          <CheckCircleIcon className="w-3.5 h-3.5" />
          <span className="font-medium">SSL Encrypted</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Pay Online (Prepaid) - First */}
        <button
          type="button"
          onClick={() => onMethodChange('Prepaid')}
          className={`group relative p-6 rounded-xl border-2 transition-all duration-200 text-left ${
            selectedMethod === 'Prepaid'
              ? 'border-blue-400 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 ring-2 ring-blue-400/30 shadow-lg shadow-blue-500/10'
              : 'border-gray-200 dark:border-white/20 bg-white dark:bg-brand-surface hover:border-blue-300 dark:hover:border-blue-400/50 hover:shadow-md'
          }`}
        >
          {/* Recommended Badge */}
          <div className="absolute -top-2.5 left-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md">
              <CheckCircleIcon className="w-3 h-3" />
              Recommended
            </span>
          </div>

          {/* Selection Indicator */}
          <div className="absolute top-4 right-4">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedMethod === 'Prepaid' 
                ? 'border-blue-500 bg-blue-500 scale-110' 
                : 'border-gray-300 dark:border-white/30 group-hover:border-blue-400'
            }`}>
              {selectedMethod === 'Prepaid' && (
                <CheckCircleIcon className="w-4 h-4 text-white" />
              )}
            </div>
          </div>

          <div className="space-y-3">
            {/* Icon + Title + Subheading — single line */}
            <div className="flex items-center gap-4 flex-nowrap min-w-0">
              <div
                className={`flex-shrink-0 inline-flex rounded-xl shadow-lg overflow-hidden ${
                  selectedMethod === 'Prepaid'
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/40'
                    : 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-400/30'
                }`}
              >
                <Player
                  src={encodeURI('/Wallet animation-json.json')}
                  autoplay
                  loop
                  style={{ width: 72, height: 72 }}
                  aria-label="Pay online animation"
                />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <h3 className="text-base font-bold text-brand-primary whitespace-nowrap">Pay Online</h3>
                <p className="text-sm text-brand-secondary mt-0.5">
                  Instant confirmation &amp; faster delivery
                </p>
              </div>
            </div>

            {/* Payment Options Icons */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex items-center gap-1.5 text-xs text-brand-secondary">
                <SmartphoneIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>UPI</span>
              </div>
              <div className="text-brand-secondary/30">•</div>
              <div className="flex items-center gap-1.5 text-xs text-brand-secondary">
                <CreditCardIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Cards</span>
              </div>
              <div className="text-brand-secondary/30">•</div>
              <div className="flex items-center gap-1.5 text-xs text-brand-secondary">
                <WalletIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Wallets</span>
              </div>
            </div>

            {/* Promotional Offers - 2 columns; odd count => last item full width, longest text last */}
            {prepaidOffers && prepaidOffers.length > 0 && (() => {
              const sorted = [...prepaidOffers].sort((a, b) => a.length - b.length);
              const isOdd = sorted.length % 2 === 1;
              return (
                <div className="grid grid-cols-2 gap-2">
                  {sorted.map((offer, index) => {
                    const isLast = index === sorted.length - 1;
                    const fullWidth = isOdd && isLast;
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 ${fullWidth ? 'col-span-2' : ''}`}
                      >
                        <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 text-center">{offer}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Secured by Razorpay */}
            <div className={`mt-3 pt-3 border-t ${
              selectedMethod === 'Prepaid' ? 'border-blue-200 dark:border-blue-900/50' : 'border-gray-100 dark:border-white/10'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldIcon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="text-xs text-brand-secondary flex items-center gap-2 leading-none">
                  <span className="flex items-center">Secured by</span>
                  <span className="inline-flex h-6 w-24 items-center justify-center overflow-hidden flex-shrink-0">
                    <img
                      src="/Razorpay-logo.png"
                      alt="Razorpay"
                      className="h-full w-full object-contain"
                    />
                  </span>
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* Cash on Delivery - Second */}
        <button
          type="button"
          onClick={() => onMethodChange('COD')}
          className={`group relative p-6 rounded-xl border-2 transition-all duration-200 text-left ${
            selectedMethod === 'COD'
              ? 'border-amber-400 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-950/30 dark:to-orange-950/30 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/10'
              : 'border-gray-200 dark:border-white/20 bg-white dark:bg-brand-surface hover:border-amber-300 dark:hover:border-amber-400/50 hover:shadow-md'
          }`}
        >
          {/* Selection Indicator */}
          <div className="absolute top-4 right-4">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              selectedMethod === 'COD' 
                ? 'border-amber-500 bg-amber-500 scale-110' 
                : 'border-gray-300 dark:border-white/30 group-hover:border-amber-400'
            }`}>
              {selectedMethod === 'COD' && (
                <CheckCircleIcon className="w-4 h-4 text-white" />
              )}
            </div>
          </div>

          <div className="space-y-3">
            {/* Icon + Title + Subheading — single line */}
            <div className="flex items-center gap-4 flex-nowrap min-w-0">
              <div
                className={`flex-shrink-0 inline-flex rounded-xl shadow-lg overflow-hidden ${
                  selectedMethod === 'COD'
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/40'
                    : 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-400/30'
                }`}
              >
                <Player
                  src={encodeURI('/cash on delivery-json.json')}
                  autoplay
                  loop
                  style={{ width: 72, height: 72 }}
                  aria-label="Cash on delivery animation"
                />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <h3 className="text-base font-bold text-brand-primary whitespace-nowrap">Cash on Delivery</h3>
                <p className="text-sm text-brand-secondary mt-0.5">
                  Pay when you receive your order
                </p>
              </div>
            </div>

            {/* Features - Same style as prepaid: green containers, 2 cols, center-aligned */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 text-center">Pay when delivered</span>
              </div>
              <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 text-center">Inspect before paying</span>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Security Note */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30">
        <ShieldIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-700 dark:text-emerald-300">
          <span className="font-semibold">100% Secure Payments.</span> Your payment information is encrypted and never stored on our servers.
        </p>
      </div>
    </div>
  );
};
