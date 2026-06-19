import React from 'react';
import { Button } from '../../../components/ui';
import { PlusIcon } from '../../../components/icons';
import { AdminTab } from '../types';

interface AdminHeaderProps {
  activeTab: AdminTab;
  onAddNew: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ activeTab, onAddNew }) => {
  const getTitle = () => {
    switch (activeTab) {
      case 'categories':
        return 'Categories';
      case 'collections':
        return 'Collections';
      case 'products':
        return 'Products';
      case 'orders':
        return 'Orders';
      case 'returns':
        return 'Returns';
      case 'analytics':
        return 'Analytics';
      case 'content':
        return 'Content';
      case 'systems':
        return 'Systems Go';
      default:
        return '';
    }
  };

  const getDescription = () => {
    switch (activeTab) {
      case 'categories':
        return 'Manage product categories';
      case 'collections':
        return 'Manage merchandising collections';
      case 'products':
        return 'Manage your product catalog';
      case 'orders':
        return 'View and manage customer orders';
      case 'returns':
        return 'Review return requests and process refunds';
      case 'analytics':
        return 'Monitor order flow, revenue and partner performance';
      case 'content':
        return 'Create and update blog posts and FAQ entries for SEO';
      case 'systems':
        return 'Check Supabase, Redis, payments, and integration health';
      default:
        return '';
    }
  };

  const showAddButton =
    activeTab !== 'orders' &&
    activeTab !== 'returns' &&
    activeTab !== 'analytics' &&
    activeTab !== 'content' &&
    activeTab !== 'systems';
  const addButtonLabel =
    activeTab === 'products'
      ? 'Product'
      : activeTab === 'collections'
      ? 'Collection'
      : 'Category';

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-brand-primary mb-1">
            {getTitle()}
          </h2>
          <p className="text-brand-secondary">
            {getDescription()}
          </p>
        </div>
        {showAddButton && (
          <Button 
            onClick={onAddNew}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl flex items-center gap-2 whitespace-nowrap"
          >
            <PlusIcon className="w-5 h-5" />
            Add {addButtonLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

