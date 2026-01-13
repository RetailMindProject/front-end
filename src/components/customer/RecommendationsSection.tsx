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
    const displayPrice = product.price ?? 0;
    const hasDiscount = product.hasOffer && product.offer?.discountPercent;
    const isAvailable = product.available !== false;

    return (
      <div className="flex-shrink-0 w-[220px] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200">
        <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-gray-200 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-xs text-gray-400">No image</p>
              </div>
            </div>
          )}
          {showDiscount && hasDiscount && product.offer && (
            <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
              {product.offer.discountPercent}% OFF
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="mb-3">
            <h3 className="font-medium text-sm text-gray-900 line-clamp-2 leading-snug mb-1">{product.name}</h3>
            <p className="text-xs text-gray-500">{product.categoryName}</p>
          </div>
          {displayPrice > 0 && (
            <p className="text-lg font-semibold text-gray-900 mb-3">${displayPrice.toFixed(2)}</p>
          )}
          {isAvailable ? (
            <button
              className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors duration-150 flex items-center justify-center gap-2 shadow-sm"
              onClick={() => navigate(`/products/${product.productId}`)}
            >
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </button>
          ) : (
            <button
              className="w-full bg-gray-100 text-gray-500 text-sm font-medium py-2.5 rounded-lg cursor-not-allowed"
              disabled
            >
              Out of Stock
            </button>
          )}
        </div>
      </div>
    );
  };

  const ProductRow = ({ title, products, showColdStartBadge = false, showEmptyMessage = false }: { title: string; products: RecommendationItem[]; showColdStartBadge?: boolean; showEmptyMessage?: boolean }) => {
    return (
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-5">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {showColdStartBadge && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
              <TrendingUp className="h-3 w-3" />
              New user picks
            </span>
          )}
        </div>
        {products.length === 0 ? (
          showEmptyMessage ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
              <p className="text-gray-600 text-sm leading-relaxed">
                {title === "Recommended for you" || title === "Popular near you" 
                  ? "We're still learning your preferences. Start shopping to see personalized recommendations!"
                  : title === "Special Offers"
                  ? "No special offers available right now. Check back soon for exclusive deals!"
                  : "No items available at the moment."}
              </p>
            </div>
          ) : null
        ) : (
          <div className="flex gap-5 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {products.map((product) => (
              <ProductCard key={product.productId} product={product} showDiscount={title === "Special Offers"} />
            ))}
          </div>
        )}
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
        
        {/* Still show sections (even if empty) */}
        <div className="space-y-8">
          <ProductRow 
            title={forYouTitle} 
            products={forYou} 
            showColdStartBadge={isColdStart && forYou.length > 0}
            showEmptyMessage={forYou.length === 0}
          />
          {popular.length > 0 && (
            <ProductRow title={popularTitle} products={popular} />
          )}
          <ProductRow 
            title={offersTitle} 
            products={offers}
            showEmptyMessage={offers.length === 0}
          />
        </div>
      </div>
    );
  }

  const hasAnyRecommendations = forYou.length > 0 || popular.length > 0 || offers.length > 0;

  // Show error message if status="error" (downstream service failed)
  if (status === "error" && error) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">Recommendations temporarily unavailable</p>
            <p className="text-xs text-yellow-700 mt-1">{error}</p>
          </div>
        </div>
        
        {/* Still show sections (even if empty) */}
        <div className="space-y-8">
          <ProductRow 
            title={forYouTitle} 
            products={forYou} 
            showColdStartBadge={isColdStart && forYou.length > 0}
            showEmptyMessage={forYou.length === 0}
          />
          {popular.length > 0 && (
            <ProductRow title={popularTitle} products={popular} />
          )}
          <ProductRow 
            title={offersTitle} 
            products={offers}
            showEmptyMessage={offers.length === 0}
          />
        </div>
      </div>
    );
  }

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

  // Show empty state if status="success" but no recommendations (cold start or no data)
  if (!hasAnyRecommendations && !loading && !error && status === "success") {
    const isColdStartMessage = meta?.isColdStart ? "We're learning your preferences. Shop around to get personalized recommendations!" : "Shop around to get personalized recommendations based on your interests.";
    
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <div className="max-w-md mx-auto">
          <p className="text-2xl mb-2">👋 Welcome to our store!</p>
          <p className="text-gray-600 mb-4">
            {isColdStartMessage}
          </p>
          {meta?.isColdStart && (
            <div className="mb-4 inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              <TrendingUp className="h-3 w-3" />
              <span>New user - recommendations coming soon!</span>
            </div>
          )}
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

  // Always show sections, even if empty (with messages)
  const showPopular = popular.length > 0; // Only show Popular if it has items

  return (
    <div className="space-y-8">
      {/* For You section - Always show */}
      <ProductRow 
        title={forYouTitle} 
        products={forYou} 
        showColdStartBadge={isColdStart && forYou.length > 0}
        showEmptyMessage={forYou.length === 0}
      />
      
      {/* Popular section - Only show if has items */}
      {showPopular && <ProductRow title={popularTitle} products={popular} />}
      
      {/* Offers section - Always show */}
      <ProductRow 
        title={offersTitle} 
        products={offers}
        showEmptyMessage={offers.length === 0}
      />
      
      {/* Subtle stale indicator */}
      {isStale && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
          <Clock className="h-3 w-3" />
          <span>Updating recommendations...</span>
        </div>
      )}
    </div>
  );
}

