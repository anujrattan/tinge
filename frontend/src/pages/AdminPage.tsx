import React, { useState, useEffect, useMemo } from "react";
import { Product, Category, Collection } from "../types";
import api from "../services/api";
import { Card, Button } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { useApp } from "../context/AppContext";
import { AdminAnalyticsPage } from "./AdminAnalyticsPage";
import { ProductForm } from "./admin/components/ProductForm";
import { CategoryForm } from "./admin/components/CategoryForm";
import { CollectionsView } from "./admin/components/CollectionsView";
import { CollectionForm } from "./admin/components/CollectionForm";
import { AdminHeader } from "./admin/components/AdminHeader";
import { AdminSidebar } from "./admin/components/AdminSidebar";
import { CategoriesView } from "./admin/components/CategoriesView";
import { ProductsView } from "./admin/components/ProductsView";
import { OrdersView } from "./admin/components/OrdersView";
import { OrderDetailView } from "./admin/components/OrderDetailView";
import { ContentView } from "./admin/components/ContentView";
import { useAdminData } from "./admin/hooks/useAdminData";
import { useAdminOrders } from "./admin/hooks/useAdminOrders";
import { AdminTab } from "./admin/types";
import { Modal } from "../components/Modal";
import { ArrowLeftIcon } from "../components/icons";
import { PrintroveSyncModal, PrintrovePrefill } from "./admin/components/PrintroveSyncModal";

export const AdminPage: React.FC = () => {
  const { currency } = useApp();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>("categories");
  const [showForm, setShowForm] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [failedCategoryImages, setFailedCategoryImages] = useState<Set<string>>(
    new Set()
  );
  const [failedProductImages, setFailedProductImages] = useState<Set<string>>(
    new Set()
  );
  const [failedCollectionImages, setFailedCollectionImages] = useState<Set<string>>(
    new Set()
  );
  const [productIdToDelete, setProductIdToDelete] = useState<string | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [productIdsToDeleteBulk, setProductIdsToDeleteBulk] = useState<string[] | null>(null);
  const [categoryIdToDelete, setCategoryIdToDelete] = useState<string | null>(null);
  const [collectionIdToDelete, setCollectionIdToDelete] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [printrovePrefill, setPrintrovePrefill] = useState<PrintrovePrefill | null>(null);
  const [collectionsLoading, setCollectionsLoading] = useState<boolean>(false);

  // Use custom hooks for data management
  const {
    products,
    categories,
    productsLoading,
    categoriesLoading,
    refetchAll,
  } = useAdminData();

  const fetchCollections = async () => {
    try {
      setCollectionsLoading(true);
      const data = await api.getAllCollectionsAdmin();
      setCollections(data);
    } catch (error: any) {
      console.error("Error fetching collections:", error);
      showToast(error?.message || "Failed to load collections.", "error");
    } finally {
      setCollectionsLoading(false);
    }
  };

  // Fetch collections once on mount so product form dropdown has data
  useEffect(() => {
    fetchCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter products by search (title, description)
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return products;
    const q = productSearchQuery.trim().toLowerCase();
    return products.filter(
      (p) =>
        (p.title || p.name || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    );
  }, [products, productSearchQuery]);

  const {
    orders,
    selectedOrder,
    orderProducts,
    ordersLoading,
    isSaving,
    fetchOrders,
    selectOrder,
    clearSelection,
    saveOrderChanges,
  } = useAdminOrders();

  // Refetch data when switching tabs
  useEffect(() => {
    if (activeTab === "products" && !productsLoading) {
      refetchAll();
    } else if (activeTab === "orders") {
      fetchOrders();
    } else if (activeTab === "collections") {
      fetchCollections();
    }
  }, [activeTab]);

  const handleDeleteClick = (id: string) => {
    setProductIdToDelete(id);
  };

  const handleDeleteConfirm = async () => {
    if (!productIdToDelete) return;
    try {
      await api.deleteProduct(productIdToDelete);
      setProductIdToDelete(null);
      await refetchAll();
      showToast("Product deleted.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to delete product.", "error");
    }
  };

  const handleDeleteModalClose = () => {
    setProductIdToDelete(null);
  };

  const handleProductToggleSelect = (id: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleProductSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProductIds(new Set(filteredProducts.map((p) => p.id)));
    } else {
      setSelectedProductIds(new Set());
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedProductIds.size === 0) return;
    setProductIdsToDeleteBulk(Array.from(selectedProductIds));
  };

  const handleBulkDeleteConfirm = async () => {
    if (!productIdsToDeleteBulk || productIdsToDeleteBulk.length === 0) return;
    try {
      await Promise.all(productIdsToDeleteBulk.map((id) => api.deleteProduct(id)));
      setProductIdsToDeleteBulk(null);
      setSelectedProductIds(new Set());
      await refetchAll();
      showToast(`${productIdsToDeleteBulk.length} product(s) deleted.`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to delete some products.", "error");
    }
  };

  const handleBulkDeleteModalClose = () => {
    setProductIdsToDeleteBulk(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setPrintrovePrefill(null);
    setShowForm(true);
  };

  const handlePrefillFromPrintrove = (data: PrintrovePrefill) => {
    setEditingProduct(null);
    setPrintrovePrefill(data);
    setShowSyncModal(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    setShowForm(false);
    setShowCategoryModal(false);
    setShowCollectionModal(false);
    setEditingProduct(null);
    setEditingCategory(null);
    setEditingCollection(null);
    setPrintrovePrefill(null);
    await Promise.all([refetchAll(), fetchCollections()]);
  };

  const handleCancel = () => {
    setShowForm(false);
    setShowCategoryModal(false);
    setShowCollectionModal(false);
    setEditingProduct(null);
    setEditingCategory(null);
    setEditingCollection(null);
    setPrintrovePrefill(null);
  };

  const handleCategoryModalClose = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
  };

  const handleCollectionModalClose = () => {
    setShowCollectionModal(false);
    setEditingCollection(null);
  };

  const handleCategoryDeleteClick = (id: string) => {
    setCategoryIdToDelete(id);
  };

  const handleCategoryDeleteConfirm = async () => {
    if (!categoryIdToDelete) return;
    try {
      await api.deleteCategory(categoryIdToDelete);
      setCategoryIdToDelete(null);
      await refetchAll();
      showToast("Category deleted.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to delete category.", "error");
    }
  };

  const handleCategoryDeleteModalClose = () => {
    setCategoryIdToDelete(null);
  };

  const handleCollectionDeleteClick = (id: string) => {
    setCollectionIdToDelete(id);
  };

  const handleCollectionDeleteConfirm = async () => {
    if (!collectionIdToDelete) return;
    try {
      await api.deleteCollection(collectionIdToDelete);
      setCollectionIdToDelete(null);
      await fetchCollections();
      showToast("Collection deleted.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to delete collection.", "error");
    }
  };

  const handleCollectionDeleteModalClose = () => {
    setCollectionIdToDelete(null);
  };

  const handleCategoryEdit = (category: Category) => {
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const handleCategoryAddNew = () => {
    setEditingCategory(null);
    setShowCategoryModal(true);
  };

  const handleCollectionEdit = (collection: Collection) => {
    setEditingCollection(collection);
    setShowCollectionModal(true);
  };

  const handleCollectionAddNew = () => {
    setEditingCollection(null);
    setShowCollectionModal(true);
  };

  // Calculate stats
  const totalCategories = categories.length;
  const totalProducts = products.length;
  const totalOrders = orders.length;

  // Calculate order stats by status
  const ordersByStatus = {
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => o.status === "processing").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
    failed: orders.filter((o) => o.status === "failed").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-brand-bg dark:via-brand-bg dark:to-purple-900/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Full Width Header */}
        <div className="mb-8">
          <h1 className="text-5xl md:text-6xl font-display font-bold mb-3 text-brand-primary dark:bg-gradient-to-r dark:from-purple-400 dark:via-pink-500 dark:to-purple-600 dark:bg-clip-text dark:text-transparent">
            Admin Console
          </h1>
          <p className="text-lg md:text-xl text-brand-secondary font-medium mb-4">
            Manage your store's categories and products
          </p>
          {/* Back Button - Only show when in form view */}
          {showForm && (
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-brand-primary bg-white dark:bg-brand-surface border-2 border-purple-500 dark:border-purple-400 rounded-lg hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 dark:hover:from-purple-500/20 dark:hover:to-pink-500/20 hover:border-purple-600 dark:hover:border-purple-300 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              aria-label="Go back to products list"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Back to Products</span>
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          {!showForm && (
            <AdminSidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              totalCategories={totalCategories}
              totalProducts={totalProducts}
              totalOrders={totalOrders}
              ordersByStatus={ordersByStatus}
            />
          )}

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {showForm ? (
              // Product Form View (still full screen for now)
              <ProductForm
                product={editingProduct}
                prefill={printrovePrefill}
                onSave={handleSave}
                onCancel={handleCancel}
                categories={categories}
                collections={collections}
                onProductTypeChange={(type) => {
                  if (type === 'poster') setPrintrovePrefill(null);
                }}
              />
            ) : (
              <>
                {/* Header Section */}
            <AdminHeader
              activeTab={activeTab}
              onAddNew={
                activeTab === "products"
                  ? handleAddNew
                  : activeTab === "categories"
                  ? handleCategoryAddNew
                  : activeTab === "collections"
                  ? handleCollectionAddNew
                  : () => {}
              }
            />

                {/* Content Views */}
                {activeTab === "categories" ? (
                  <CategoriesView
                    categories={categories}
                    loading={categoriesLoading}
                    failedCategoryImages={failedCategoryImages}
                    onImageError={(id) =>
                      setFailedCategoryImages((prev) => new Set(prev).add(id))
                    }
                    onEdit={handleCategoryEdit}
                    onDelete={handleCategoryDeleteClick}
                    onAddNew={handleCategoryAddNew}
                  />
                ) : activeTab === "collections" ? (
                  <CollectionsView
                    collections={collections}
                    loading={collectionsLoading}
                    failedCollectionImages={failedCollectionImages}
                    onImageError={(id) =>
                      setFailedCollectionImages((prev) => new Set(prev).add(id))
                    }
                    onEdit={handleCollectionEdit}
                    onDelete={handleCollectionDeleteClick}
                    onAddNew={handleCollectionAddNew}
                  />
                ) : activeTab === "products" ? (
                  <ProductsView
                    products={filteredProducts}
                    categories={categories}
                    loading={productsLoading}
                    currency={currency}
                    failedProductImages={failedProductImages}
                    onImageError={(id) =>
                      setFailedProductImages((prev) => new Set(prev).add(id))
                    }
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                    onAddNew={handleAddNew}
                    onSyncFromPrintrove={() => setShowSyncModal(true)}
                    searchQuery={productSearchQuery}
                    onSearchChange={setProductSearchQuery}
                    selectedIds={selectedProductIds}
                    onToggleSelect={handleProductToggleSelect}
                    onSelectAll={handleProductSelectAll}
                    onBulkDelete={handleBulkDeleteClick}
                  />
                ) : activeTab === "analytics" ? (
                  <div className="space-y-6">
                    <AdminAnalyticsPage />
                  </div>
                ) : activeTab === "orders" ? (
                  selectedOrder ? (
                    <OrderDetailView
                      order={selectedOrder}
                      orderProducts={orderProducts}
                      currency={currency}
                      onClose={clearSelection}
                      onSave={saveOrderChanges}
                      isSaving={isSaving}
                    />
                  ) : (
                    <OrdersView
                      orders={orders}
                      loading={ordersLoading}
                      currency={currency}
                      onSelectOrder={selectOrder}
                    />
                  )
                ) : activeTab === "content" ? (
                  <ContentView />
                ) : null}
              </>
            )}
          </main>

          {/* Category Modal */}
          <Modal
            isOpen={showCategoryModal}
            onClose={handleCategoryModalClose}
            title={editingCategory ? "Edit Category" : "Add Category"}
            size="2xl"
          >
            <CategoryForm
              category={editingCategory}
              onSave={handleSave}
              onCancel={handleCategoryModalClose}
            />
          </Modal>

          {/* Collection Modal */}
          <Modal
            isOpen={showCollectionModal}
            onClose={handleCollectionModalClose}
            title={editingCollection ? "Edit Collection" : "Add Collection"}
            size="2xl"
          >
            <CollectionForm
              collection={editingCollection}
              onSave={handleSave}
              onCancel={handleCollectionModalClose}
            />
          </Modal>

          {/* Delete category confirmation modal */}
          <Modal
            isOpen={categoryIdToDelete !== null}
            onClose={handleCategoryDeleteModalClose}
            title="Delete category"
            size="sm"
            closeOnBackdropClick={true}
          >
            <div className="space-y-4">
              <p className="text-brand-secondary">
                Are you sure you want to permanently delete{" "}
                <strong className="text-brand-primary">
                  {categories.find((c) => c.id === categoryIdToDelete)?.name || "this category"}
                </strong>
                ? This cannot be undone. You can only delete a category when it has no products.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCategoryDeleteModalClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700 text-white border-0"
                  onClick={handleCategoryDeleteConfirm}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Modal>

          {/* Delete collection confirmation modal */}
          <Modal
            isOpen={collectionIdToDelete !== null}
            onClose={handleCollectionDeleteModalClose}
            title="Delete collection"
            size="sm"
            closeOnBackdropClick={true}
          >
            <div className="space-y-4">
              <p className="text-brand-secondary">
                Are you sure you want to permanently delete{" "}
                <strong className="text-brand-primary">
                  {collections.find((c) => c.id === collectionIdToDelete)?.name || "this collection"}
                </strong>
                ? This cannot be undone. Products will be unlinked from this collection but remain available.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCollectionDeleteModalClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700 text-white border-0"
                  onClick={handleCollectionDeleteConfirm}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Modal>

          {/* Delete product confirmation modal */}
          <Modal
            isOpen={productIdToDelete !== null}
            onClose={handleDeleteModalClose}
            title="Delete product"
            size="sm"
            closeOnBackdropClick={true}
          >
            <div className="space-y-4">
              <p className="text-brand-secondary">
                Are you sure you want to delete{" "}
                <strong className="text-brand-primary">
                  {products.find((p) => p.id === productIdToDelete)?.title || "this product"}
                </strong>
                ? This cannot be undone.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDeleteModalClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700 text-white border-0"
                  onClick={handleDeleteConfirm}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Modal>

          {/* Bulk delete products confirmation modal */}
          <Modal
            isOpen={productIdsToDeleteBulk !== null && productIdsToDeleteBulk.length > 0}
            onClose={handleBulkDeleteModalClose}
            title="Delete products"
            size="sm"
            closeOnBackdropClick={true}
          >
            <div className="space-y-4">
              <p className="text-brand-secondary">
                Are you sure you want to delete{" "}
                <strong className="text-brand-primary">
                  {productIdsToDeleteBulk?.length} product{productIdsToDeleteBulk?.length === 1 ? "" : "s"}
                </strong>
                ? This cannot be undone.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBulkDeleteModalClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700 text-white border-0"
                  onClick={handleBulkDeleteConfirm}
                >
                  Delete {productIdsToDeleteBulk?.length}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Printrove Sync Modal */}
          {showSyncModal && (
            <PrintroveSyncModal
              onClose={() => setShowSyncModal(false)}
              onPrefill={handlePrefillFromPrintrove}
              onImportComplete={refetchAll}
            />
          )}
        </div>
      </div>
    </div>
  );
};
