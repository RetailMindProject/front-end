import { Percent } from "lucide-react";
import type { ProductCard as ProductCardType } from "../../../types/customer.search";

interface ProductCardProps {
  product: ProductCardType;
}

export default function ProductCard({ product }: ProductCardProps) {
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200 flex flex-col">
      {/* Image */}
      <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
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
          className={`w-full h-full flex items-center justify-center ${product.imageUrl ? "hidden" : ""}`}
          style={{ display: product.imageUrl ? "none" : "flex" }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold">
            {getInitials(product.name)}
          </div>
        </div>
        
        {/* Offer Badge */}
        {product.hasOffer && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
            <Percent className="h-3 w-3" />
            Offer
          </div>
        )}

        {/* Stock Badge */}
        {!product.inStock && (
          <div className="absolute top-2 left-2 bg-gray-800 text-white px-2 py-1 rounded-lg text-xs font-semibold">
            Out of Stock
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-2">
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
          <div className="flex flex-wrap gap-1 mb-2">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">
              {product.categoryName}
            </span>
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-md font-medium">
              {product.subCategoryName}
            </span>
          </div>
        </div>

        <div className="mt-auto pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-gray-900">{formatPrice(product.price)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
