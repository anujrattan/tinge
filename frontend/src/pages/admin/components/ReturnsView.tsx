import React from 'react';
import { Card } from '../../../components/ui';
import { Undo2Icon } from '../../../components/icons';

const STATUS_LABELS: Record<string, string> = {
  pending_review: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  awaiting_shipment: 'Awaiting shipment',
  in_transit: 'In transit',
  received: 'Received',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

interface ReturnsViewProps {
  returns: any[];
  loading: boolean;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onSelectReturn: (row: any) => void;
}

export const ReturnsView: React.FC<ReturnsViewProps> = ({
  returns,
  loading,
  statusFilter,
  onStatusFilterChange,
  onSelectReturn,
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse h-20 bg-gray-100 dark:bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onStatusFilterChange('')}
          className={`px-3 py-1.5 text-xs rounded-lg border ${
            !statusFilter
              ? 'bg-brand-accent text-white border-brand-accent'
              : 'border-gray-200 dark:border-white/20 text-brand-secondary'
          }`}
        >
          All
        </button>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => onStatusFilterChange(key)}
            className={`px-3 py-1.5 text-xs rounded-lg border ${
              statusFilter === key
                ? 'bg-brand-accent text-white border-brand-accent'
                : 'border-gray-200 dark:border-white/20 text-brand-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {returns.length === 0 ? (
        <Card className="p-12 text-center">
          <Undo2Icon className="w-12 h-12 mx-auto text-brand-secondary/40 mb-4" />
          <p className="text-brand-secondary">No return requests found.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {returns.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelectReturn(row)}
              className="w-full text-left"
            >
              <Card className="p-4 hover:border-brand-accent/40 transition-colors border border-gray-200 dark:border-white/10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-primary">
                      {row.return_number || 'Pending RAN'}
                    </p>
                    <p className="text-sm text-brand-secondary mt-0.5">
                      Order #{row.order_number} · {row.product_name}
                    </p>
                    <p className="text-xs text-brand-secondary mt-1">
                      {row.type === 'exchange' ? 'Exchange' : 'Refund'} · {row.reason?.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    {STATUS_LABELS[row.status] || row.status}
                  </span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
