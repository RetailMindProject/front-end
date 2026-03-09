// Types for Customer Search Feature
// Matches backend API responses

export interface Category {
  id: number;
  name: string;
  hasChildren: boolean;
  iconUrl?: string; // Optional UI enhancement
}

export interface SubCategory {
  id: number;
  name: string;
  parentId: number;
  categoryId?: number; // For backward compatibility
}

export interface ProductOffer {
  id: number;
  title: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
}

export interface ProductCard {
  id: number;
  sku: string;
  name: string;
  brand: string | null;
  defaultPrice: number;
  taxRate: number;
  primaryImageUrl: string | null;
  offer: ProductOffer | null;
  // Legacy fields for backward compatibility (will be removed)
  price?: number;
  imageUrl?: string;
  categoryId?: number;
  categoryName?: string;
  subCategoryId?: number;
  subCategoryName?: string;
  inStock?: boolean;
  hasOffer?: boolean;
}

export interface SearchParams {
  q?: string;
  categoryId?: number;
  subCategoryId?: number;
  offersOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortKey?: "RELEVANCE" | "PRICE_ASC" | "PRICE_DESC" | "NEWEST";
  page?: number;
  size?: number;
}

export interface SearchResponse {
  items: ProductCard[];
  total: number;
  page: number;
  size: number;
}
