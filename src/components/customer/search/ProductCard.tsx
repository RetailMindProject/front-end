import { Percent } from "lucide-react";
import type { ProductCard as ProductCardType } from "../../../types/customer.search";

interface ProductCardProps {
  product: ProductCardType;
  onClick?: () => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(price);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDiscount = (offer: ProductCardType["offer"]) => {
    if (!offer) return "";
    if (offer.discountType === "PERCENTAGE") {
      return `${offer.discountValue}% OFF`;
    } else {
      return `$${offer.discountValue.toFixed(2)} OFF`;
    }
  };

  // Use primaryImageUrl (already normalized to /picture/ format)
  const imageUrl = product.primaryImageUrl || product.imageUrl;

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200 flex flex-col cursor-pointer"
      onClick={onClick}
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className={`w-full h-full flex items-center justify-center ${imageUrl ? "hidden" : ""}`}
          style={{ display: imageUrl ? "none" : "flex" }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold">
            {getInitials(product.name)}
          </div>
        </div>
        
        {/* Offer Badge */}
        {product.offer && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
            <Percent className="h-3 w-3" />
            {formatDiscount(product.offer)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-2">
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
          {product.brand && (
            <p className="text-sm text-gray-600 mb-2">{product.brand}</p>
          )}
        </div>

        <div className="mt-auto pt-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl font-bold text-gray-900">
                {formatPrice(product.defaultPrice || product.price || 0)}
              </span>
              {product.taxRate > 0 && (
                <span className="text-xs text-gray-500 ml-2">+ {product.taxRate}% tax</span>
              )}
            </div>
          </div>
          {product.sku && (
            <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
          )}
        </div>
      </div>
    </div>
  );
}
