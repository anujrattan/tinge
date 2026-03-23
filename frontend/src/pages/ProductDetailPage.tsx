import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Product, CartItem } from '../types';
import api from '../services/api';
import { Button } from '../components/ui';
import { ProductCard } from '../components/ProductCard';
import { RatingBreakdown } from '../components/RatingBreakdown';
import { StarRating } from '../components/StarRating';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/currency';
import { getCssColorValue, getColorName } from '../utils/colorUtils';
import { HeartIcon } from '../components/icons';
import { SEOHead } from '../components/SEOHead';
import { StructuredData, createProductSchema, createBreadcrumbSchema } from '../components/StructuredData';
import { truncateDescription, DEFAULT_SITE_URL, DEFAULT_SITE_NAME } from '../utils/seo';
import { trackViewContent } from '../utils/gtm';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { addToCart, currency, isInWishlist, addToWishlist, removeFromWishlist } = useApp();
  const { showToast } = useToast();
  
  // All hooks must be declared before any conditional returns
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const fetchProduct = async () => {
      setLoading(true);
      const data = await api.getProductById(id);
      if (data) {
        setProduct(data);
        // Set initial size (first available size)
        const initialSize = data.variants.sizes && data.variants.sizes.length > 0 
          ? data.variants.sizes[0] 
          : '';
        setSelectedSize(initialSize);
        // Set initial image (main image)
        setSelectedImage(data.main_image_url || data.imageUrl || '');
        
        // Same category first; if not enough, fallback to other categories
        const sameCategory = await api.getProducts(data.category);
        let related = sameCategory.filter(p => p.id !== data.id).slice(0, 4);
        if (related.length < 4) {
          const categories = await api.getCategories();
          const otherSlugs = (categories || [])
            .map((c: { slug: string }) => c.slug)
            .filter((slug: string) => slug && slug !== data.category);
          const seen = new Set(related.map(p => p.id));
          for (const slug of otherSlugs) {
            if (related.length >= 4) break;
            const products = await api.getProducts(slug);
            for (const p of products) {
              if (p.id === data.id || seen.has(p.id)) continue;
              seen.add(p.id);
              related = [...related, p];
              if (related.length >= 4) break;
            }
          }
          setRelatedProducts(related.slice(0, 4));
        } else {
          setRelatedProducts(related);
        }
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  // ViewContent tracking for GTM/GA4/Meta (once per product view)
  useEffect(() => {
    if (!product) return;
    const sellingPrice = parseFloat(String(product.selling_price || product.price || 0));
    let value = sellingPrice;
    const discountPct = product.discount_percentage ? parseFloat(String(product.discount_percentage)) : 0;
    const salePct = product.on_sale && product.sale_discount_percentage ? parseFloat(String(product.sale_discount_percentage)) : 0;
    if (discountPct > 0) value = value * (1 - discountPct / 100);
    if (salePct > 0) value = value * (1 - salePct / 100);
    trackViewContent({
      content_ids: [product.id],
      content_type: product.category_name ?? product.category,
      content_name: product.name ?? product.title,
      currency,
      value,
      items: [{
        item_id: product.id,
        item_name: product.name ?? product.title ?? '',
        item_category: product.category_name ?? product.category,
        price: value,
        quantity: 1,
        index: 0,
      }],
    });
  }, [product?.id, currency, product]);

  // Early return after all hooks are declared
  if (!id) {
    return <div>Product not found</div>;
  }

  if (loading) {
    return <div className="text-center py-20 text-brand-secondary">Loading product...</div>;
  }

  if (!product) {
    return <div className="text-center py-20 text-brand-secondary">Product not found.</div>;
  }

  // Calculate prices like ProductCard does (only when product exists)
  const sellingPrice = parseFloat(String(product.selling_price || 0));
  const discountPercentage = product.discount_percentage ? parseFloat(String(product.discount_percentage)) : 0;
  const onSale = product.on_sale === true;
  const saleDiscountPercentage = onSale && product.sale_discount_percentage ? parseFloat(String(product.sale_discount_percentage)) : 0;
  
  // Calculate final price with multiplicative stacking
  let finalPrice = sellingPrice;
  if (discountPercentage > 0) {
    finalPrice = finalPrice * (1 - discountPercentage / 100);
  }
  if (saleDiscountPercentage > 0) {
    finalPrice = finalPrice * (1 - saleDiscountPercentage / 100);
  }
  
  const hasAnyDiscount = discountPercentage > 0 || saleDiscountPercentage > 0;
  
  // Calculate effective discount percentage for display
  const effectiveDiscount = discountPercentage > 0 || saleDiscountPercentage > 0
    ? 100 - (100 - discountPercentage) * (100 - saleDiscountPercentage) / 100
    : 0;

  const mockupImages = product?.mockup_images || [];
  const allImages = [
    product.main_image_url || product.imageUrl || '',
    ...mockupImages.slice(0, 4)
  ].filter(img => img);

  const handleAddToCart = () => {
    if (product) {
      const color = (product.color || '').trim();
      const needsExplicitSizeSelection =
        availableSizes.length > 0 &&
        availableSizes[0] !== 'One Size' &&
        availableSizes[0] !== '11oz';
      const size = (selectedSize || availableSizes[0] || '').trim();

      if (needsExplicitSizeSelection && !size) {
        showToast('Please select a size before adding to cart.', 'error');
        return;
      }

      if (!color) {
        showToast('This product is missing color configuration. Please contact support.', 'error');
        return;
      }

      addToCart({
        ...product,
        quantity: 1,
        selectedSize: size || 'One Size',
        selectedColor: color,
      });
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  const handleWishlistToggle = async () => {
    if (!product || isWishlistLoading) return;
    
    setIsWishlistLoading(true);
    try {
      if (isInWishlist(product.id)) {
        await removeFromWishlist(product.id);
        showToast('Removed from wishlist', 'success');
      } else {
        await addToWishlist(product.id);
        showToast('Added to wishlist', 'success');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update wishlist', 'error');
    } finally {
      setIsWishlistLoading(false);
    }
  };

  const availableSizes = product.variants?.sizes || [];

  // SEO Data
  const productTitle = product?.name || product?.title || 'Product';
  const productDescription = product?.description || `${productTitle} - Premium quality ${product?.category_name || 'apparel'} from Luxe Threads.`;
  const productImage = product?.main_image_url || product?.imageUrl || '';
  const productPrice = finalPrice;
  
  const seoData = {
    title: `${productTitle} - Premium ${product?.category_name || 'Apparel'} | Luxe Threads`,
    description: truncateDescription(productDescription),
    keywords: `${productTitle}, premium ${product?.category_name || 'apparel'}, luxury clothing, custom ${product?.category_name || 'apparel'}, ${product?.category_name || 'apparel'} online`,
    image: productImage,
    type: 'product' as const,
    url: `${DEFAULT_SITE_URL}/product/${product?.id}`,
  };

  // Breadcrumb schema
  const breadcrumbItems = [
    { name: 'Home', url: DEFAULT_SITE_URL },
    { name: product?.category_name || 'Products', url: `${DEFAULT_SITE_URL}/category/${product?.category_slug || 'all'}` },
    { name: productTitle, url: `${DEFAULT_SITE_URL}/product/${product?.id}` },
  ];

  // Product schema
  const productSchema = product ? createProductSchema({
    id: product.id,
    title: productTitle,
    description: productDescription,
    price: productPrice,
    currency: currency,
    image: productImage,
    availability: 'https://schema.org/InStock',
    brand: DEFAULT_SITE_NAME,
    category: product.category_name,
  }) : null;

  return (
    <>
      {product && (
        <>
          <SEOHead {...seoData} />
          {productSchema && <StructuredData data={productSchema} />}
          <StructuredData data={createBreadcrumbSchema(breadcrumbItems)} />
        </>
      )}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Image Section */}
        <div>
          {/* Main Product Image - Reduced by 40% (60% of original size) */}
          <div className="w-full" style={{ maxWidth: '60%', margin: '0 auto' }}>
            <img 
              src={selectedImage || product.main_image_url || product.imageUrl || ''} 
              alt={product.name || product.title} 
              className="w-full h-auto object-contain rounded-xl shadow-lg border border-white/10" 
            />
          </div>
          
          {/* Mockup Images Grid - Below main image */}
          {allImages.length > 1 && (
            <div className="mt-4">
              <div className="grid grid-cols-5 gap-2">
                {allImages.map((imageUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(imageUrl)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === imageUrl
                        ? 'border-purple-500 ring-2 ring-purple-500/50'
                        : 'border-white/20 hover:border-purple-400/50'
                    }`}
                  >
                    <img 
                      src={imageUrl} 
                      alt={`${product.name} ${index === 0 ? 'main' : `mockup ${index}`}`}
                      className="w-full h-full object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute top-1 left-1 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded">
                        Main
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Product Details - Aligned with top of image */}
        <div className="flex flex-col">
          <h1 className="text-3xl lg:text-5xl font-display font-bold tracking-tight text-brand-primary">
            {product.name || product.title}
          </h1>
          
          {/* Price Display */}
          <div className="mt-3 flex items-baseline gap-3">
            <p className="text-3xl font-bold text-pink-500">
              {formatCurrency(finalPrice, currency)}
            </p>
            {hasAnyDiscount && (
              <>
                <p className="text-xl text-brand-secondary line-through">
                  {formatCurrency(sellingPrice, currency)}
                </p>
                <span className="text-lg font-semibold text-pink-500">
                  ({effectiveDiscount.toFixed(0)}% off)
                </span>
              </>
            )}
          </div>
          
          {/* Star Rating Display */}
          {product.rating > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <StarRating rating={product.rating} readonly size="md" />
              <span className="text-sm text-brand-secondary">
                ({product.rating_count || 0} {product.rating_count === 1 ? 'rating' : 'ratings'})
              </span>
            </div>
          )}
          
          <p className="mt-6 text-base text-brand-secondary leading-relaxed">{product.description}</p>
          
          {/* Rating Breakdown - Always show (component handles empty state) */}
          <div className="mt-6">
            <RatingBreakdown productId={product.id} />
          </div>
          
          <div className="mt-8 space-y-6">
            {/* Product color display (single color per listing) */}
            {product.color && (
              <div>
                <h3 className="text-sm font-medium text-brand-primary">Color</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="h-8 w-8 rounded-full border border-white/20 flex-shrink-0"
                    style={{ backgroundColor: getCssColorValue(product.color) }}
                    title={getColorName(product.color)}
                  />
                  <span className="text-brand-primary font-medium">{getColorName(product.color)}</span>
                </div>
              </div>
            )}

            {/* Size Selector */}
            {availableSizes.length > 0 && availableSizes[0] !== 'One Size' && availableSizes[0] !== '11oz' && (
              <div>
                <h3 className="text-sm font-medium text-brand-primary">Size</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableSizes.map(size => (
                    <button 
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`group relative flex items-center justify-center rounded-lg border-2 py-2 px-3 min-w-[2.5rem] text-xs font-medium uppercase transition-all duration-200 ease-in-out focus:outline-none ${
                        selectedSize === size 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg border-transparent scale-105' 
                          : 'bg-white dark:bg-brand-surface text-brand-primary hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 hover:shadow-md border-gray-300 dark:border-white/30 shadow-sm'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Add to Cart & Wishlist Buttons */}
          <div className="mt-10 flex gap-3">
            <Button onClick={handleAddToCart} className="flex-1 py-3 text-base">
              {addedToCart ? 'Added!' : 'Add to cart'}
            </Button>
            <button
              onClick={handleWishlistToggle}
              disabled={isWishlistLoading}
              className={`px-4 py-3 rounded-lg transition-all duration-200 ${
                isInWishlist(product.id) 
                  ? 'bg-pink-500 text-white shadow-lg hover:bg-pink-600' 
                  : 'bg-brand-surface border-2 border-gray-300 dark:border-white/30 text-brand-primary hover:border-pink-500 hover:text-pink-500'
              } ${isWishlistLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
              title={isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-label={isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <HeartIcon 
                className={`w-6 h-6 ${isInWishlist(product.id) ? 'fill-current' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* You May Also Like */}
      <div className="mt-24">
        <h2 className="text-2xl font-display font-bold tracking-tight text-brand-primary">You may also like</h2>
        <div className="mt-6 grid grid-cols-1 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 gap-x-6">
          {relatedProducts.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
    </>
  );
};