import { ShoppingCart, AlertCircle, TrendingUp, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { RecommendationItem, RecommendationMeta } from "../../types/customer.api";

interface RecommendationsSectionProps {
  forYou: RecommendationItem[];
  popular: RecommendationItem[];
  offers: RecommendationItem[];
  loading?: boolean;
  meta?: RecommendationMeta;
  error?: string | null;
  status?: "success" | "error";
}

export default function RecommendationsSection({
  forYou,
  popular,
  offers,
  loading = false,
  meta,
  error,
  status,
}: RecommendationsSectionProps) {
  const navigate = useNavigate();
  
  // Determine section titles based on meta
  const forYouTitle = meta?.isColdStart ? "Popular near you" : "Recommended for you";
  const popularTitle = "Popular right now";
  const offersTitle = "Special Offers";
  const isColdStart = meta?.isColdStart === true;
  const isStale = meta?.isStale === true;
  const hasError = status === "error" || (error && status !== "success");
  
  const ProductCard = ({ product, showDiscount = false }: { product: RecommendationItem; showDiscount?: boolean }) => {
    // Use price from product catalog if available
    const displayPrice = product.price ?? 0;
    const hasDiscount = product.hasOffer && product.offer?.discountPercent;
    const isAvailable = product.available !== false; // Default to true if not specified

    return (
      <div className="flex-shrink-0 w-[200px] bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
        <div className="aspect-[16/9] bg-gray-100 relative overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://via.placeholder.com/200x112?text=No+Image";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              No Image
            </div>
          )}
          {showDiscount && hasDiscount && product.offer && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              {product.offer.discountPercent}% OFF
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="mb-1">
            <h3 className="font-medium text-sm text-gray-900 line-clamp-2">{product.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{product.categoryName}</p>
          </div>
          {displayPrice > 0 && (
            <p className="text-lg font-semibold text-gray-900 mb-2">${displayPrice.toFixed(2)}</p>
          )}
          {isAvailable ? (
            <button
              className="w-full bg-[#2563eb] text-white text-sm font-medium py-2 rounded-md hover:bg-[#1d4ed8] transition-colors duration-200 flex items-center justify-center gap-2"
              onClick={() => {
                // Navigate to product details using existing product navigation
                navigate(`/products/${product.productId}`);
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </button>
          ) : (
            <button
              className="w-full bg-gray-300 text-gray-600 text-sm font-medium py-2 rounded-md cursor-not-allowed"
              disabled
            >
              Out of Stock
            </button>
          )}
        </div>
      </div>
    );
  };

  const ProductRow = ({ title, products, showColdStartBadge = false }: { title: string; products: RecommendationItem[]; showColdStartBadge?: boolean }) => {
    if (products.length === 0) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {showColdStartBadge && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              <TrendingUp className="h-3 w-3" />
              Trending for new users
            </span>
          )}
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {products.map((product) => (
            <ProductCard key={product.productId} product={product} showDiscount={title === "Special Offers"} />
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-[200px] h-[280px] bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error message if status="error" (non-blocking)
  if (hasError && error) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">Recommendations temporarily unavailable</p>
            <p className="text-xs text-yellow-700 mt-1">{error}</p>
          </div>
        </div>
        
        {/* Still show sections if we have data (even if status="error") */}
        {(forYou.length > 0 || popular.length > 0 || offers.length > 0) && (
          <div className="space-y-8">
            {forYou.length > 0 && (
              <ProductRow title={forYouTitle} products={forYou} showColdStartBadge={isColdStart} />
            )}
            {popular.length > 0 && (
              <ProductRow title={popularTitle} products={popular} />
            )}
            {offers.length > 0 && (
              <ProductRow title={offersTitle} products={offers} />
            )}
          </div>
        )}
      </div>
    );
  }

  const hasAnyRecommendations = forYou.length > 0 || popular.length > 0 || offers.length > 0;

  // Show error message if there's an error and no data
  if (error && !hasAnyRecommendations && !loading) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">Recommendations temporarily unavailable</p>
            <p className="text-xs text-yellow-700 mt-1">{error}</p>
          </div>
        </div>
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <div className="max-w-md mx-auto">
            <p className="text-2xl mb-2">👋 Welcome to our store!</p>
            <p className="text-gray-600 mb-4">
              Shop around to get personalized recommendations based on your interests.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAnyRecommendations && !loading && !error) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <div className="max-w-md mx-auto">
          <p className="text-2xl mb-2">👋 Welcome to our store!</p>
          <p className="text-gray-600 mb-4">
            Shop around to get personalized recommendations based on your interests.
          </p>
          <button
            onClick={() => {
              // Navigate to popular products or browse page
              window.scrollTo({ top: document.querySelector('[data-section="popular"]')?.getBoundingClientRect().top || 0, behavior: 'smooth' });
            }}
            className="px-6 py-2 bg-[#2563eb] text-white rounded-lg hover:bg-[#1d4ed8] transition-colors"
          >
            Browse Popular Products →
          </button>
        </div>
      </div>
    );
  }

  // Determine which sections to show based on data
  const showForYou = forYou.length > 0;
  const showPopular = popular.length > 0;
  const showOffers = offers.length > 0;

  return (
    <div className="space-y-8">
      {/* For You section */}
      {showForYou && (
        <ProductRow title={forYouTitle} products={forYou} showColdStartBadge={isColdStart} />
      )}
      
      {/* Popular section */}
      {showPopular && <ProductRow title={popularTitle} products={popular} />}
      
      {/* Offers section */}
      {showOffers && <ProductRow title={offersTitle} products={offers} />}
      
      {/* Subtle stale indicator */}
      {isStale && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 italic">
          <Clock className="h-3 w-3" />
          <span>Recommendations are being updated...</span>
        </div>
      )}
    </div>
  );
}

