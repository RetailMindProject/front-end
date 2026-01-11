import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { RecommendationItem, RecommendationMeta } from "../../types/customer.api";

interface RecommendationsSectionProps {
  forYou: RecommendationItem[];
  popular: RecommendationItem[];
  offers: RecommendationItem[];
  loading?: boolean;
  meta?: RecommendationMeta;
}

export default function RecommendationsSection({
  forYou,
  popular,
  offers,
  loading = false,
  meta,
}: RecommendationsSectionProps) {
  const navigate = useNavigate();
  
  // Determine section titles based on meta
  const forYouTitle = meta?.isColdStart ? "Popular near you" : "Recommended for you";
  const popularTitle = "Popular right now";
  const offersTitle = "Top offers for you";
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
          {showDiscount && hasDiscount && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              {product.offer!.discountPercent}% OFF
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
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

  const ProductRow = ({ title, products, isColdStart = false }: { title: string; products: RecommendationItem[]; isColdStart?: boolean }) => {
    if (products.length === 0) return null;

    return (
      <div className="mb-8">
        <h2 className={`text-xl font-bold mb-4 ${isColdStart ? "text-gray-700" : "text-gray-900"}`}>{title}</h2>
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

  const hasAnyRecommendations = forYou.length > 0 || popular.length > 0 || offers.length > 0;

  if (!hasAnyRecommendations) {
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

  // Determine which sections to show based on data and meta
  const showForYou = forYou.length > 0;
  const showPopular = popular.length > 0;
  const showOffers = offers.length > 0;
  const isColdStart = meta?.isColdStart === true;
  const isStale = meta?.isStale === true;

  // If all sections empty, hide entirely (handled by parent)
  if (!showForYou && !showPopular && !showOffers) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* For You section - de-emphasize if cold start */}
      {showForYou ? (
        <ProductRow title={forYouTitle} products={forYou} isColdStart={isColdStart} />
      ) : showPopular || showOffers ? (
        // Only show empty state if other sections have data
        null
      ) : null}
      
      {/* Popular section */}
      {showPopular && <ProductRow title={popularTitle} products={popular} />}
      
      {/* Offers section */}
      {showOffers && <ProductRow title={offersTitle} products={offers} />}
      
      {/* Subtle stale indicator */}
      {isStale && (
        <div className="text-xs text-gray-400 text-center italic">
          Recommendations are being updated...
        </div>
      )}
    </div>
  );
}

