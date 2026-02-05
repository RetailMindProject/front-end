// Types for Customer Search Feature
// TODO: Replace with real API types when backend is ready

export interface Category {
  id: number;
  name: string;
  iconUrl?: string;
}

export interface SubCategory {
  id: number;
  name: string;
  categoryId: number;
}

export interface ProductCard {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  categoryId: number;
  categoryName: string;
  subCategoryId: number;
  subCategoryName: string;
  inStock: boolean;
  hasOffer?: boolean;
}

export interface SearchParams {
  q?: string;
  categoryId?: number;
  subCategoryId?: number;
  inStockOnly?: boolean;
  offersOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: "relevance" | "price_asc" | "price_desc" | "newest";
  page?: number;
  size?: number;
}

export interface SearchResponse {
  items: ProductCard[];
  total: number;
  page: number;
  size: number;
}
