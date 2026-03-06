import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Card, Select } from '../components/ui';
import { formatCurrency } from '../utils/currency';
import { ShoppingBagIcon, DollarSignIcon, TrendingUpIcon, ReceiptIcon, BoxIcon } from '../components/icons';
import { LineChart } from '../components/LineChart';

type Granularity = 'day' | 'week' | 'month';

type Preset = 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom';

const formatDateForInput = (date: Date) => {
  // Format as YYYY-MM-DD in local timezone (not UTC)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value: string) => {
  // Parse YYYY-MM-DD as local date (not UTC)
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const AdminAnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);

  const [preset, setPreset] = useState<Preset>('today');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const applyPreset = (p: Preset) => {
    const now = new Date();
    // Use local date to avoid timezone issues
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (p === 'today') {
      // Today only
      setFromDate(formatDateForInput(today));
      setToDate(formatDateForInput(today));
      setGranularity('day');
    } else if (p === 'last7') {
      // Last 7 days including today (today - 6 days = 7 days total)
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      setFromDate(formatDateForInput(from));
      setToDate(formatDateForInput(today));
      setGranularity('day');
    } else if (p === 'last30') {
      // Last 30 days including today (today - 29 days = 30 days total)
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      setFromDate(formatDateForInput(from));
      setToDate(formatDateForInput(today));
      setGranularity('day');
    } else if (p === 'thisMonth') {
      // From first day of month to today
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(formatDateForInput(from));
      setToDate(formatDateForInput(today));
      setGranularity('day');
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: { from?: string; to?: string; granularity?: Granularity } = {};
      if (fromDate) {
        // Start of day (00:00:00) in local timezone, then convert to UTC ISO string
        const from = parseDateInput(fromDate);
        from.setHours(0, 0, 0, 0);
        params.from = from.toISOString();
      }
      if (toDate) {
        // End of day (23:59:59.999) in local timezone, then convert to UTC ISO string - inclusive
        const to = parseDateInput(toDate);
        to.setHours(23, 59, 59, 999);
        params.to = to.toISOString();
      }
      params.granularity = granularity;

      const response = await api.getAnalyticsOverview(params);
      if (!response.success) {
        throw new Error(response.message || 'Failed to load analytics');
      }
      setData(response);
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyPreset('today');
  }, []);

  useEffect(() => {
    if (fromDate && toDate) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, granularity]);

  const summary = data?.summary || {};
  const byStatus = data?.by_status || {};
  const byPayment = data?.by_payment_method || {};
  const byPartner = data?.by_fulfillment_partner || {};
  const byProduct = data?.by_product || [];
  const byCategory = data?.by_category || [];
  
  // Fill in missing dates with 0 values
  const fillMissingDates = (timeseriesData: any[]) => {
    if (!timeseriesData || timeseriesData.length === 0 || !fromDate || !toDate) {
      return timeseriesData;
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);
    const filledData: any[] = [];
    
    // Create a map of existing data points
    const dataMap = new Map(
      timeseriesData.map(item => [item.period, item])
    );

    // Generate all dates in the range
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateKey = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (dataMap.has(dateKey)) {
        filledData.push(dataMap.get(dateKey));
      } else {
        // Add missing date with 0 values
        filledData.push({
          period: dateKey,
          total_orders: 0,
          delivered_orders: 0,
          revenue: 0,
        });
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return filledData;
  };

  const timeseries = fillMissingDates(data?.timeseries || []);

  // Status color mapping
  const getStatusColor = (status: string) => {
    const colors: Record<string, { dot: string; bg: string; text: string }> = {
      delivered: { dot: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-700 dark:text-green-400' },
      pending: { dot: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400' },
      processing: { dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400' },
      confirmed: { dot: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400' },
      shipped: { dot: 'bg-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400' },
      cancelled: { dot: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400' },
      failed: { dot: 'bg-gray-500', bg: 'bg-gray-50 dark:bg-gray-500/10', text: 'text-gray-700 dark:text-gray-400' },
    };
    return colors[status.toLowerCase()] || { dot: 'bg-gray-500', bg: 'bg-gray-50 dark:bg-gray-500/10', text: 'text-gray-700 dark:text-gray-400' };
  };

  return (
    <div className="space-y-6">

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={() => { setPreset('today'); applyPreset('today'); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            preset === 'today' 
              ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700' 
              : 'bg-white dark:bg-brand-surface text-brand-primary border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => { setPreset('last7'); applyPreset('last7'); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            preset === 'last7' 
              ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700' 
              : 'bg-white dark:bg-brand-surface text-brand-primary border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
          }`}
        >
          Last 7 days
        </button>
        <button
          onClick={() => { setPreset('last30'); applyPreset('last30'); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            preset === 'last30' 
              ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700' 
              : 'bg-white dark:bg-brand-surface text-brand-primary border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
          }`}
        >
          Last 30 days
        </button>
        <button
          onClick={() => { setPreset('thisMonth'); applyPreset('thisMonth'); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            preset === 'thisMonth' 
              ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700' 
              : 'bg-white dark:bg-brand-surface text-brand-primary border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
          }`}
        >
          This month
        </button>
        <button
          onClick={() => setPreset('custom')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            preset === 'custom' 
              ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700' 
              : 'bg-white dark:bg-brand-surface text-brand-primary border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
          }`}
        >
          Custom
        </button>

        {/* Date Inputs - Only show when custom is selected */}
        {preset === 'custom' && (
          <>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPreset('custom'); }}
              className="bg-white dark:bg-brand-surface border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 text-sm text-brand-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-brand-secondary">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPreset('custom'); }}
              className="bg-white dark:bg-brand-surface border border-gray-300 dark:border-white/10 rounded-md px-3 py-2 text-sm text-brand-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </>
        )}
      </div>

      {loading && (
        <Card className="p-6 bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10">
          <p className="text-brand-secondary">Loading analytics...</p>
        </Card>
      )}

      {error && !loading && (
        <Card className="p-6 border-red-500/30 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/30">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </Card>
      )}

      {!loading && !error && data && (
        <>
          {/* Order Flow Trend Chart */}
          <Card className="p-6 bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 shadow-sm">
            <h2 className="text-xl font-bold text-brand-primary mb-4">Order Flow Trend</h2>
            <LineChart data={timeseries} />
          </Card>

          {/* Primary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Orders */}
            <div className="bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-medium text-brand-secondary">Total Orders</p>
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <ShoppingBagIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-brand-primary mb-1">{summary.total_orders || 0}</p>
              <p className="text-sm text-brand-secondary">
                {summary.delivered_orders || 0} delivered
              </p>
            </div>

            {/* Total Revenue */}
            <div className="bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-medium text-brand-secondary">Total Revenue</p>
                <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
                  <DollarSignIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-brand-primary mb-1">
                {formatCurrency(summary.total_revenue || 0, 'INR')}
              </p>
              <p className="text-sm text-brand-secondary">
                Avg: {formatCurrency(summary.average_order_value || 0, 'INR')}
              </p>
            </div>

            {/* Delivered Revenue */}
            <div className="bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-medium text-brand-secondary">Delivered Revenue</p>
                <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUpIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-brand-primary mb-1">
                {formatCurrency(summary.delivered_revenue || 0, 'INR')}
              </p>
              <p className="text-sm text-brand-secondary">
                {summary.total_orders
                  ? `${(Math.round((summary.delivered_orders || 0) / (summary.total_orders || 1) * 1000) / 10)}% conversion`
                  : '0% conversion'}
              </p>
            </div>

            {/* Tax Collected */}
            <div className="bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-medium text-brand-secondary">Tax Collected (GST)</p>
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <ReceiptIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-brand-primary mb-1">
                {formatCurrency(summary.total_tax || 0, 'INR')}
              </p>
              <p className="text-sm text-brand-secondary">
                From {summary.total_orders || 0} orders
              </p>
            </div>

            {/* COD Fees Collected */}
            <div className="bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-medium text-brand-secondary">COD Fees Collected</p>
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <ReceiptIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-brand-primary mb-1">
                {formatCurrency(summary.total_cod_fee || 0, 'INR')}
              </p>
              <p className="text-sm text-brand-secondary">
                From {(data?.by_payment_method?.COD?.count ?? data?.by_payment_method?.Cod?.count ?? 0) || 0} COD orders
              </p>
            </div>
          </div>

          {/* Order Flow Analysis */}
          <div className="bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <BoxIcon className="w-6 h-6 text-brand-primary" />
              <h2 className="text-xl font-bold text-brand-primary">Order Flow Analysis</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(byStatus).map(([status, value]: any) => {
                const percentage = summary.total_orders 
                  ? Math.round((value.count / summary.total_orders) * 1000) / 10
                  : 0;
                const colors = getStatusColor(status);
                return (
                  <div key={status} className={`${colors.bg} border border-gray-200 dark:border-white/10 p-6 rounded-xl text-left`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-3 h-3 ${colors.dot} rounded-full`}></div>
                    </div>
                    <p className="text-4xl font-bold text-brand-primary mb-2">{value.count}</p>
                    <p className="text-base font-semibold text-brand-primary capitalize mb-1">{status}</p>
                    <p className="text-sm text-brand-secondary">{percentage}%</p>
                  </div>
                );
              })}
              {Object.keys(byStatus).length === 0 && (
                <p className="col-span-full text-sm text-brand-secondary text-center py-4">No orders in this range.</p>
              )}
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payment Method */}
            <div className="bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-brand-primary mb-6">Revenue by Payment Method</h2>
              <div className="space-y-5">
                {Object.entries(byPayment).map(([method, value]: any) => {
                  const percentage = summary.total_revenue 
                    ? Math.round((value.revenue / summary.total_revenue) * 100)
                    : 0;
                  const colorClass = method.toLowerCase() === 'prepaid' ? 'bg-blue-500' : 'bg-green-500';
                  return (
                    <div key={method}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-base font-medium text-brand-primary">{method}</span>
                        <span className="text-base font-bold text-brand-primary">
                          {formatCurrency(value.revenue || 0, 'INR')} <span className="text-sm font-normal text-brand-secondary">· {value.count} orders</span>
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colorClass} rounded-full`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(byPayment).length === 0 && (
                  <p className="text-sm text-brand-secondary">No payment data in this range.</p>
                )}
              </div>
            </div>

            {/* Fulfillment Partner */}
            <div className="bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-brand-primary mb-6">Revenue by Fulfillment Partner</h2>
              <div className="space-y-5">
                {Object.entries(byPartner).map(([partner, value]: any, index: number) => {
                  const percentage = summary.total_revenue 
                    ? Math.round((value.revenue / summary.total_revenue) * 100)
                    : 0;
                  const colors = ['bg-teal-500', 'bg-blue-500', 'bg-cyan-500'];
                  const colorClass = colors[index % colors.length];
                  return (
                    <div key={partner}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-base font-medium text-brand-primary">
                          {partner || 'Unassigned'}
                        </span>
                        <span className="text-base font-bold text-brand-primary">
                          {formatCurrency(value.revenue || 0, 'INR')} <span className="text-sm font-normal text-brand-secondary">· {value.count} orders</span>
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colorClass} rounded-full`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(byPartner).length === 0 && (
                  <p className="text-sm text-brand-secondary">No partner data in this range.</p>
                )}
              </div>
            </div>
          </div>

          {/* Top Products & Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Products */}
            <div className="bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-brand-primary mb-6">Top Products by Revenue</h2>
              <div className="space-y-4">
                {byProduct.slice(0, 10).map((p: any, index: number) => {
                  const badgeColors = [
                    'bg-gradient-to-br from-pink-500 to-rose-600',
                    'bg-gradient-to-br from-blue-500 to-cyan-600',
                    'bg-gradient-to-br from-green-500 to-emerald-600',
                    'bg-gradient-to-br from-orange-500 to-amber-600',
                  ];
                  const badgeColor = badgeColors[index % badgeColors.length];
                  return (
                    <div key={p.product_id} className="flex items-center gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 ${badgeColor} rounded-full flex items-center justify-center text-white text-base font-bold shadow-md`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-brand-primary truncate">{p.product_name}</p>
                        <p className="text-sm text-brand-secondary">
                          {p.total_quantity} units · {p.total_orders} orders
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-bold text-brand-primary">
                          {formatCurrency(p.total_revenue || 0, 'INR')}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {byProduct.length === 0 && (
                  <p className="text-sm text-brand-secondary">No product data in this range.</p>
                )}
              </div>
            </div>

            {/* Top Categories */}
            <div className="bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-brand-primary mb-6">Top Categories by Revenue</h2>
              <div className="space-y-4">
                {byCategory.map((c: any, index: number) => {
                  const badgeColors = [
                    'bg-gradient-to-br from-blue-500 to-indigo-600',
                    'bg-gradient-to-br from-teal-500 to-cyan-600',
                    'bg-gradient-to-br from-green-500 to-emerald-600',
                  ];
                  const badgeColor = badgeColors[index % badgeColors.length];
                  return (
                    <div key={c.category_id} className="flex items-center gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 ${badgeColor} rounded-full flex items-center justify-center text-white text-base font-bold shadow-md`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-brand-primary">{c.category_name}</p>
                        <p className="text-sm text-brand-secondary">
                          {c.total_quantity} units · {c.total_orders} orders
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-bold text-brand-primary">
                          {formatCurrency(c.total_revenue || 0, 'INR')}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {byCategory.length === 0 && (
                  <p className="text-sm text-brand-secondary">No category data in this range.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
