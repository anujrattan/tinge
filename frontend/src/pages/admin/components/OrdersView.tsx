import React, { useState, useMemo } from 'react';
import { Card, Button, Input } from '../../../components/ui';
import { ShoppingBagIcon, EditIcon, SearchIcon, ChevronUpIcon, ChevronDownIcon } from '../../../components/icons';
import { formatCurrency, CurrencyCode } from '../../../utils/currency';
import { OrderCard } from './OrderCard';

interface OrdersViewProps {
  orders: any[];
  loading: boolean;
  currency: CurrencyCode;
  onSelectOrder: (order: any) => void;
}

type SortField = 'order_number' | 'status' | null;
type SortDirection = 'asc' | 'desc';
type OrderStatus = 'all' | 'pending' | 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'failed';

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  loading,
  currency,
  onSelectOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Status options
  const statusOptions: { value: OrderStatus; label: string; count?: number }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'failed', label: 'Failed' },
  ];

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Search by order number
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.order_number?.toLowerCase().includes(query)
      );
    }

    // Sort orders
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortField === 'order_number') {
          aValue = a.order_number || '';
          bValue = b.order_number || '';
        } else if (sortField === 'status') {
          aValue = a.status || '';
          bValue = b.status || '';
        }

        // String comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortDirection === 'asc' ? comparison : -comparison;
        }

        return 0;
      });
    }

    return filtered;
  }, [orders, statusFilter, searchQuery, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  // Handle status filter change
  const handleStatusFilter = (status: OrderStatus) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page on filter
  };

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page on search
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="h-16 w-16 bg-white/10 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-white/10 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-white/10 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="p-12 text-center">
        <ShoppingBagIcon className="w-16 h-16 mx-auto mb-4 text-brand-secondary opacity-50" />
        <h3 className="text-xl font-semibold text-brand-primary mb-2">No Orders Yet</h3>
        <p className="text-brand-secondary">Orders will appear here once customers place them</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card className="p-4 border-white/10">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-brand-secondary" />
            <Input
              type="text"
              placeholder="Search by order number..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 w-full"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => {
              const count = option.value === 'all' 
                ? orders.length 
                : orders.filter(o => o.status === option.value).length;
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleStatusFilter(option.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    statusFilter === option.value
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                      : 'bg-white dark:bg-brand-surface text-brand-secondary hover:text-brand-primary border border-gray-200 dark:border-white/10 hover:border-purple-400/50'
                  }`}
                >
                  {option.label}
                  {count > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                      statusFilter === option.value
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 dark:bg-white/10 text-brand-secondary'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Orders - Mobile Card View */}
      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
        {paginatedOrders.length === 0 ? (
          <Card className="p-12 text-center col-span-full">
            <p className="text-brand-secondary">
              {searchQuery || statusFilter !== 'all'
                ? 'No orders found matching your criteria'
                : 'No orders found'}
            </p>
          </Card>
        ) : (
          paginatedOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              currency={currency}
              onSelectOrder={onSelectOrder}
            />
          ))
        )}
      </div>

      {/* Orders - Desktop Table View */}
      <Card className="hidden lg:block overflow-hidden border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-brand-primary uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('order_number')}
                    className="flex items-center gap-1 hover:text-purple-400 transition-colors"
                  >
                    Order #
                    {sortField === 'order_number' && (
                      sortDirection === 'asc' ? (
                        <ChevronUpIcon className="w-4 h-4" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4" />
                      )
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-brand-primary uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-brand-primary uppercase tracking-wider">Items</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-brand-primary uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-brand-primary uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center justify-center gap-1 hover:text-purple-400 transition-colors mx-auto"
                  >
                    Status
                    {sortField === 'status' && (
                      sortDirection === 'asc' ? (
                        <ChevronUpIcon className="w-4 h-4" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4" />
                      )
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-brand-primary uppercase tracking-wider">Payment</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-brand-primary uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-brand-primary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-brand-surface divide-y divide-white/10">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <p className="text-brand-secondary">
                      {searchQuery || statusFilter !== 'all'
                        ? 'No orders found matching your criteria'
                        : 'No orders found'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const isNewOrder = order.status === 'pending';
                  const paymentDisplay = order.gateway === 'COD' ? 'COD' : (order.payment_status?.toUpperCase() || 'PENDING');
                  
                  return (
              <tr 
                key={order.id} 
                className={`hover:bg-white/5 transition-colors group ${
                  isNewOrder ? 'bg-red-500/5 border-l-4 border-l-red-500' : ''
                }`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-brand-primary">{order.order_number}</span>
                    {isNewOrder && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30">
                        NEW
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-brand-primary">
                      {order.users?.first_name} {order.users?.last_name}
                    </p>
                    <p className="text-xs text-brand-secondary">{order.users?.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-sm text-brand-primary">{order.items?.length || 0} items</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-sm font-semibold text-brand-primary">
                    {formatCurrency(order.total_amount, currency)}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    order.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                    order.status === 'shipped' ? 'bg-purple-500/20 text-purple-400' :
                    order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {order.status?.toUpperCase() || 'PENDING'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    paymentDisplay === 'COD' ? 'bg-purple-500/20 text-purple-400' :
                    paymentDisplay === 'PAID' ? 'bg-green-500/20 text-green-400' :
                    paymentDisplay === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {paymentDisplay}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-xs text-brand-secondary">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <Button 
                    variant="ghost" 
                    onClick={() => onSelectOrder(order)}
                    className="p-2 hover:bg-purple-500/10"
                    aria-label="View order details"
                  >
                    <EditIcon className="w-4 h-4 text-brand-secondary group-hover:text-purple-400" />
                  </Button>
                </td>
              </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination - Shared between mobile and desktop views */}
      {totalPages > 1 && (
        <Card className="p-4 border-white/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-brand-secondary">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-brand-primary bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                            : 'text-brand-primary bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return <span key={page} className="px-2 text-brand-secondary">...</span>;
                  }
                  return null;
                })}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-brand-primary bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

