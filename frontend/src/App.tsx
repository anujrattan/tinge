import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { trackPageView } from "./utils/gtm";
import { AppProvider, useApp } from "./context/AppContext";
import { ToastProvider, useToast } from "./context/ToastContext";
import { Toaster } from "./components/Toaster";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ScrollToTop } from "./components/ScrollToTop";
import { HomePage } from "./pages/HomePage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { ProductListPage } from "./pages/ProductListPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { SearchPage } from "./pages/SearchPage";
import { WishlistPage } from "./pages/WishlistPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { LoginPage } from "./pages/LoginPage";
import { AuthPage } from "./pages/AuthPage";
import { AdminPage } from "./pages/AdminPage";
import { ProfilePage } from "./pages/ProfilePage";
import { OrdersPage } from "./pages/OrdersPage";
import { OrderDetailsPage } from "./pages/OrderDetailsPage";
import { GuestOrderLookupPage } from "./pages/GuestOrderLookupPage";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { BestSellersPage } from "./pages/BestSellersPage";
import { NewArrivalsPage } from "./pages/NewArrivalsPage";
import { SaleItemsPage } from "./pages/SaleItemsPage";
import { FAQPage } from "./pages/FAQPage";
import { CollectionsPage } from "./pages/CollectionsPage";
import { CollectionDetailPage } from "./pages/CollectionDetailPage";
import { BlogIndexPage } from "./pages/BlogIndexPage";
import { BlogPostPage } from "./pages/BlogPostPage";
import { ShippingPage } from "./pages/ShippingPage";
import { ReturnsPage } from "./pages/ReturnsPage";
import { SizeGuidePage } from "./pages/SizeGuidePage";
import { CustomDesignPage } from "./pages/CustomDesignPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { TermsOfServicePage } from "./pages/TermsOfServicePage";
import { ReturnPolicyPage } from "./pages/ReturnPolicyPage";
import { CookiePolicyPage } from "./pages/CookiePolicyPage";
import { OrderSuccessPage } from "./pages/OrderSuccessPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { CookieConsentProvider, useCookieConsent } from "./context/CookieConsentContext";
import { CookieConsent } from "./components/CookieConsent";
import { AnalyticsProvider } from "./context/AnalyticsProvider";
import { useNavigate, useLocation } from "react-router-dom";

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAdmin } = useApp();
  const navigate = useNavigate();

  if (!isAdmin) {
    navigate("/auth");
    return null;
  }

  return <>{children}</>;
};

// App Layout Component
const AppLayout: React.FC = () => {
  const { cartItemCount, cartAnimationKey, isAdmin } = useApp();
  const { toasts, removeToast } = useToast();
  const location = useLocation();
  const { isAllowed } = useCookieConsent();
  const analyticsAllowed = isAllowed('analytics');
  const marketingAllowed = isAllowed('marketing');
  const trackingConsentGranted = analyticsAllowed || marketingAllowed;

  // SPA page view tracking for GTM/GA4/Meta
  useEffect(() => {
    if (!trackingConsentGranted) return;
    const pagePath = location.pathname + location.search;
    const pageTitle = document.title || `Luxe Threads - ${location.pathname.slice(1) || "Home"}`;
    trackPageView({ path: pagePath, title: pageTitle });
  }, [location.pathname, location.search, trackingConsentGranted]);

  // Determine current page for header highlighting
  const currentPage = location.pathname.split("/")[1] || "home";
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen flex flex-col font-sans bg-brand-bg">
      <Toaster toasts={toasts} onClose={removeToast} />
      <CookieConsent />
      <Header
        cartItemCount={cartItemCount}
        currentPage={currentPage}
        cartAnimationKey={cartAnimationKey}
      />
      <main className="flex-grow pt-20 md:pt-24">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/category/:slug" element={<ProductListPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment-callback" element={<OrderSuccessPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/best-sellers" element={<BestSellersPage />} />
          <Route path="/new-arrivals" element={<NewArrivalsPage />} />
          <Route path="/sale" element={<SaleItemsPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/collections/:slug" element={<CollectionDetailPage />} />
          <Route path="/blog" element={<BlogIndexPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/shipping" element={<ShippingPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/size-guide" element={<SizeGuidePage />} />
          <Route path="/custom-design" element={<CustomDesignPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/return-policy" element={<ReturnPolicyPage />} />
          <Route path="/cookie-policy" element={<CookiePolicyPage />} />
          <Route path="/order-success" element={<OrderSuccessPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route
            path="/order-details/:orderNumber"
            element={<OrderDetailsPage />}
          />
          <Route
            path="/guest-order-lookup"
            element={<GuestOrderLookupPage />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppProvider>
        <CookieConsentProvider>
          <ToastProvider>
            <AnalyticsProvider>
              <ScrollToTop />
              <AppLayout />
            </AnalyticsProvider>
          </ToastProvider>
        </CookieConsentProvider>
      </AppProvider>
    </BrowserRouter>
  );
};

export default App;
