import React, { useState } from 'react';
import { Card, Button, Input, Select } from '../../../components/ui';
import { XIcon } from '../../../components/icons';
import { formatCurrency, CurrencyCode } from '../../../utils/currency';

interface ReturnDetailViewProps {
  returnRequest: any;
  currency: CurrencyCode;
  onClose: () => void;
  onSave: (
    returnId: string,
    payload: {
      status: string;
      notes?: string;
      return_ship_to?: string;
      return_ship_instructions?: string;
      rejection_reason?: string;
      partner_claim_ref?: string;
      partner_filed?: boolean;
      manual_refund_ref?: string;
      process_refund?: boolean;
    }
  ) => Promise<{ success: boolean; message?: string }>;
  isSaving: boolean;
}

const STATUSES = [
  'pending_review',
  'approved',
  'awaiting_shipment',
  'in_transit',
  'received',
  'completed',
  'rejected',
  'cancelled',
];

export const ReturnDetailView: React.FC<ReturnDetailViewProps> = ({
  returnRequest,
  currency,
  onClose,
  onSave,
  isSaving,
}) => {
  const [status, setStatus] = useState(returnRequest.status || 'pending_review');
  const [notes, setNotes] = useState(returnRequest.admin_notes || '');
  const [returnShipTo, setReturnShipTo] = useState(returnRequest.return_ship_to || '');
  const [returnShipInstructions, setReturnShipInstructions] = useState(
    returnRequest.return_ship_instructions || ''
  );
  const [rejectionReason, setRejectionReason] = useState(returnRequest.rejection_reason || '');
  const [partnerClaimRef, setPartnerClaimRef] = useState(returnRequest.partner_claim_ref || '');
  const [partnerFiled, setPartnerFiled] = useState(Boolean(returnRequest.partner_filed));
  const [manualRefundRef, setManualRefundRef] = useState(returnRequest.manual_refund_ref || '');

  const partnerHint =
    returnRequest.fulfillment_partner === 'Printrove'
      ? 'Check Printrove Manage Returns / support for defect claims.'
      : returnRequest.fulfillment_partner === 'Qikink'
      ? 'Check Qikink Returns tab for RTO / defect claims.'
      : 'Coordinate with fulfillment partner manually.';

  const handleSave = async () => {
    const payload: Parameters<ReturnDetailViewProps['onSave']>[1] = {
      status,
      notes: notes.trim() || undefined,
      return_ship_to: returnShipTo.trim() || undefined,
      return_ship_instructions: returnShipInstructions.trim() || undefined,
      partner_claim_ref: partnerClaimRef.trim() || undefined,
      partner_filed: partnerFiled,
    };

    if (status === 'rejected') {
      payload.rejection_reason = rejectionReason.trim() || undefined;
    }

    if (status === 'completed' && returnRequest.type === 'refund') {
      payload.process_refund = true;
      if (returnRequest.gateway === 'COD') {
        payload.manual_refund_ref = manualRefundRef.trim() || undefined;
      }
    }

    return onSave(returnRequest.id, payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <Card className="w-full max-w-2xl my-8 p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-brand-secondary hover:text-brand-primary"
          aria-label="Close"
        >
          <XIcon className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-display font-bold text-brand-primary mb-1">
          {returnRequest.return_number || 'Return request'}
        </h2>
        <p className="text-sm text-brand-secondary mb-6">
          Order #{returnRequest.order_number} · {returnRequest.product_name}
          {returnRequest.size ? ` · ${returnRequest.size}` : ''}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-brand-secondary">Type</p>
            <p className="text-brand-primary font-medium capitalize">{returnRequest.type}</p>
          </div>
          <div>
            <p className="text-brand-secondary">Reason</p>
            <p className="text-brand-primary font-medium">{returnRequest.reason?.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-brand-secondary">Refund amount</p>
            <p className="text-brand-primary font-medium">
              {formatCurrency(Number(returnRequest.refund_amount || 0), currency, { showDecimals: false })}
            </p>
          </div>
          <div>
            <p className="text-brand-secondary">Partner</p>
            <p className="text-brand-primary font-medium">{returnRequest.fulfillment_partner || '—'}</p>
          </div>
        </div>

        {returnRequest.reason_detail && (
          <p className="text-sm text-brand-secondary mb-4 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
            {returnRequest.reason_detail}
          </p>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-primary mb-1">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>
          </div>

          {status === 'approved' && (
            <>
              <div>
                <label className="block text-sm font-medium text-brand-primary mb-1">Return ship-to address</label>
                <Input value={returnShipTo} onChange={(e) => setReturnShipTo(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-primary mb-1">Return instructions</label>
                <textarea
                  value={returnShipInstructions}
                  onChange={(e) => setReturnShipInstructions(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-brand-surface px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          {status === 'rejected' && (
            <div>
              <label className="block text-sm font-medium text-brand-primary mb-1">Rejection reason</label>
              <Input value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
            </div>
          )}

          {status === 'completed' && returnRequest.type === 'refund' && returnRequest.gateway === 'COD' && (
            <div>
              <label className="block text-sm font-medium text-brand-primary mb-1">Manual refund reference (UPI/bank)</label>
              <Input value={manualRefundRef} onChange={(e) => setManualRefundRef(e.target.value)} />
            </div>
          )}

          <div className="p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
            <p className="text-xs text-brand-secondary mb-2">{partnerHint}</p>
            <label className="flex items-center gap-2 text-sm text-brand-primary mb-2">
              <input
                type="checkbox"
                checked={partnerFiled}
                onChange={(e) => setPartnerFiled(e.target.checked)}
              />
              Filed with partner
            </label>
            <Input
              value={partnerClaimRef}
              onChange={(e) => setPartnerClaimRef(e.target.value)}
              placeholder="Partner claim reference"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-primary mb-1">Admin notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-brand-surface px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
