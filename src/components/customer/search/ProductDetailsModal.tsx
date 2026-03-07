import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Percent, Tag } from "lucide-react";
import { customerBrowseApi, type ProductDetailsResponse } from "../../../services/customer.browse.api";
import { Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearAllTokens } from "../../../services/tokens";
import { normalizeProductImageUrl } from "../../../utils/imageUrl";

interface ProductDetailsModalProps {
  productId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductDetailsModal({ productId, isOpen, onClose }: ProductDetailsModalProps) {
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (isOpen && productId) {
      loadProductDetails();
    } else {
      setProduct(null);
      setError(null);
      setCurrentImageIndex(0);
    }
  }, [isOpen, productId]);

  const loadProductDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await customerBrowseApi.getProductDetails(productId);
      
      if (result.status === 401 || result.status === 403) {
        clearAllTokens();
        navigate("/login");
        return;
      }
      
      if (result.error) {
        setError(result.error);
        setProduct(null);
      } else if (result.data) {
        setProduct(result.data);
        // Find primary image index or default to 0
        const primaryIndex = result.data.images.findIndex(img => img.isPrimary);
        setCurrentImageIndex(primaryIndex >= 0 ? primaryIndex : 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product details");
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(price);
  };

  const formatDiscount = (offer: ProductDetailsResponse["offers"][0]) => {
    if (offer.discountType === "PERCENTAGE") {
      return `${offer.discountValue}% OFF`;
    } else {
      return `$${offer.discountValue.toFixed(2)} OFF`;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Normalize image URLs for frontend display
  const sortedImages = (product?.images.sort((a, b) => a.sortOrder - b.sortOrder) || []).map(img => ({
    ...img,
    url: normalizeProductImageUrl(img.url) || img.url, // Fallback to original if normalization returns null
  }));
  const currentImage = sortedImages[currentImageIndex];
  const hasMultipleImages = sortedImages.length > 1;

  const nextImage = () => {
    if (hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev + 1) % sortedImages.length);
    }
  };

  const prevImage = () => {
    if (hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Product Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900">Error loading product</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          ) : product ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Images Gallery */}
              <div className="space-y-4">
                <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden relative">
                  {currentImage ? (
                    <img
                      src={currentImage.url}
                      alt={currentImage.altText || currentImage.title || product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-full h-full flex items-center justify-center ${currentImage ? "hidden" : ""}`}
                    style={{ display: currentImage ? "none" : "flex" }}
                  >
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-4xl font-bold">
                      {getInitials(product.name)}
                    </div>
                  </div>
                  
                  {/* Navigation arrows */}
                  {hasMultipleImages && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5 text-gray-700" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5 text-gray-700" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnail gallery */}
                {sortedImages.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {sortedImages.map((img, index) => (
                      <button
                        key={img.id}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          index === currentImageIndex
                            ? "border-blue-500 ring-2 ring-blue-200"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.altText || img.title || `${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                  {product.brand && (
                    <p className="text-lg text-gray-600 mb-2">Brand: {product.brand}</p>
                  )}
                  {product.sku && (
                    <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                  )}
                </div>

                {/* Categories */}
                {product.categories && product.categories.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.categories.map((cat) => (
                        <span
                          key={cat.id}
                          className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-lg font-medium"
                        >
                          {cat.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price */}
                <div className="border-t border-b border-gray-200 py-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-gray-900">
                      {formatPrice(product.defaultPrice)}
                    </span>
                    {product.taxRate > 0 && (
                      <span className="text-sm text-gray-500">+ {product.taxRate}% tax</span>
                    )}
                  </div>
                  {product.unit && (
                    <p className="text-sm text-gray-500 mt-1">Unit: {product.unit}</p>
                  )}
                </div>

                {/* Offers */}
                {product.offers && product.offers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Tag className="h-5 w-5 text-red-500" />
                      Active Offers
                    </h3>
                    <div className="space-y-3">
                      {product.offers.map((offer) => (
                        <div
                          key={offer.id}
                          className="p-4 bg-red-50 border border-red-200 rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-red-900">{offer.title}</h4>
                              <p className="text-sm text-red-700 mt-1">
                                {formatDiscount(offer)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-red-600">
                              <Percent className="h-5 w-5" />
                            </div>
                          </div>
                          <p className="text-xs text-red-600 mt-2">
                            Valid: {new Date(offer.startAt).toLocaleDateString()} - {new Date(offer.endAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {product.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
