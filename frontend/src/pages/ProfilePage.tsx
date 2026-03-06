import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../components/ui';
import api from '../services/api';
import { useApp } from '../context/AppContext';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useApp();
  const [profile, setProfile] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [formData, setFormData] = useState({
    label: '',
    first_name: '',
    last_name: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    province: '',
    zip: '',
    country_code: 'IN',
  });
  const [formErrors, setFormErrors] = useState<Partial<typeof formData>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.getUserProfile();
      if (response.success) {
        setProfile(response.profile);
        setAddresses(response.addresses || []);
        // If only one address, mark it as primary automatically
        if (response.addresses && response.addresses.length === 1 && !response.addresses[0].is_primary) {
          await api.setPrimaryAddress(response.addresses[0].id);
          setAddresses([{ ...response.addresses[0], is_primary: true }]);
        }
      } else {
        setError('Failed to load profile');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    fetchProfile();
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors({ ...formErrors, [name]: undefined });
    }
  };

  const validateForm = () => {
    const errors: Partial<typeof formData> = {};
    if (!formData.first_name.trim()) errors.first_name = 'First name is required';
    if (!formData.last_name.trim()) errors.last_name = 'Last name is required';
    if (!formData.address1.trim()) errors.address1 = 'Address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.zip.trim()) errors.zip = 'ZIP code is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      if (editingAddress) {
        // Update address
        const response = await api.updateAddress(editingAddress.id, formData);
        if (response.success) {
          await fetchProfile();
          setEditingAddress(null);
          setShowAddForm(false);
          resetForm();
        }
      } else {
        // Create address
        // If first address, set as primary
        const isFirst = addresses.length === 0;
        const response = await api.createAddress({
          ...formData,
          is_primary: isFirst,
        });
        if (response.success) {
          await fetchProfile();
          setShowAddForm(false);
          resetForm();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save address');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      label: '',
      first_name: '',
      last_name: '',
      phone: '',
      address1: '',
      address2: '',
      city: '',
      province: '',
      zip: '',
      country_code: 'IN',
    });
    setFormErrors({});
  };

  const handleEdit = (address: any) => {
    setEditingAddress(address);
    setFormData({
      label: address.label || '',
      first_name: address.first_name,
      last_name: address.last_name,
      phone: address.phone || '',
      address1: address.address1,
      address2: address.address2 || '',
      city: address.city,
      province: address.province || '',
      zip: address.zip,
      country_code: address.country_code || 'IN',
    });
    setShowAddForm(true);
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const response = await api.deleteAddress(addressId);
      if (response.success) {
        await fetchProfile();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete address');
    }
  };

  const handleSetPrimary = async (addressId: string) => {
    try {
      const response = await api.setPrimaryAddress(addressId);
      if (response.success) {
        await fetchProfile();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to set primary address');
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingAddress(null);
    resetForm();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
        <p className="mt-4 text-brand-secondary">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-brand-primary mb-2">My Profile</h1>
          <p className="text-brand-secondary">Manage your account information</p>
        </div>

        {/* Profile Information */}
        <div className="bg-brand-surface rounded-lg border border-white/10 p-6 mb-6">
          <h2 className="text-xl font-semibold text-brand-primary mb-4">Account Information</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-brand-secondary">Name</label>
              <p className="text-brand-primary font-medium">{profile?.name || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm text-brand-secondary">Email</label>
              <p className="text-brand-primary font-medium">{profile?.email || 'Not set'}</p>
            </div>
            {profile?.phone && (
              <div>
                <label className="text-sm text-brand-secondary">Phone</label>
                <p className="text-brand-primary font-medium">{profile.phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Addresses */}
        <div className="bg-brand-surface rounded-lg border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-brand-primary">Saved Addresses</h2>
            {!showAddForm && (
              <Button onClick={() => setShowAddForm(true)} variant="outline" className="text-sm">
                + Add Address
              </Button>
            )}
          </div>

          {/* Add/Edit Address Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-brand-surface border border-white/10 rounded-lg">
              <h3 className="text-lg font-semibold text-brand-primary mb-4">
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-secondary mb-1">
                    Label (e.g., Home, Office)
                  </label>
                  <Input
                    type="text"
                    name="label"
                    value={formData.label}
                    onChange={handleInputChange}
                    placeholder="Home, Office, etc."
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-secondary mb-1">
                      First Name *
                    </label>
                    <Input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      required
                    />
                    {formErrors.first_name && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.first_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-secondary mb-1">
                      Last Name *
                    </label>
                    <Input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      required
                    />
                    {formErrors.last_name && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.last_name}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-secondary mb-1">
                    Phone
                  </label>
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-secondary mb-1">
                    Address Line 1 *
                  </label>
                  <Input
                    type="text"
                    name="address1"
                    value={formData.address1}
                    onChange={handleInputChange}
                    required
                  />
                  {formErrors.address1 && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.address1}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-secondary mb-1">
                    Address Line 2
                  </label>
                  <Input
                    type="text"
                    name="address2"
                    value={formData.address2}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-secondary mb-1">
                      City *
                    </label>
                    <Input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                    />
                    {formErrors.city && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.city}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-secondary mb-1">
                      State / Province
                    </label>
                    <Input
                      type="text"
                      name="province"
                      value={formData.province}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-secondary mb-1">
                      ZIP Code *
                    </label>
                    <Input
                      type="text"
                      name="zip"
                      value={formData.zip}
                      onChange={handleInputChange}
                      required
                    />
                    {formErrors.zip && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.zip}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-secondary mb-1">
                    Country
                  </label>
                  <Input
                    type="text"
                    name="country_code"
                    value={formData.country_code}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : editingAddress ? 'Update Address' : 'Save Address'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Address List */}
          {addresses.length === 0 && !showAddForm ? (
            <div className="text-center py-8">
              <p className="text-brand-secondary mb-4">No saved addresses yet</p>
              <Button onClick={() => setShowAddForm(true)} variant="outline">
                Add Your First Address
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`p-4 rounded-lg border ${
                    address.is_primary
                      ? 'border-brand-primary bg-brand-primary/5'
                      : 'border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {address.is_primary && (
                          <span className="inline-block px-2 py-1 text-xs font-medium text-brand-primary bg-brand-primary/10 rounded">
                            Primary
                          </span>
                        )}
                        {address.label && (
                          <span className="text-sm font-semibold text-brand-primary">
                            {address.label}
                          </span>
                        )}
                      </div>
                      <p className="text-brand-primary font-medium mb-1">
                        {address.first_name} {address.last_name}
                      </p>
                      <p className="text-sm text-brand-secondary mb-1">
                        {address.address1}
                        {address.address2 && `, ${address.address2}`}
                      </p>
                      <p className="text-sm text-brand-secondary">
                        {address.city}, {address.province} {address.zip}
                      </p>
                      {address.country_code && (
                        <p className="text-sm text-brand-secondary">{address.country_code}</p>
                      )}
                      {address.phone && (
                        <p className="text-sm text-brand-secondary mt-1">Phone: {address.phone}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {!address.is_primary && addresses.length > 1 && (
                        <Button
                          variant="ghost"
                          onClick={() => handleSetPrimary(address.id)}
                          className="text-xs py-1 px-2"
                        >
                          Set Primary
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => handleEdit(address)}
                        className="text-xs py-1 px-2"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleDelete(address.id)}
                        className="text-xs py-1 px-2 text-red-400 hover:text-red-300"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

