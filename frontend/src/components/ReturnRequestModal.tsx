import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button, Input, Select } from './ui';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

interface EligibleItem {
  order_item_id: string;
  product_name: string;
  size?: string;
  color?: string;
  quantity: number;
  eligible: boolean;
  reason?: string;
}

interface ReturnRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  email?: string | null;
  onSuccess: () => void;
}

const REASONS = [
  { value: 'defective', label: 'Defective or damaged' },
  { value: 'wrong_item', label: 'Wrong item received' },
  { value: 'wrong_size', label: 'Wrong size ordered' },
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'other', label: 'Other' },
];

export const ReturnRequestModal: React.FC<ReturnRequestModalProps> = ({
  isOpen,
  onClose,
  orderNumber,
  email,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<EligibleItem[]>([]);
  const [orderItemId, setOrderItemId] = useState('');
  const [type, setType] = useState<'refund' | 'exchange'>('refund');
  const [reason, setReason] = useState('defective');
  const [reasonDetail, setReasonDetail] = useState('');
  const [exchangeSize, setExchangeSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.getReturnEligibility(orderNumber, email || undefined);
        const eligible = (res.items || []).filter((i: EligibleItem) => i.eligible);
        setItems(eligible);
        if (eligible.length > 0) {
          setOrderItemId(eligible[0].order_item_id);
          setQuantity(1);
        }
      } catch (err: any) {
        showToast(err?.message || 'Could not load return eligibility', 'error');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen, orderNumber, email, onClose, showToast]);

  const selectedItem = items.find((i) => i.order_item_id === orderItemId);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB', 'error');
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await api.uploadReturnPhoto(dataUrl, orderNumber);
      if (res.url) {
        setPhotoUrls((prev) => [...prev, res.url]);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to upload photo', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderItemId) {
      showToast('Please select an item', 'error');
      return;
    }
    if (type === 'exchange' && !exchangeSize.trim()) {
      showToast('Please enter the size you want', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.createReturnRequest({
        order_number: orderNumber,
        order_item_id: orderItemId,
        type,
        reason,
        reason_detail: reasonDetail.trim() || undefined,
        exchange_size: type === 'exchange' ? exchangeSize.trim() : undefined,
        quantity,
        photo_urls: photoUrls,
        email: email || undefined,
      });
      showToast('Return request submitted. We will review it shortly.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit return', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request a return">
      {loading ? (
        <div className="py-8 text-center text-brand-secondary text-sm">Checking eligibility…</div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-brand-secondary text-sm">
            No items are eligible for return on this order. Returns must be requested within 7 days of delivery.
          </p>
          <Button onClick={onClose} className="mt-4" variant="outline">
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-primary mb-1">Item</label>
            <Select
              value={orderItemId}
              onChange={(e) => {
                setOrderItemId(e.target.value);
                const item = items.find((i) => i.order_item_id === e.target.value);
                setQuantity(1);
                if (item?.size) setExchangeSize(item.size);
              }}
            >
              {items.map((item) => (
                <option key={item.order_item_id} value={item.order_item_id}>
                  {item.product_name}
                  {item.size ? ` · ${item.size}` : ''}
                  {item.color ? ` · ${item.color}` : ''}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-primary mb-1">Request type</label>
            <Select value={type} onChange={(e) => setType(e.target.value as 'refund' | 'exchange')}>
              <option value="refund">Refund</option>
              <option value="exchange">Exchange</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-primary mb-1">Reason</label>
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>

          {type === 'exchange' && (
            <div>
              <label className="block text-sm font-medium text-brand-primary mb-1">Exchange size</label>
              <Input
                value={exchangeSize}
                onChange={(e) => setExchangeSize(e.target.value)}
                placeholder="e.g. M, L, XL"
                required
              />
            </div>
          )}

          {selectedItem && selectedItem.quantity > 1 && (
            <div>
              <label className="block text-sm font-medium text-brand-primary mb-1">Quantity</label>
              <Select
                value={String(quantity)}
                onChange={(e) => setQuantity(Number(e.target.value))}
              >
                {Array.from({ length: selectedItem.quantity }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-brand-primary mb-1">Additional details (optional)</label>
            <textarea
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-brand-surface px-3 py-2 text-sm text-brand-primary"
              placeholder="Describe the issue…"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-primary mb-1">Photos (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              className="text-sm text-brand-secondary"
            />
            {photoUrls.length > 0 && (
              <p className="text-xs text-brand-secondary mt-1">{photoUrls.length} photo(s) attached</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || uploading} className="flex-1">
              {submitting ? 'Submitting…' : 'Submit request'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
