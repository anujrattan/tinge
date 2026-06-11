import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Input } from '../components/ui';
import { PaymentMethodSelector } from '../components/PaymentMethodSelector';
import { UserIcon, MailIcon, SmartphoneIcon, MapPinIcon, ChevronDownIcon } from '../components/icons';
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-playfair text-xl font-medium tracking-tight text-brand-primary">Delivery Details</h2>
              <p className="text-xs text-brand-secondary mt-1">Review your contact and shipping information.</p>
            </div>
            <Button
              type="button"
              onClick={handleEdit}
              variant="outline"
              className="text-xs sm:text-sm whitespace-nowrap"
            >
              Edit Address
            </Button>
          </div>

          <div className="rounded-xl border-2 border-gray-200 dark:border-white/20 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/20 p-6 space-y-5 shadow-sm">
            {/* Contact Information Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-[11px] font-semibold text-brand-primary uppercase tracking-[0.22em]">Contact Information</h3>
              </div>
              <div className="ml-10 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-brand-primary">
                    {formData.firstName} {formData.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-brand-secondary">
                  <MailIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span className="break-all">{formData.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-brand-secondary">
                  <SmartphoneIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span>{formData.countryCode} {formData.phone}</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-white/20 to-transparent" />

            {/* Shipping Address Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <MapPinIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-[11px] font-semibold text-brand-primary uppercase tracking-[0.22em]">Shipping Address</h3>
              </div>
              <div className="ml-10 space-y-2">
                <p className="text-sm text-brand-primary font-medium">
                  {formData.address}
                  {formData.address2 ? `, ${formData.address2}` : ''}
                </p>
                <p className="text-sm text-brand-secondary">
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
      
      {/* Payment Method Selection - Only show after address is saved AND not currently editing */}
      {isAddressSaved && !isEditing && (
        <div className="hidden lg:block">
          <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onMethodChange={onPaymentMethodChange}
            codFee={codFee}
            currency={currency}
            prepaidOffers={['Free Shipping', 'Instant confirmation', 'No extra charges']}
          />
        
          {/* Place Order Button - Shows after address is saved and payment method selected */}
          <Button 
            type="button"
            onClick={handlePlaceOrder}
            className="w-full md:w-1/2 md:mx-auto py-3 mt-6"
          >
            {paymentMethod === 'COD' ? 'Place Order' : 'Proceed to Payment'}
          </Button>
        </div>
      )}
      
      {/* Save Address Button - Shows when editing (new address or re-editing saved address) */}
      {(!isAddressSaved || (isAddressSaved && isEditing)) && (
        <Button type="submit" className="w-full py-3" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Address'}
        </Button>
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
          missingColor:
            item.category_product_type !== 'poster' &&
            !String(item.selectedColor || '').trim(),
        }))
        .filter((item) => item.missingSize || item.missingColor);

      if (invalidItems.length > 0) {
        const details = invalidItems
          .slice(0, 3)
          .map((item) => {
            const missing = [
              item.missingSize ? 'size' : '',
              item.missingColor ? 'color' : '',
            ]
              .filter(Boolean)
              .join(' & ');
            return `${item.title} (missing ${missing})`;
          })
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
          const callbackUrl = `${process.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/payments/callback`;
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
            'name': 'Tinge Clothing',
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="font-playfair text-2xl font-medium tracking-tight text-brand-primary">Your cart is empty.</h1>
        <Button onClick={() => navigate('/')} className="mt-6">Go to Homepage</Button>
      </div>
    );
  }

  return (
    <div className="bg-brand-bg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-12">
          <main className="lg:col-span-3 bg-brand-surface p-8 rounded-lg shadow-sm border border-white/10">
            {isSubmitting ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
                <p className="text-brand-primary">
                  {paymentMethod === 'COD' 
                    ? 'Placing your order...' 
                    : 'Redirecting to payment gateway...'}
                </p>
              </div>
            ) : (
              <>
                {/* Address Selection for Logged-in Users */}
                {isAuthenticated && savedAddresses.length > 0 && !useNewAddress && (
                  <div className="mb-6">
                    <h2 className="font-playfair text-xl font-medium tracking-tight text-brand-primary mb-4">Select Delivery Address</h2>
                    <div className="space-y-3 mb-4">
                      {savedAddresses.map((address) => (
                        <label
                          key={address.id}
                          className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedAddressId === address.id
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-white/20 bg-brand-surface hover:border-purple-500/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="address"
                            value={address.id}
                            checked={selectedAddressId === address.id}
                            onChange={(e) => {
                              setSelectedAddressId(e.target.value);
                              setUseNewAddress(false);
                            }}
                            className="mt-1 mr-3 w-4 h-4 text-purple-600 focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {address.is_primary && (
                                <span className="text-xs font-medium text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded">
                                  Primary
                                </span>
                              )}
                              {address.label && (
                                <span className="text-sm font-semibold text-brand-primary">
                                  {address.label}
                                </span>
                              )}
                            </div>
                            <p className="text-brand-primary font-medium">
                              {address.first_name} {address.last_name}
                            </p>
                            <p className="text-sm text-brand-secondary">
                              {address.address1}
                              {address.address2 && `, ${address.address2}`}
                            </p>
                            <p className="text-sm text-brand-secondary">
                              {address.city}, {address.province} {address.zip}
                            </p>
                            {address.phone && (
                              <p className="text-sm text-brand-secondary mt-1">Phone: {address.phone}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setUseNewAddress(true);
                        setSelectedAddressId(null);
                      }}
                      className="w-full mb-6"
                    >
                      + Use Different Delivery Address
                    </Button>
                  </div>
                )}

                {/* Show form for new address or if no saved addresses */}
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

                {/* Show payment method and submit button if address is selected */}
                {isAuthenticated && savedAddresses.length > 0 && !useNewAddress && selectedAddressId && (
                  <div className="mt-6 hidden lg:block">
                    <PaymentMethodSelector
                      selectedMethod={paymentMethod}
                      onMethodChange={setPaymentMethod}
                      codFee={COD_FEE}
                      currency={currency}
                      prepaidOffers={['Free Shipping', 'Instant confirmation', 'No extra charges']}
                    />
                    <Button
                      onClick={() => handlePlaceOrder({}, paymentMethod)}
                      className="w-full md:w-1/2 md:mx-auto py-3 mt-6"
                    >
                      {paymentMethod === 'COD' ? 'Place Order' : 'Proceed to Payment'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
          
          {/* Order Summary - Desktop (right sidebar, sticky within container) */}
          <aside className="hidden lg:block lg:col-span-2">
            <div className="bg-brand-surface p-6 rounded-lg shadow-sm border border-white/10 lg:sticky lg:top-8 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <h2 className="font-playfair text-xl font-medium tracking-tight text-brand-primary">Order Summary</h2>
              <ul className="mt-6 divide-y divide-white/10">
                {cart.map(item => (
                  <li key={item.id} className="flex items-center gap-4 py-4">
                    <img
                      src={item.imageUrl || item.main_image_url}
                      alt={item.name || item.title}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg object-cover flex-shrink-0 bg-gray-100 border border-gray-200/70 dark:border-white/10"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-brand-primary line-clamp-2">{item.name || item.title}</h3>
                      <p className="text-sm text-brand-secondary mt-1">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-brand-primary flex-shrink-0">{formatCurrency(item.price * item.quantity, currency, { showDecimals: false })}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
                {paymentMethod === 'Prepaid' ? (
                  <>
                    <div className="flex justify-between text-sm text-brand-secondary">
                      <span>Subtotal</span>
                      <span className="line-through text-brand-secondary/80">{formatCurrency(subtotal, currency, { showDecimals: false })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Extra 5% off (Prepaid)</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">-{formatCurrency(prepaidSavings, currency, { showDecimals: false })}</span>
                    </div>
                    <div className="flex justify-between text-sm text-brand-secondary">
                      <span>Price after discount</span>
                      <span className="text-brand-primary font-medium">{formatCurrency(discountedSubtotal, currency, { showDecimals: false })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm text-brand-secondary">
                    <span>Subtotal</span>
                    <span className="text-brand-primary">{formatCurrency(subtotal, currency, { showDecimals: false })}</span>
                  </div>
                )}
                {paymentMethod === 'COD' && (
                  <div className="flex justify-between text-sm text-brand-secondary">
                    <span>COD Handling Fee</span>
                    <span className="text-brand-primary">{formatCurrency(COD_FEE, currency, { showDecimals: false })}</span>
                  </div>
                )}
                {shippingCost > 0 && (
                  <div className="flex justify-between text-sm text-brand-secondary">
                    <span>Shipping</span>
                    <span className="text-brand-primary">{formatCurrency(shippingCost, currency, { showDecimals: false })}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-medium text-brand-primary pt-2 border-t border-white/10">
                  <span>Total</span>
                  <span>{formatCurrency(total, currency, { showDecimals: false })}</span>
                </div>
                <p className="text-xs text-brand-secondary">
                  Prices are inclusive of all applicable GST.
                </p>
              </div>
            </div>
          </aside>
          
          {/* Order Summary & Payment - Mobile (below form) */}
          <div className="lg:hidden mt-8">
            {/* Order Summary */}
            <div className="bg-brand-surface p-6 rounded-lg shadow-sm border border-white/10 mb-6">
              <h2 className="font-playfair text-xl font-medium tracking-tight text-brand-primary">Order Summary</h2>
              <ul className="mt-6 divide-y divide-white/10">
                {cart.map(item => (
                  <li key={item.id} className="flex items-center gap-4 py-4">
                    <img
                      src={item.imageUrl || item.main_image_url}
                      alt={item.name || item.title}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg object-cover flex-shrink-0 bg-gray-100 border border-gray-200/70 dark:border-white/10"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-brand-primary line-clamp-2">{item.name || item.title}</h3>
                      <p className="text-sm text-brand-secondary mt-1">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-brand-primary flex-shrink-0">{formatCurrency(item.price * item.quantity, currency, { showDecimals: false })}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
                {paymentMethod === 'Prepaid' ? (
                  <>
                    <div className="flex justify-between text-sm text-brand-secondary">
                      <span>Subtotal</span>
                      <span className="line-through text-brand-secondary/80">{formatCurrency(subtotal, currency, { showDecimals: false })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Extra 5% off (Prepaid)</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">-{formatCurrency(prepaidSavings, currency, { showDecimals: false })}</span>
                    </div>
                    <div className="flex justify-between text-sm text-brand-secondary">
                      <span>Price after discount</span>
                      <span className="text-brand-primary font-medium">{formatCurrency(discountedSubtotal, currency, { showDecimals: false })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm text-brand-secondary">
                    <span>Subtotal</span>
                    <span className="text-brand-primary">{formatCurrency(subtotal, currency, { showDecimals: false })}</span>
                  </div>
                )}
                {paymentMethod === 'COD' && (
                  <div className="flex justify-between text-sm text-brand-secondary">
                    <span>COD Handling Fee</span>
                    <span className="text-brand-primary">{formatCurrency(COD_FEE, currency, { showDecimals: false })}</span>
                  </div>
                )}
                {shippingCost > 0 && (
                  <div className="flex justify-between text-sm text-brand-secondary">
                    <span>Shipping</span>
                    <span className="text-brand-primary">{formatCurrency(shippingCost, currency, { showDecimals: false })}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-medium text-brand-primary pt-2 border-t border-white/10">
                  <span>Total</span>
                  <span>{formatCurrency(total, currency, { showDecimals: false })}</span>
                </div>
                <p className="text-xs text-brand-secondary">
                  Prices are inclusive of all applicable GST.
                </p>
              </div>
            </div>
            
            {/* Payment Method - Mobile */}
            {!isSubmitting && (
              <div className="bg-brand-surface p-6 rounded-lg shadow-sm border border-white/10">
                <PaymentMethodSelector
                  selectedMethod={paymentMethod}
                  onMethodChange={setPaymentMethod}
                  codFee={COD_FEE}
                  currency={currency}
                  prepaidOffers={['Free Shipping', 'Instant confirmation', 'No extra charges']}
                />
                
                {/* Place Order Button - Mobile */}
                {((useNewAddress || !isAuthenticated || savedAddresses.length === 0) || (isAuthenticated && savedAddresses.length > 0 && !useNewAddress && selectedAddressId)) && (
                  <Button
                    onClick={() => {
                      if (useNewAddress || !isAuthenticated || savedAddresses.length === 0) {
                        // Trigger form submission via form element
                        const form = document.querySelector('form');
                        if (form) {
                          form.requestSubmit();
                        }
                      } else {
                        handlePlaceOrder({}, paymentMethod);
                      }
                    }}
                    className="w-full py-3 mt-6"
                  >
                    {paymentMethod === 'COD' ? 'Place Order' : 'Proceed to Payment'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
