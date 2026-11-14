import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Input } from '../components/ui';
import { PaymentMethodSelector } from '../components/PaymentMethodSelector';
import {
  UserIcon,
  MailIcon,
  SmartphoneIcon,
  MapPinIcon,
  ChevronDownIcon,
  ShieldIcon,
  PackageIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '../components/icons';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/currency';
import { validateForm, validationSchemas, clearFieldError, ValidationErrors } from '../utils/formValidation';
import { countryCodes, getDefaultCountry, formatPhoneForBackend, parsePhoneFromBackend } from '../utils/countryCodes';
import { trackInitiateCheckout, cartToTrackingItems, PURCHASE_PAYLOAD_STORAGE_KEY } from '../utils/gtm';


const CheckoutForm: React.FC<{ 
  onSubmit: (data: any, paymentMethod: 'COD' | 'Prepaid') => void;
  paymentMethod: 'COD' | 'Prepaid';
  onPaymentMethodChange: (method: 'COD' | 'Prepaid') => void;
  initialData?: any;
  onAddressSaved?: (addressData: any) => void;
  isGuest?: boolean;
  currency: any;
  codFee: number;
}> = ({ onSubmit, paymentMethod, onPaymentMethodChange, initialData, onAddressSaved, isGuest, currency, codFee }) => {
  const { showToast } = useToast();
  // For guest users, try to load from localStorage first
  const getInitialData = () => {
    if (isGuest && !initialData) {
      try {
        const savedAddress = localStorage.getItem('guestCheckoutAddress');
        if (savedAddress) {
          const parsed = JSON.parse(savedAddress);
          return parsed;
        }
      } catch (error) {
        console.error('Failed to load address from localStorage:', error);
      }
    }
    return initialData;
  };

  const effectiveInitialData = getInitialData();
  
  // Parse phone number if it exists in initialData
  const parsedPhone = effectiveInitialData?.phone ? parsePhoneFromBackend(effectiveInitialData.phone) : { dialCode: getDefaultCountry().dialCode, phoneNumber: '' };
  
  // Determine if we have enough initial data to treat the address as "saved"
  const hasInitialAddress =
    !!effectiveInitialData &&
    !!(effectiveInitialData.firstName || effectiveInitialData.first_name) &&
    !!(effectiveInitialData.lastName || effectiveInitialData.last_name) &&
    !!(effectiveInitialData.email) &&
    !!(parsedPhone.phoneNumber || effectiveInitialData.phone) &&
    !!(effectiveInitialData.address || effectiveInitialData.address1) &&
    !!effectiveInitialData.city &&
    !!(effectiveInitialData.state || effectiveInitialData.province) &&
    !!effectiveInitialData.zip;

  const [formData, setFormData] = useState({
    firstName: effectiveInitialData?.firstName || effectiveInitialData?.first_name || '',
    lastName: effectiveInitialData?.lastName || effectiveInitialData?.last_name || '',
    email: effectiveInitialData?.email || '',
    countryCode: parsedPhone.dialCode || effectiveInitialData?.countryCode || getDefaultCountry().dialCode,
    phone: parsedPhone.phoneNumber || effectiveInitialData?.phone?.replace(/^\+\d{1,4}/, '') || '',
    address: effectiveInitialData?.address || effectiveInitialData?.address1 || '',
    address2: effectiveInitialData?.address2 || '',
    city: effectiveInitialData?.city || '',
    state: effectiveInitialData?.state || effectiveInitialData?.province || '',
    zip: effectiveInitialData?.zip || '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isAddressSaved, setIsAddressSaved] = useState(hasInitialAddress);
  const [isEditing, setIsEditing] = useState(!hasInitialAddress);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      const parsedPhone = initialData.phone ? parsePhoneFromBackend(initialData.phone) : { dialCode: getDefaultCountry().dialCode, phoneNumber: '' };
      setFormData({
        firstName: initialData.first_name || '',
        lastName: initialData.last_name || '',
        email: initialData.email || '',
        countryCode: parsedPhone.dialCode,
        phone: parsedPhone.phoneNumber,
        address: initialData.address1 || '',
        address2: initialData.address2 || '',
        city: initialData.city || '',
        state: initialData.province || '',
        zip: initialData.zip || '',
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(clearFieldError(errors, name));
    }
  };

  const handleCountryCodeChange = (value: string) => {
    setFormData({ ...formData, countryCode: value });
    if (errors.countryCode) {
      setErrors(clearFieldError(errors, 'countryCode'));
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form using validation utility
    const validationErrors = validateForm(formData, validationSchemas.checkout);
    
    if (Object.keys(validationErrors).length === 0) {
      setIsSaving(true);
      try {
        // Format phone number for backend
        const formattedPhone = formatPhoneForBackend(formData.phone, formData.countryCode);
        
        const addressData = {
          ...formData,
          phone: formattedPhone,
        };
        
        // Notify parent component that address is saved
        if (onAddressSaved) {
          await onAddressSaved(addressData);
        }
        
        // Mark address as saved and make fields read-only
        setIsAddressSaved(true);
        setIsEditing(false);
      } catch (error) {
        console.error('Error saving address:', error);
        showToast('Failed to save address. Please try again.', 'error');
      } finally {
        setIsSaving(false);
      }
    } else {
      // Set all errors at once
      setErrors(validationErrors);
      
      // Scroll to first error
      const firstErrorField = Object.keys(validationErrors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
    }
  };
  
  const handleEdit = () => {
    setIsEditing(true);
  };
  
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
        
    // Format phone number for backend
    const formattedPhone = formatPhoneForBackend(formData.phone, formData.countryCode);
    
    // Submit order
    onSubmit({
      ...formData,
      phone: formattedPhone,
    }, paymentMethod);
  };

  return (
    <form
      onSubmit={(!isAddressSaved || isEditing) ? handleSaveAddress : handlePlaceOrder}
      className="space-y-6"
    >
      {/* When address is saved and not editing, show condensed summary instead of full form fields */}
      {isAddressSaved && !isEditing ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-coral">Step 01 · Confirmed</p>
              <h2 className="mt-1 font-playfair text-2xl font-medium tracking-tight text-brand-primary">Delivery details</h2>
            </div>
            <button
              type="button"
              onClick={handleEdit}
              className="min-h-[40px] cursor-pointer rounded-full border border-hairline px-4 text-[13px] font-medium text-brand-primary transition-colors hover:border-brand-ink dark:hover:border-brand-cream"
            >
              Edit
            </button>
          </div>

          <div className="rounded-2xl border border-hairline p-5 sm:p-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-secondary flex items-center gap-2">
                <UserIcon className="w-3.5 h-3.5 text-brand-primary" /> Contact
              </p>
              <div className="mt-3 space-y-1.5 text-sm">
                <p className="font-medium text-brand-primary">
                  {formData.firstName} {formData.lastName}
                </p>
                <p className="text-brand-secondary flex items-center gap-2 break-all">
                  <MailIcon className="w-3.5 h-3.5 shrink-0" />
                  {formData.email}
                </p>
                <p className="text-brand-secondary flex items-center gap-2">
                  <SmartphoneIcon className="w-3.5 h-3.5 shrink-0" />
                  {formData.countryCode} {formData.phone}
                </p>
              </div>
            </div>

            <div className="sm:border-l sm:border-hairline sm:pl-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-secondary flex items-center gap-2">
                <MapPinIcon className="w-3.5 h-3.5 text-brand-primary" /> Shipping to
              </p>
              <div className="mt-3 space-y-1 text-sm">
                <p className="font-medium text-brand-primary">
                  {formData.address}
                  {formData.address2 ? `, ${formData.address2}` : ''}
                </p>
                <p className="text-brand-secondary">
                  {formData.city}, {formData.state} {formData.zip}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-playfair text-xl font-medium tracking-tight text-brand-primary">Contact Information</h2>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-brand-secondary">
                  First Name <span className="text-red-500">*</span>
                </label>
                <Input 
                  type="text" 
                  name="firstName" 
                  id="firstName" 
                  value={formData.firstName} 
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`mt-1 ${errors.firstName ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                />
                {errors.firstName && <p id="firstName-error" className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-brand-secondary">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <Input 
                  type="text" 
                  name="lastName" 
                  id="lastName" 
                  value={formData.lastName} 
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`mt-1 ${errors.lastName ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  aria-invalid={!!errors.lastName}
                  aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                />
                {errors.lastName && <p id="lastName-error" className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-brand-secondary">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input 
                  type="email" 
                  name="email" 
                  id="email" 
                  value={formData.email} 
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`mt-1 ${errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {errors.email && <p id="email-error" className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-brand-secondary mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div
                  className={`flex items-center w-full rounded-lg border-2 bg-white dark:bg-brand-surface shadow-sm transition-all overflow-hidden ${
                    errors.phone || errors.countryCode
                      ? 'border-red-500 focus-within:ring-2 focus-within:ring-red-500/40'
                      : 'border-gray-400 dark:border-white/40 hover:border-gray-500 dark:hover:border-white/50 focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500 dark:focus-within:ring-brand-accent dark:focus-within:border-brand-accent'
                  } ${!isEditing ? 'opacity-50' : ''}`}
                >
                  <div className="relative flex-shrink-0">
                    <select
                      name="countryCode"
                      value={formData.countryCode}
                      onChange={(e) => handleCountryCodeChange(e.target.value)}
                      disabled={!isEditing}
                      aria-label="Country code"
                      className="h-10 appearance-none bg-transparent pl-3 pr-8 text-sm font-medium text-brand-primary focus:outline-none focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {countryCodes.map((country) => (
                        <option key={country.code} value={country.dialCode}>
                          {country.flag} {country.dialCode}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-secondary" />
                  </div>
                  <div className="w-px h-6 bg-gray-300 dark:bg-white/20 flex-shrink-0" aria-hidden="true" />
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Enter phone number"
                    className="flex-1 min-w-0 h-10 border-0 bg-transparent px-3 text-sm text-brand-primary placeholder:text-brand-secondary focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? 'phone-error' : undefined}
                  />
                </div>
                {errors.countryCode && <p className="text-red-500 text-sm mt-1">{errors.countryCode}</p>}
                {errors.phone && <p id="phone-error" className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>
            </div>
          </div>
          <div>
            <h2 className="font-playfair text-xl font-medium tracking-tight text-brand-primary">Shipping Address</h2>
            <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
              <div className="sm:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-brand-secondary">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <Input 
                  type="text" 
                  name="address" 
                  id="address" 
                  value={formData.address} 
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`mt-1 ${errors.address ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  aria-invalid={!!errors.address}
                  aria-describedby={errors.address ? 'address-error' : undefined}
                />
                {errors.address && <p id="address-error" className="text-red-500 text-sm mt-1">{errors.address}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="address2" className="block text-sm font-medium text-brand-secondary">
                  Address Line 2 <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <Input 
                  type="text" 
                  name="address2" 
                  id="address2" 
                  value={formData.address2} 
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-brand-secondary">
                  City <span className="text-red-500">*</span>
                </label>
                <Input 
                  type="text" 
                  name="city" 
                  id="city" 
                  value={formData.city} 
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`mt-1 ${errors.city ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  aria-invalid={!!errors.city}
                  aria-describedby={errors.city ? 'city-error' : undefined}
                />
                {errors.city && <p id="city-error" className="text-red-500 text-sm mt-1">{errors.city}</p>}
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-brand-secondary">
                  State / Province <span className="text-red-500">*</span>
                </label>
                <Input 
                  type="text" 
                  name="state" 
                  id="state" 
                  value={formData.state} 
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`mt-1 ${errors.state ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  aria-invalid={!!errors.state}
                  aria-describedby={errors.state ? 'state-error' : undefined}
                />
                {errors.state && <p id="state-error" className="text-red-500 text-sm mt-1">{errors.state}</p>}
              </div>
              <div>
                <label htmlFor="zip" className="block text-sm font-medium text-brand-secondary">
                  ZIP / Postal Code <span className="text-red-500">*</span>
                </label>
                <Input 
                  type="text" 
                  name="zip" 
                  id="zip" 
                  value={formData.zip} 
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`mt-1 ${errors.zip ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                  aria-invalid={!!errors.zip}
                  aria-describedby={errors.zip ? 'zip-error' : undefined}
                />
                {errors.zip && <p id="zip-error" className="text-red-500 text-sm mt-1">{errors.zip}</p>}
              </div>
            </div>
          </div>
        </>
      )}
      
      {isAddressSaved && !isEditing && (
        <div className="hidden lg:block pt-2 space-y-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-coral">Step 02</p>
            <h2 className="mt-1 font-playfair text-2xl font-medium tracking-tight text-brand-primary">Payment method</h2>
          </div>
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onMethodChange={onPaymentMethodChange}
            codFee={codFee}
            currency={currency}
            prepaidOffers={['Free Shipping', 'Instant confirmation', 'No extra charges']}
          />

          <button
            type="button"
            onClick={handlePlaceOrder}
            className="flex min-h-[54px] w-full cursor-pointer items-center justify-center rounded-full bg-brand-ink px-8 text-[15px] font-medium text-brand-cream transition-colors hover:bg-black dark:bg-brand-cream dark:text-brand-ink dark:hover:bg-white"
          >
            {paymentMethod === 'COD' ? 'Place Order' : 'Proceed to Payment'}
          </button>
        </div>
      )}

      {(!isAddressSaved || (isAddressSaved && isEditing)) && (
        <button
          type="submit"
          disabled={isSaving}
          className="flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-full bg-brand-ink px-8 text-[15px] font-medium text-brand-cream transition-colors hover:bg-black disabled:opacity-50 dark:bg-brand-cream dark:text-brand-ink dark:hover:bg-white"
        >
          {isSaving ? 'Saving…' : 'Continue to Payment'}
        </button>
      )}
    </form>
  );
};

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { cart, clearCart, currency, isAuthenticated, user } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'Prepaid'>('Prepaid');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const cancellationHandledRef = useRef(false);
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shippingCost = 0;
  const COD_FEE = 99;
  const PREPAID_DISCOUNT_PERCENT = 5;
  const prepaidSavings = Math.round(subtotal * (PREPAID_DISCOUNT_PERCENT / 100));
  const discountedSubtotal = subtotal - prepaidSavings;
  const codFee = paymentMethod === 'COD' ? COD_FEE : 0;
  // Display total: what the customer pays (COD = subtotal + fee, Prepaid = discounted)
  const total =
    paymentMethod === 'COD'
      ? subtotal + shippingCost + COD_FEE
      : discountedSubtotal + shippingCost;
  // Base amount sent to API (API adds shipping + codFee itself; do not send final total to avoid double-adding COD fee)
  const orderBaseTotal = paymentMethod === 'COD' ? subtotal : discountedSubtotal;

  // Fetch saved addresses for logged-in users
  useEffect(() => {
    if (isAuthenticated) {
      const fetchAddresses = async () => {
        try {
          setLoadingAddresses(true);
          const response = await api.getUserProfile();
          if (response.success && response.addresses) {
            setSavedAddresses(response.addresses || []);
            // Auto-select primary address if exists
            const primaryAddress = response.addresses.find((addr: any) => addr.is_primary);
            if (primaryAddress) {
              setSelectedAddressId(primaryAddress.id);
              setUseNewAddress(false);
            } else if (response.addresses.length === 1) {
              // If only one address, select it
              setSelectedAddressId(response.addresses[0].id);
              setUseNewAddress(false);
            }
          }
        } catch (err) {
          console.error('Failed to load addresses:', err);
        } finally {
          setLoadingAddresses(false);
        }
      };
      fetchAddresses();
    }
  }, [isAuthenticated]);

  // Check if user was redirected back after cancelling payment
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isCancelled = params.get('cancelled') === 'true';
    if (isCancelled && !cancellationHandledRef.current) {
      cancellationHandledRef.current = true;
      setIsSubmitting(false);
      const cancelledOrderNumber = params.get('orderNumber') || params.get('order_number');
      showToast(
        cancelledOrderNumber
          ? `Payment was cancelled for order ${cancelledOrderNumber}. You can retry payment from your orders.`
          : 'Payment was cancelled. You can retry whenever you are ready.',
        'error'
      );
      // Clean query params so refresh/back doesn't keep showing the cancellation toast.
      navigate('/checkout', { replace: true });
    }
  }, [location.search, navigate, showToast]);

  const initiateCheckoutFiredRef = useRef(false);
  useEffect(() => {
    if (cart.length > 0 && !initiateCheckoutFiredRef.current) {
      trackInitiateCheckout({
        currency,
        value: total,
        items: cartToTrackingItems(cart),
      });
      initiateCheckoutFiredRef.current = true;
    }
  }, [cart.length, currency, total, cart]);

  const selectedAddress = savedAddresses.find(addr => addr.id === selectedAddressId);

  const handleAddressSaved = async (addressData: any) => {
    // This callback is triggered when user clicks "Save Address"
    
    if (!isAuthenticated) {
      // For guest users: Save to localStorage for auto-fill on next visit
      try {
        localStorage.setItem('guestCheckoutAddress', JSON.stringify(addressData));
      } catch (error) {
        console.error('Failed to save address to localStorage:', error);
      }
    }
    // For logged-in users: Address will be saved to DB when order is placed
    // (already handled by saved addresses feature)
  };

  const handlePlaceOrder = async (formData: any, gateway: 'COD' | 'Prepaid') => {
    setIsSubmitting(true);
    
    try {
      // Guard against invalid legacy cart items before sending to backend.
      const invalidItems = cart
        .map((item, index) => ({
          index,
          title: item.name || item.title || `Item ${index + 1}`,
          missingSize: !String(item.selectedSize || '').trim(),
        }))
        .filter((item) => item.missingSize);

      if (invalidItems.length > 0) {
        const details = invalidItems
          .slice(0, 3)
          .map((item) => `${item.title} (missing size)`)
          .join(', ');

        showToast(
          `Some cart items are missing required options (${details}). Please update your cart and try again.`,
          'error'
        );
        setIsSubmitting(false);
        return;
      }

      // Use selected address if available and not using new address, otherwise use form data
      let addressData;
      if (!useNewAddress && selectedAddress) {
        // Use selected saved address
        addressData = {
          firstName: selectedAddress.first_name,
          lastName: selectedAddress.last_name,
          email: user?.email || selectedAddress.email || formData.email,
          phone: selectedAddress.phone || formData.phone,
          address: selectedAddress.address1,
          address2: selectedAddress.address2 || '',
          city: selectedAddress.city,
          state: selectedAddress.province || '',
          zip: selectedAddress.zip,
        };
      } else {
        // Use new address from form
        addressData = {
          ...formData,
          address2: formData.address2 || '',
        };
      }

      const orderDetails = {
        customer: addressData,
        items: cart,
        // Send base amount only; API adds shipping + codFee so COD fee is not applied twice
        total: orderBaseTotal,
        shippingCost: shippingCost,
        codFee: codFee,
      };

      // Step 1: Create order in database
      const result = await api.submitOrder(orderDetails, gateway);
      
      if (!result.success) {
        showToast(result.message || 'There was an issue placing your order. Please try again.', 'error');
        setIsSubmitting(false);
        return;
      }

      // Step 2: Handle payment based on gateway
      if (gateway === 'COD') {
        try {
          sessionStorage.setItem(
            PURCHASE_PAYLOAD_STORAGE_KEY,
            JSON.stringify({
              orderNumber: result.orderNumber,
              value: total,
              currency,
              items: cartToTrackingItems(cart),
            })
          );
        } catch (_) {}
        clearCart();
        navigate(`/order-success?orderNumber=${result.orderNumber}&gateway=COD`);
      } else if (gateway === 'Prepaid') {
        if (!result.orderId || !result.orderNumber) {
          showToast('Order created but payment initialization failed. Please contact support.', 'error');
          setIsSubmitting(false);
          return;
        }

        try {
          try {
            sessionStorage.setItem(
              PURCHASE_PAYLOAD_STORAGE_KEY,
              JSON.stringify({
                orderNumber: result.orderNumber,
                value: total,
                currency,
                items: cartToTrackingItems(cart),
              })
            );
          } catch (_) {}

          const razorpayResponse = await api.createRazorpayOrder(
            result.orderId,
            result.orderNumber,
            total
          );

          if (!razorpayResponse.success || !razorpayResponse.razorpay) {
            throw new Error('Failed to create Razorpay order');
          }

          const { orderId: razorpayOrderId, keyId, amount } = razorpayResponse.razorpay;
          const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001/api';
          const callbackUrl = `${String(apiBase).replace(/\/$/, '')}/payments/callback`;
          const emailParam = addressData.email
            ? `email=${encodeURIComponent(addressData.email)}&`
            : '';
          const cancelUrl = `${window.location.origin}/order-details/${encodeURIComponent(result.orderNumber)}?${emailParam}cancelled=true`;

          const form = document.createElement('form');
          form.method = 'POST';
          form.action = 'https://api.razorpay.com/v1/checkout/embedded';
          form.style.display = 'none';

          const fields = {
            'key_id': keyId,
            'amount': amount.toString(),
            'order_id': razorpayOrderId,
            'name': 'Tinge',
            'description': `Order #${result.orderNumber}`,
            'prefill[name]': `${addressData.firstName} ${addressData.lastName}`,
            'prefill[email]': addressData.email,
            'prefill[contact]': addressData.phone || '',
            'notes[order_id]': result.orderId,
            'notes[order_number]': result.orderNumber,
            'callback_url': callbackUrl,
            'cancel_url': cancelUrl,
          };

          Object.entries(fields).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
          });

          document.body.appendChild(form);
          form.submit();
        } catch (error: any) {
          console.error('Error initializing payment:', error);
          showToast('Failed to initialize payment. Please try again or choose Cash on Delivery.', 'error');
          setIsSubmitting(false);
        }
      }
    } catch (error: any) {
      console.error('Error placing order:', error);
      showToast('There was an issue placing your order. Please try again.', 'error');
      setIsSubmitting(false);
    }
  };
  
  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-10 py-24 text-center max-w-lg">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-secondary">Checkout</p>
        <h1 className="mt-3 font-playfair text-3xl sm:text-4xl font-medium tracking-tight text-brand-primary">
          Your bag is empty.
        </h1>
        <p className="mt-3 text-[15px] text-brand-secondary">
          Explore the gallery or upload your own artwork to get started.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="min-h-[48px] cursor-pointer rounded-full bg-brand-ink px-7 text-sm font-medium text-brand-cream dark:bg-brand-cream dark:text-brand-ink"
          >
            Browse Art
          </button>
          <button
            type="button"
            onClick={() => navigate('/custom-design')}
            className="min-h-[48px] cursor-pointer rounded-full border border-hairline px-7 text-sm font-medium text-brand-primary"
          >
            Upload Your Art
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-bg pb-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-10 pt-8 lg:pt-12">
        {/* Clean editorial checkout header */}
        <div className="mb-8 lg:mb-10 pb-6 border-b border-hairline flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand-coral">Checkout</p>
            <h1 className="mt-2 font-playfair text-3xl sm:text-4xl font-medium tracking-tight text-brand-primary">
              Complete your order
            </h1>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-secondary flex items-center gap-2">
            <ShieldIcon className="w-3.5 h-3.5 text-emerald-500" />
            256-bit SSL · Razorpay Protected
          </p>
        </div>

        {/* Balanced 12-col split: 7 cols shipping & payment, 5 cols sticky order summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <main className="lg:col-span-7 rounded-2xl border border-hairline bg-white dark:bg-brand-surface p-6 sm:p-8">
            {isSubmitting ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-9 w-9 border-2 border-hairline border-t-brand-coral mb-4" />
                <p className="font-playfair text-xl text-brand-primary">
                  {paymentMethod === 'COD'
                    ? 'Confirming your order…'
                    : 'Connecting to Razorpay…'}
                </p>
              </div>
            ) : (
              <>
                {/* Address Selection for Logged-in Users */}
                {isAuthenticated && savedAddresses.length > 0 && !useNewAddress && (
                  <div className="mb-8">
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-coral">Step 01</p>
                    <h2 className="mt-1 font-playfair text-2xl font-medium tracking-tight text-brand-primary mb-4">
                      Select delivery address
                    </h2>
                    <div className="space-y-3 mb-4">
                      {savedAddresses.map((address) => {
                        const active = selectedAddressId === address.id;
                        return (
                          <label
                            key={address.id}
                            className={`flex items-start p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all ${
                              active
                                ? 'border-brand-ink dark:border-brand-cream shadow-[inset_0_0_0_1px_currentColor] text-brand-primary'
                                : 'border-hairline hover:border-brand-secondary'
                            }`}
                          >
                            <input
                              type="radio"
                              name="address"
                              value={address.id}
                              checked={active}
                              onChange={(e) => {
                                setSelectedAddressId(e.target.value);
                                setUseNewAddress(false);
                              }}
                              className="mt-1 mr-3.5 h-4 w-4 accent-brand-coral"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                {address.is_primary && (
                                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] rounded-full border border-hairline px-2.5 py-0.5 text-brand-coral">
                                    Primary
                                  </span>
                                )}
                                {address.label && (
                                  <span className="text-xs font-semibold text-brand-primary">{address.label}</span>
                                )}
                              </div>
                              <p className="text-brand-primary font-medium text-[15px]">
                                {address.first_name} {address.last_name}
                              </p>
                              <p className="text-sm text-brand-secondary mt-0.5">
                                {address.address1}
                                {address.address2 && `, ${address.address2}`}
                              </p>
                              <p className="text-sm text-brand-secondary">
                                {address.city}, {address.province} {address.zip}
                              </p>
                              {address.phone && (
                                <p className="text-xs text-brand-secondary mt-1.5 font-mono">{address.phone}</p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUseNewAddress(true);
                        setSelectedAddressId(null);
                      }}
                      className="w-full min-h-[46px] cursor-pointer rounded-full border border-hairline text-sm font-medium text-brand-primary transition-colors hover:border-brand-ink dark:hover:border-brand-cream"
                    >
                      + Use a different delivery address
                    </button>
                  </div>
                )}

                {/* Form for new address */}
                {(useNewAddress || !isAuthenticated || savedAddresses.length === 0) && (
                  <CheckoutForm
                    onSubmit={handlePlaceOrder}
                    paymentMethod={paymentMethod}
                    onPaymentMethodChange={setPaymentMethod}
                    onAddressSaved={handleAddressSaved}
                    isGuest={!isAuthenticated}
                    currency={currency}
                    codFee={COD_FEE}
                    initialData={selectedAddress && !useNewAddress ? selectedAddress : user ? {
                      email: user.email,
                      first_name: user.name?.split(' ')[0] || '',
                      last_name: user.name?.split(' ').slice(1).join(' ') || '',
                    } : undefined}
                  />
                )}

                {/* Payment & Submit when saved address selected */}
                {isAuthenticated && savedAddresses.length > 0 && !useNewAddress && selectedAddressId && (
                  <div className="mt-6 hidden lg:block space-y-6 pt-6 border-t border-hairline">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-coral">Step 02</p>
                      <h2 className="mt-1 font-playfair text-2xl font-medium tracking-tight text-brand-primary">Payment method</h2>
                    </div>
                    <PaymentMethodSelector
                      selectedMethod={paymentMethod}
                      onMethodChange={setPaymentMethod}
                      codFee={COD_FEE}
                      currency={currency}
                      prepaidOffers={['Free Shipping', 'Instant confirmation', 'No extra charges']}
                    />
                    <button
                      type="button"
                      onClick={() => handlePlaceOrder({}, paymentMethod)}
                      className="flex min-h-[54px] w-full cursor-pointer items-center justify-center rounded-full bg-brand-ink px-8 text-[15px] font-medium text-brand-cream transition-colors hover:bg-black dark:bg-brand-cream dark:text-brand-ink dark:hover:bg-white"
                    >
                      {paymentMethod === 'COD' ? 'Place Order' : 'Proceed to Payment'}
                    </button>
                  </div>
                )}
              </>
            )}
          </main>

          {/* Order Summary - Desktop */}
          <aside className="hidden lg:block lg:col-span-5">
            <div className="rounded-2xl border border-hairline bg-white dark:bg-brand-surface p-6 sm:p-7 lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
              <div className="flex items-baseline justify-between">
                <h2 className="font-playfair text-2xl font-medium tracking-tight text-brand-primary">Order summary</h2>
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-secondary">
                  {cart.reduce((s, i) => s + i.quantity, 0)} {cart.reduce((s, i) => s + i.quantity, 0) === 1 ? 'piece' : 'pieces'}
                </span>
              </div>

              <ul className="mt-6 divide-y divide-hairline">
                {cart.map(item => (
                  <li key={`${item.id}-${item.selectedSize}`} className="flex items-center gap-4 py-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-wall p-1.5">
                      <img
                        src={item.mockupImageUrl || item.imageUrl || item.main_image_url}
                        alt={item.name || item.title}
                        className="h-full w-full rounded-lg object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-medium text-brand-primary line-clamp-2">{item.name || item.title}</h3>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-brand-secondary">
                        {[item.material?.replace('_', ' '), item.selectedSize].filter(Boolean).join(' · ')}
                      </p>
                      <p className="text-xs text-brand-secondary mt-0.5">Qty {item.quantity}</p>
                    </div>
                    <p className="text-[15px] font-medium text-brand-primary tabular-nums shrink-0">
                      {formatCurrency(item.price * item.quantity, currency, { showDecimals: false })}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-5 pt-5 border-t border-hairline space-y-2.5">
                {paymentMethod === 'Prepaid' ? (
                  <>
                    <div className="flex justify-between text-sm text-brand-secondary">
                      <span>Subtotal</span>
                      <span className="line-through tabular-nums">{formatCurrency(subtotal, currency, { showDecimals: false })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Prepaid savings (5%)</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">-{formatCurrency(prepaidSavings, currency, { showDecimals: false })}</span>
                    </div>
                    <div className="flex justify-between text-sm text-brand-secondary">
                      <span>Discounted subtotal</span>
                      <span className="text-brand-primary font-medium tabular-nums">{formatCurrency(discountedSubtotal, currency, { showDecimals: false })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm text-brand-secondary">
                    <span>Subtotal</span>
                    <span className="text-brand-primary tabular-nums">{formatCurrency(subtotal, currency, { showDecimals: false })}</span>
                  </div>
                )}
                {paymentMethod === 'COD' && (
                  <div className="flex justify-between text-sm text-brand-secondary">
                    <span>COD handling</span>
                    <span className="text-brand-primary tabular-nums">{formatCurrency(COD_FEE, currency, { showDecimals: false })}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-brand-secondary">
                  <span>Shipping</span>
                  <span className="text-brand-primary">{shippingCost > 0 ? formatCurrency(shippingCost, currency, { showDecimals: false }) : 'Complimentary'}</span>
                </div>
                <div className="flex justify-between items-baseline text-lg font-medium text-brand-primary pt-3 border-t border-hairline">
                  <span>Total</span>
                  <span className="text-xl tabular-nums">{formatCurrency(total, currency, { showDecimals: false })}</span>
                </div>
                <p className="text-xs text-brand-secondary">Inclusive of all applicable GST.</p>
              </div>

              <div className="mt-6 pt-5 border-t border-hairline space-y-2.5 text-xs text-brand-secondary">
                <div className="flex items-center gap-2.5">
                  <ShieldIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>100% Safe Transit Guarantee (Free 48h replacement)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <PackageIcon className="w-4 h-4 text-brand-primary shrink-0" />
                  <span>Printed in our studio on the exact material you picked</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <SparklesIcon className="w-4 h-4 text-brand-coral shrink-0" />
                  <span>256-bit SSL secure checkout</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Order Summary & Payment - Mobile */}
          <div className="lg:hidden space-y-6">
            <div className="rounded-2xl border border-hairline bg-white dark:bg-brand-surface p-5">
              <h2 className="font-playfair text-xl font-medium tracking-tight text-brand-primary">Order summary</h2>
              <ul className="mt-4 divide-y divide-hairline">
                {cart.map(item => (
                  <li key={`${item.id}-${item.selectedSize}`} className="flex items-center gap-3.5 py-3.5">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-wall p-1">
                      <img
                        src={item.mockupImageUrl || item.imageUrl || item.main_image_url}
                        alt={item.name || item.title}
                        className="h-full w-full rounded-lg object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-brand-primary line-clamp-2">{item.name || item.title}</h3>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-brand-secondary">
                        {[item.material?.replace('_', ' '), item.selectedSize].filter(Boolean).join(' · ')} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-brand-primary tabular-nums shrink-0">
                      {formatCurrency(item.price * item.quantity, currency, { showDecimals: false })}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-hairline space-y-2">
                {paymentMethod === 'Prepaid' ? (
                  <>
                    <div className="flex justify-between text-sm text-brand-secondary">
                      <span>Subtotal</span>
                      <span className="line-through tabular-nums">{formatCurrency(subtotal, currency, { showDecimals: false })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Prepaid savings (5%)</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">-{formatCurrency(prepaidSavings, currency, { showDecimals: false })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm text-brand-secondary">
                    <span>Subtotal</span>
                    <span className="text-brand-primary tabular-nums">{formatCurrency(subtotal, currency, { showDecimals: false })}</span>
                  </div>
                )}
                {paymentMethod === 'COD' && (
                  <div className="flex justify-between text-sm text-brand-secondary">
                    <span>COD handling</span>
                    <span className="text-brand-primary tabular-nums">{formatCurrency(COD_FEE, currency, { showDecimals: false })}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-medium text-brand-primary pt-2 border-t border-hairline">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(total, currency, { showDecimals: false })}</span>
                </div>
              </div>
            </div>

            {!isSubmitting && (
              <div className="rounded-2xl border border-hairline bg-white dark:bg-brand-surface p-5 space-y-5">
                <PaymentMethodSelector
                  selectedMethod={paymentMethod}
                  onMethodChange={setPaymentMethod}
                  codFee={COD_FEE}
                  currency={currency}
                  prepaidOffers={['Free Shipping', 'Instant confirmation', 'No extra charges']}
                />
                {((useNewAddress || !isAuthenticated || savedAddresses.length === 0) || (isAuthenticated && savedAddresses.length > 0 && !useNewAddress && selectedAddressId)) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (useNewAddress || !isAuthenticated || savedAddresses.length === 0) {
                        const form = document.querySelector('form');
                        if (form) form.requestSubmit();
                      } else {
                        handlePlaceOrder({}, paymentMethod);
                      }
                    }}
                    className="flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-full bg-brand-ink px-6 text-[15px] font-medium text-brand-cream dark:bg-brand-cream dark:text-brand-ink"
                  >
                    {paymentMethod === 'COD' ? 'Place Order' : 'Proceed to Payment'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
