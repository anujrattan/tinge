import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ShoppingBagIcon,
  HeartIcon,
  UserIcon,
  ChevronDownIcon,
  LogOutIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  XIcon,
  SearchIcon,
  ClockIcon,
  ArrowRightIcon,
  SparklesIcon,
  TagIcon,
} from "./icons";
import { Category } from "../types";
import api from "../services/api";
import { useApp } from "../context/AppContext";
import { useSearch } from "../hooks/useSearch";
import { formatCurrency } from "../utils/currency";

interface HeaderProps {
  cartItemCount: number;
  currentPage: string;
  cartAnimationKey: number;
}

// Hamburger Icon Component
const HamburgerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({
  cartItemCount,
  currentPage,
  cartAnimationKey,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    isAuthenticated,
    isAdmin,
    logout,
    theme,
    toggleTheme,
    currency,
    wishlistItemCount,
  } = useApp();
  const isHomePage = location.pathname === "/";
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);

  // On homepage: use hero nav style (black links for light banner) only while header is over the hero; after scroll use theme-aware style
  const HERO_SCROLL_THRESHOLD = 320;
  useEffect(() => {
    if (!isHomePage) {
      setScrolledPastHero(false);
      return;
    }
    const onScroll = () => setScrolledPastHero(window.scrollY > HERO_SCROLL_THRESHOLD);
    onScroll(); // set initial
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHomePage]);

  const useHeroNavStyle = isHomePage && !scrolledPastHero; // light hero → black nav text and icons
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Use search hook for suggestions and recent searches
  const {
    suggestions,
    loading: suggestionsLoading,
    recentSearches,
    saveSearch,
    removeRecentSearch,
    fetchSuggestions,
  } = useSearch();

  useEffect(() => {
    const fetchCategories = async () => {
      const data = await api.getCategories();
      setCategories(data);
    };
    fetchCategories();
  }, []);

  // Fetch suggestions when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      fetchSuggestions(searchQuery);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchQuery, fetchSuggestions]);

  // Close user menu and suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen && !(event.target as Element).closest(".relative")) {
        setUserMenuOpen(false);
      }
      if (
        showSuggestions &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen, showSuggestions]);

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Collections", path: "/collections" },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveSearch(searchQuery.trim());
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchBar(false);
      setShowSuggestions(false);
      setSearchQuery("");
    }
  };

  const handleSuggestionClick = (productId: string) => {
    navigate(`/product/${productId}`);
    setShowSearchBar(false);
    setShowSuggestions(false);
    setSearchQuery("");
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setShowSearchBar(false);
    setShowSuggestions(false);
    setSearchQuery("");
  };

  const closeSearchBar = () => {
    setShowSearchBar(false);
    setShowSuggestions(false);
    setSearchQuery("");
  };

  // Handle Escape key to close search bar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showSearchBar) {
        closeSearchBar();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showSearchBar]);

  // Navbar styling: over dark cinematic hero → frosted glass dark; else theme-aware with backdrop
  const headerClasses = useHeroNavStyle
    ? "fixed top-0 left-0 right-0 z-[100] w-full max-w-full overflow-visible backdrop-blur-md bg-black/30 border-b border-white/10"
    : `fixed top-0 left-0 right-0 z-[100] w-full max-w-full overflow-visible backdrop-blur-md border-b ${
        theme === "dark"
          ? "bg-black/80 border-white/10"
          : "bg-white/80 border-black/5"
      }`;

  const navPillClasses = useHeroNavStyle
    ? "flex items-center gap-1 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 shadow-lg px-2 py-1.5"
    : `flex items-center gap-1 rounded-full shadow-lg px-2 py-1.5 ${
        theme === "dark"
          ? "bg-white/10 backdrop-blur-lg border border-white/20"
          : "bg-black/5 backdrop-blur-lg border border-black/10"
      }`;

  const rightIconColor = useHeroNavStyle ? "#F7F3EA" : theme === "dark" ? "#FACC15" : "#1e293b";

  // Nav link text colors: white when over dark hero, theme-aware when scrolled
  const getNavLinkClasses = (isActiveLink: boolean) => {
    if (useHeroNavStyle) {
      return isActiveLink
        ? "text-white bg-white/20"
        : "text-white/80 hover:text-white hover:bg-white/10";
    }
    return theme === "dark"
      ? isActiveLink
        ? "text-white bg-white/20"
        : "text-white/80 hover:text-white hover:bg-white/10"
      : isActiveLink
      ? "text-slate-900 bg-black/10"
      : "text-slate-700 hover:text-slate-900 hover:bg-black/5";
  };

  // Logged-in user button: distinct pill (matches Sign In button style so it doesn’t blend with nav links)
  const userButtonBase =
    "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 shadow-sm border";
  const userButtonClasses =
    useHeroNavStyle
      ? `${userButtonBase} bg-white/15 text-white border-white/20 hover:bg-white/25 hover:shadow-md`
      : theme === "dark"
      ? `${userButtonBase} bg-white/15 text-white border-white/20 hover:bg-white/25 hover:shadow-md`
      : `${userButtonBase} bg-slate-800 text-white border-slate-700 hover:bg-slate-900 hover:shadow-md`;

  return (
    <>
      <header className={headerClasses}>
        <div className="mx-auto max-w-screen-2xl w-full flex items-center gap-4 px-4 sm:px-6 lg:px-8 py-3 md:py-4 overflow-visible md:grid md:grid-cols-[1fr_auto_1fr] md:gap-4">
          {/* Logo - Left (grid col 1 on desktop, first in flex on mobile) */}
          <Link
            to="/"
            className="flex items-center flex-shrink-0 hover:opacity-90 transition-opacity"
          >
            <div className="h-16 w-20 sm:h-11 sm:w-24 md:h-16 md:w-28 overflow-visible flex items-center justify-center">
              <img
                src={encodeURI("/Tinge Clothing - Logo - No background.png")}
                alt="Tinge Clothing Logo"
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </div>
          </Link>

          {/* Spacer: mobile only, pushes wishlist/cart/hamburger to the right; hidden on desktop so grid has 3 cells */}
          <div className="flex-1 min-w-0 md:hidden" aria-hidden="true" />

          {/* Navigation - Center column (true center on desktop) */}
          <nav className="hidden md:flex items-center justify-center overflow-visible">
            <div className={navPillClasses}>
              <Link
                to="/"
                className={`px-3 md:px-4 py-1.5 text-sm font-semibold transition-colors rounded-lg whitespace-nowrap ${getNavLinkClasses(
                  isActive("/")
                )}`}
              >
                Home
              </Link>

              {/* Shop Dropdown for categories */}
              <div
                className="relative z-[100]"
                onMouseEnter={() => setShopDropdownOpen(true)}
                onMouseLeave={() => setShopDropdownOpen(false)}
              >
                <button
                  className={`px-3 md:px-4 py-1.5 text-sm font-semibold transition-colors rounded-lg flex items-center gap-1 ${getNavLinkClasses(
                    isActive("/categories") ||
                      location.pathname.startsWith("/category/")
                  )}`}
                  onClick={() => {
                    if (!shopDropdownOpen) {
                      navigate("/categories");
                    }
                  }}
                >
                  Shop
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform ${shopDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown Menu */}
                {shopDropdownOpen && (
                  <div className="absolute top-full left-0 -mt-1 pt-3 w-56 z-[100]">
                    <div className="bg-white dark:bg-brand-surface rounded-xl border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden">
                      <div className="py-2">
                        <Link
                          to="/categories"
                          onClick={() => setShopDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-brand-secondary hover:text-white hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-500/20 border-l-2 border-transparent hover:border-purple-500 transition-all duration-200"
                        >
                          All Products
                        </Link>
                        <div className="border-t border-gray-200 dark:border-white/10 my-1"></div>
                        {categories.map((category) => (
                          <Link
                            key={category.id}
                            to={`/category/${category.slug}`}
                            onClick={() => setShopDropdownOpen(false)}
                            className="block px-4 py-2 text-sm text-brand-secondary hover:text-white hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-500/20 border-l-2 border-transparent hover:border-purple-500 transition-all duration-200"
                          >
                            {category.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Link
                to="/collections"
                className={`px-3 md:px-4 py-1.5 text-sm font-semibold transition-colors rounded-lg whitespace-nowrap ${getNavLinkClasses(
                  isActive("/collections")
                )}`}
              >
                Collections
              </Link>
            </div>
          </nav>

          {/* Actions - Right (grid col 3 on desktop) */}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 md:justify-end">
            {/* Search Icon/Bar - Desktop Only */}
            <div className="hidden md:flex items-center relative max-w-full">
              {!showSearchBar ? (
                <button
                  onClick={() => setShowSearchBar(true)}
                  className="p-2 rounded-full transition-opacity hover:opacity-80"
                  style={{ color: rightIconColor }}
                  aria-label="Search"
                  type="button"
                >
                  <SearchIcon className="h-5 w-5" />
                </button>
              ) : (
                <div className="relative">
                  <form
                    onSubmit={handleSearch}
                    className="flex items-center bg-white dark:bg-brand-surface border border-gray-300 dark:border-white/20 rounded-full px-4 py-2 shadow-lg"
                  >
                    <SearchIcon className="h-5 w-5 text-brand-secondary mr-2 flex-shrink-0" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="Search products..."
                      className="bg-transparent outline-none text-sm text-brand-primary placeholder-brand-secondary w-32 md:w-48 lg:w-64"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setShowSuggestions(false);
                        }}
                        className="ml-2 text-brand-secondary hover:text-brand-primary flex-shrink-0"
                        title="Clear search"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={closeSearchBar}
                      className="ml-2 text-brand-secondary hover:text-brand-primary flex-shrink-0"
                      title="Close search"
                    >
                      <XIcon className="h-5 w-5" />
                    </button>
                  </form>

                  {/* Suggestions Dropdown */}
                  {showSuggestions && showSearchBar && (
                    <div
                      ref={suggestionsRef}
                      className="absolute top-full left-0 mt-2 bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[60vh] overflow-y-auto w-[300px] md:w-[350px] lg:w-[400px]"
                    >
                      {/* Recent Searches */}
                      {!searchQuery.trim() && recentSearches.length > 0 && (
                        <div className="p-2">
                          <div className="px-3 py-2 text-xs font-semibold text-brand-secondary uppercase tracking-wide">
                            Recent Searches
                          </div>
                          {recentSearches.map((search, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg cursor-pointer group"
                            >
                              <div
                                onClick={() => handleRecentSearchClick(search)}
                                className="flex items-center gap-2 flex-1"
                              >
                                <ClockIcon className="w-4 h-4 text-brand-secondary" />
                                <span className="text-sm text-brand-primary">
                                  {search}
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeRecentSearch(search);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-opacity"
                              >
                                <XIcon className="w-3 h-3 text-brand-secondary" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Loading State */}
                      {suggestionsLoading && searchQuery.trim() && (
                        <div className="p-4 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-accent mx-auto"></div>
                        </div>
                      )}

                      {/* Product Suggestions */}
                      {!suggestionsLoading &&
                        searchQuery.trim() &&
                        suggestions.length > 0 && (
                          <div className="p-2">
                            <div className="px-3 py-2 text-xs font-semibold text-brand-secondary uppercase tracking-wide">
                              Products
                            </div>
                            {suggestions.map((product) => (
                              <div
                                key={product.id}
                                onClick={() =>
                                  handleSuggestionClick(product.id)
                                }
                                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg cursor-pointer"
                              >
                                <div className="w-12 h-12 flex-shrink-0 bg-gray-100 dark:bg-white/5 rounded-lg overflow-hidden">
                                  {product.main_image_url ? (
                                    <img
                                      src={product.main_image_url}
                                      alt={product.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-brand-secondary">
                                      <SearchIcon className="w-5 h-5" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-brand-primary truncate">
                                    {product.title}
                                  </p>
                                  <p className="text-xs text-brand-secondary">
                                    {formatCurrency(
                                      product.selling_price,
                                      currency,
                                    )}
                                  </p>
                                </div>
                              </div>
                            ))}
                            <div
                              onClick={() => {
                                if (searchQuery.trim()) {
                                  handleSearch(new Event("submit") as any);
                                }
                              }}
                              className="flex items-center justify-center gap-2 px-3 py-2 mt-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg cursor-pointer text-sm text-brand-accent font-medium"
                            >
                              <SearchIcon className="w-4 h-4" />
                              <span>View all results for "{searchQuery}"</span>
                            </div>
                          </div>
                        )}

                      {/* No Results */}
                      {!suggestionsLoading &&
                        searchQuery.trim() &&
                        suggestions.length === 0 && (
                          <div className="p-6 text-center">
                            <SearchIcon className="w-8 h-8 mx-auto mb-2 text-brand-secondary opacity-50" />
                            <p className="text-sm text-brand-secondary">
                              No products found
                            </p>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Theme Switcher - Desktop Only */}
            <button
              onClick={(e) => {
                e.preventDefault();
                toggleTheme();
              }}
              className="hidden md:flex relative p-2 rounded-full transition-opacity hover:opacity-80"
              style={{ color: rightIconColor }}
              aria-label={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              type="button"
            >
              {theme === "dark" ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>

            {/* Wishlist Button */}
            <button
              onClick={() => navigate("/wishlist")}
              className="relative p-2 rounded-full transition-opacity hover:opacity-80"
              style={{ color: rightIconColor }}
              aria-label="Wishlist"
            >
              <HeartIcon className="h-5 w-5" />
              {wishlistItemCount > 0 && (
                <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-pink-500 text-white text-[10px] font-medium flex items-center justify-center transform translate-x-1/3 -translate-y-1/3">
                  {wishlistItemCount}
                </span>
              )}
            </button>

            {/* Shopping Cart Button */}
            <button
              onClick={() => navigate("/cart")}
              className="relative p-2 rounded-full transition-opacity hover:opacity-80"
              style={{ color: rightIconColor }}
              aria-label="Shopping cart"
            >
              <div
                key={cartAnimationKey}
                className={cartAnimationKey > 0 ? "animate-cartBump" : ""}
              >
                <ShoppingBagIcon
                  className={`h-5 w-5 ${
                    cartItemCount > 0 ? "text-pink-500" : ""
                  }`}
                />
              </div>
              {cartItemCount > 0 && (
                <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-pink-500 text-white text-[10px] font-medium flex items-center justify-center transform translate-x-1/3 -translate-y-1/3 animate-heartbeat shadow-lg">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* User Menu or Sign In Button - Desktop Only */}
            {isAuthenticated && user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={userButtonClasses}
                  aria-label="User menu"
                >
                  <UserIcon className="h-5 w-5" />
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {user.name || user.email.split("@")[0]}
                  </span>
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* User Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-brand-surface rounded-xl border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden z-50">
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-white/10">
                        <p className="text-sm font-semibold text-brand-primary truncate">
                          {user.name || "User"}
                        </p>
                        <p className="text-xs text-brand-secondary truncate">
                          {user.email}
                        </p>
                      </div>
                      <Link
                        to="/orders"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-brand-secondary hover:text-brand-primary hover:bg-white/5 transition-colors flex items-center gap-2"
                      >
                        <ShoppingBagIcon className="w-4 h-4" />
                        My Orders
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-brand-secondary hover:text-brand-primary hover:bg-white/5 transition-colors flex items-center gap-2"
                      >
                        <UserIcon className="w-4 h-4" />
                        Profile
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-brand-secondary hover:text-brand-primary hover:bg-white/5 transition-colors flex items-center gap-2"
                        >
                          <SettingsIcon className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}
                      <div className="border-t border-gray-200 dark:border-white/10 my-1"></div>
                      <button
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                          navigate("/");
                        }}
                        className="w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                      >
                        <LogOutIcon className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/auth"
                className={`hidden md:inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 ${
                  useHeroNavStyle
                    ? "bg-white/15 text-white hover:bg-white/25 border border-white/20"
                    : theme === "dark"
                    ? "bg-white/15 text-white hover:bg-white/25 border border-white/20"
                    : "bg-slate-800 text-white hover:bg-slate-900 shadow-md"
                }`}
                aria-label="Sign in or Sign up"
              >
                <UserIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}

            {/* Hamburger Menu Button - Mobile Only */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ color: rightIconColor }}
              aria-label="Toggle menu"
            >
              <HamburgerIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu — full-height slide-in panel */}
      {mobileMenuOpen && (
        <>
          {/* Dimmed overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Panel */}
          <div className="fixed top-[68px] right-3 w-[calc(100vw-24px)] max-w-[340px] max-h-[82vh] bg-white dark:bg-[#1E1A17] border border-gray-200/70 dark:border-white/10 rounded-3xl shadow-2xl z-[9999] md:hidden overflow-hidden animate-dropdownIn flex flex-col">

            {/* Gradient accent bar at top */}
            <div className="h-[3px] w-full bg-gradient-to-r from-purple-500 via-pink-500 to-[#FF7A59] flex-shrink-0" />

            {/* Header row */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
                  <SparklesIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-base font-display font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent tracking-tight">
                  Explore
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                aria-label="Close menu"
              >
                <XIcon className="w-4 h-4 text-brand-secondary" />
              </button>
            </div>

            {/* Search bar */}
            <div className="px-4 pb-3 flex-shrink-0">
              <form
                onSubmit={(e) => {
                  handleSearch(e);
                  setMobileMenuOpen(false);
                }}
              >
                <div className="flex items-center bg-gray-100 dark:bg-white/8 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 gap-2.5 focus-within:ring-2 focus-within:ring-purple-500/40 focus-within:border-purple-400/60 transition-all">
                  <SearchIcon className="h-4 w-4 text-brand-secondary flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search products…"
                    className="bg-transparent outline-none text-sm text-brand-primary placeholder-brand-secondary w-full"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(""); setShowSuggestions(false); }}
                      className="text-brand-secondary hover:text-brand-primary flex-shrink-0"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </form>

              {/* Suggestions */}
              {showSuggestions && mobileMenuOpen && (
                <div className="mt-2 bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                  {!searchQuery.trim() && recentSearches.length > 0 && (
                    <div className="p-2">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-brand-secondary uppercase tracking-widest">Recent</div>
                      {recentSearches.map((search, index) => (
                        <div key={index} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl group cursor-pointer">
                          <div onClick={() => { handleRecentSearchClick(search); setMobileMenuOpen(false); }} className="flex items-center gap-2 flex-1">
                            <ClockIcon className="w-3.5 h-3.5 text-brand-secondary flex-shrink-0" />
                            <span className="text-sm text-brand-primary">{search}</span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); removeRecentSearch(search); }} className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity">
                            <XIcon className="w-3 h-3 text-brand-secondary" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {suggestionsLoading && searchQuery.trim() && (
                    <div className="p-4 text-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-accent mx-auto" /></div>
                  )}
                  {!suggestionsLoading && searchQuery.trim() && suggestions.length > 0 && (
                    <div className="p-2">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-brand-secondary uppercase tracking-widest">Products</div>
                      {suggestions.map((product) => (
                        <div key={product.id} onClick={() => { handleSuggestionClick(product.id); setMobileMenuOpen(false); }} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl cursor-pointer">
                          <div className="w-10 h-10 flex-shrink-0 bg-gray-100 dark:bg-white/5 rounded-xl overflow-hidden">
                            {product.main_image_url
                              ? <img src={product.main_image_url} alt={product.title} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><SearchIcon className="w-4 h-4 text-brand-secondary" /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brand-primary truncate">{product.title}</p>
                            <p className="text-xs text-brand-secondary">{formatCurrency(product.selling_price, currency)}</p>
                          </div>
                        </div>
                      ))}
                      <div onClick={() => { if (searchQuery.trim()) { handleSearch(new Event("submit") as any); setMobileMenuOpen(false); } }} className="flex items-center justify-center gap-2 px-3 py-2 mt-0.5 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl cursor-pointer text-sm font-semibold text-purple-500">
                        <SearchIcon className="w-3.5 h-3.5" /><span>See all results</span>
                      </div>
                    </div>
                  )}
                  {!suggestionsLoading && searchQuery.trim() && suggestions.length === 0 && (
                    <div className="p-5 text-center">
                      <SearchIcon className="w-7 h-7 mx-auto mb-1.5 text-brand-secondary opacity-40" />
                      <p className="text-xs text-brand-secondary">No products found</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scrollable nav body */}
            <nav className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5">

              {/* Primary links — Home & Collections */}
              <div className="space-y-1 mb-2">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                    isActive("/")
                      ? "bg-gradient-to-r from-purple-500/15 to-pink-500/10 text-brand-primary border border-purple-400/20"
                      : "text-brand-secondary hover:text-brand-primary hover:bg-gray-100/80 dark:hover:bg-white/5"
                  }`}
                >
                  <span className={`w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0 transition-colors ${
                    isActive("/")
                      ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-white/8 text-brand-secondary group-hover:bg-gray-200 dark:group-hover:bg-white/15"
                  }`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </span>
                  <span className="text-sm font-semibold flex-1">Home</span>
                  <ArrowRightIcon className={`w-4 h-4 transition-transform flex-shrink-0 ${isActive("/") ? "text-purple-500 translate-x-0.5" : "text-brand-secondary/40 group-hover:translate-x-0.5 group-hover:text-brand-secondary"}`} />
                </Link>

                <Link
                  to="/collections"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                    isActive("/collections")
                      ? "bg-gradient-to-r from-purple-500/15 to-pink-500/10 text-brand-primary border border-purple-400/20"
                      : "text-brand-secondary hover:text-brand-primary hover:bg-gray-100/80 dark:hover:bg-white/5"
                  }`}
                >
                  <span className={`w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0 transition-colors ${
                    isActive("/collections")
                      ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-white/8 text-brand-secondary group-hover:bg-gray-200 dark:group-hover:bg-white/15"
                  }`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </span>
                  <span className="text-sm font-semibold flex-1">Collections</span>
                  <ArrowRightIcon className={`w-4 h-4 transition-transform flex-shrink-0 ${isActive("/collections") ? "text-purple-500 translate-x-0.5" : "text-brand-secondary/40 group-hover:translate-x-0.5 group-hover:text-brand-secondary"}`} />
                </Link>
              </div>

              {/* Shop section */}
              <div className="pt-1">
                {/* Section header */}
                <div className="flex items-center gap-2 px-4 py-2 mb-1">
                  <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[#FF7A59] to-pink-500" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-brand-secondary">Shop</span>
                </div>

                {/* All Products */}
                <Link
                  to="/categories"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-brand-secondary hover:text-brand-primary hover:bg-gray-100/80 dark:hover:bg-white/5 transition-all group"
                >
                  <span className="w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#FF7A59]/20 to-pink-500/10 flex-shrink-0">
                    <TagIcon className="w-4 h-4 text-[#FF7A59]" />
                  </span>
                  <span className="text-sm font-semibold flex-1">All Products</span>
                  <ArrowRightIcon className="w-3.5 h-3.5 text-brand-secondary/30 group-hover:text-brand-secondary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>

                {/* Category links */}
                <div className="ml-2 mt-0.5 space-y-0.5 pl-2 border-l-2 border-gray-200/80 dark:border-white/10">
                  {categories.map((category, idx) => {
                    const dotColors = [
                      "bg-purple-400", "bg-pink-400", "bg-[#FF7A59]",
                      "bg-blue-400", "bg-emerald-400", "bg-amber-400",
                    ];
                    const dotColor = dotColors[idx % dotColors.length];
                    return (
                      <Link
                        key={category.id}
                        to={`/category/${category.slug}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-brand-secondary hover:text-brand-primary hover:bg-gray-100/80 dark:hover:bg-white/5 transition-all group ${
                          isActive(`/category/${category.slug}`) ? "text-brand-primary bg-gray-100/80 dark:bg-white/5" : ""
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor} opacity-70 group-hover:opacity-100`} />
                        <span className="text-sm font-medium flex-1">{category.name}</span>
                        <ArrowRightIcon className="w-3 h-3 text-brand-secondary/20 group-hover:text-brand-secondary/60 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Account section (logged in) */}
              {isAuthenticated && user && (
                <div className="pt-3 mt-2 border-t border-gray-200/60 dark:border-white/8">
                  {/* User identity chip */}
                  <div className="flex items-center gap-3 px-4 py-3 mb-1 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/8">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-brand-primary truncate">{user.name || user.email.split("@")[0]}</p>
                      <p className="text-[11px] text-brand-secondary truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 mb-1">
                    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-purple-500 to-blue-400" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-brand-secondary">Account</span>
                  </div>

                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-brand-secondary hover:text-brand-primary hover:bg-gray-100/80 dark:hover:bg-white/5 transition-all group">
                    <span className="w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/8 group-hover:bg-gray-200 dark:group-hover:bg-white/15 transition-colors flex-shrink-0">
                      <UserIcon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-sm font-medium flex-1">Profile</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 text-brand-secondary/30 group-hover:text-brand-secondary flex-shrink-0" />
                  </Link>
                  <Link to="/orders" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-brand-secondary hover:text-brand-primary hover:bg-gray-100/80 dark:hover:bg-white/5 transition-all group">
                    <span className="w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/8 group-hover:bg-gray-200 dark:group-hover:bg-white/15 transition-colors flex-shrink-0">
                      <ShoppingBagIcon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-sm font-medium flex-1">My Orders</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 text-brand-secondary/30 group-hover:text-brand-secondary flex-shrink-0" />
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-brand-secondary hover:text-brand-primary hover:bg-gray-100/80 dark:hover:bg-white/5 transition-all group">
                      <span className="w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/8 group-hover:bg-gray-200 dark:group-hover:bg-white/15 transition-colors flex-shrink-0">
                        <SettingsIcon className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-sm font-medium flex-1">Admin Panel</span>
                      <ArrowRightIcon className="w-3.5 h-3.5 text-brand-secondary/30 group-hover:text-brand-secondary flex-shrink-0" />
                    </Link>
                  )}
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); navigate("/"); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-red-500/80 dark:text-red-400/80 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group"
                  >
                    <span className="w-7 h-7 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 group-hover:bg-red-100 dark:group-hover:bg-red-500/20 transition-colors flex-shrink-0">
                      <LogOutIcon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-sm font-medium flex-1 text-left">Sign Out</span>
                  </button>
                </div>
              )}
            </nav>

            {/* Footer — theme toggle + sign in */}
            <div className="flex-shrink-0 border-t border-gray-200/60 dark:border-white/8 bg-gray-50/80 dark:bg-white/3 px-4 py-3">
              <div className="flex items-center gap-3">
                {/* Theme toggle pill */}
                <button
                  onClick={(e) => { e.preventDefault(); toggleTheme(); }}
                  className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-white/8 border border-gray-200/80 dark:border-white/10 text-brand-secondary hover:text-brand-primary hover:bg-gray-50 dark:hover:bg-white/12 transition-all shadow-sm text-sm font-medium"
                >
                  {theme === "dark"
                    ? <><SunIcon className="w-4 h-4 text-amber-400 flex-shrink-0" /><span>Light Mode</span></>
                    : <><MoonIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" /><span>Dark Mode</span></>}
                </button>

                {/* Sign In CTA or account initial */}
                {!isAuthenticated ? (
                  <Link
                    to="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-semibold shadow-md shadow-purple-500/20 transition-all"
                  >
                    <UserIcon className="w-4 h-4 flex-shrink-0" />
                    <span>Sign In</span>
                  </Link>
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0">
                    {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
