import { apiClient } from "./api.client";

// ========== Types ==========

export interface CategoryResponse {
  id: number;
  name: string;
  hasChildren: boolean;
}

export interface SubCategoryResponse {
  id: number;
  name: string;
  parentId: number;
}

export interface ProductOffer {
  id: number;
  title: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
}

export interface ProductListItem {
  id: number;
  sku: string;
  name: string;
  brand: string | null;
  defaultPrice: number;
  taxRate: number;
  primaryImageUrl: string | null;
  offer: ProductOffer | null;
}

export interface ProductsListResponse {
  content: ProductListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ProductImage {
  id: number;
  url: string;
  mimeType: string;
  title: string | null;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductCategory {
  id: number;
  name: string;
  parentId: number | null;
}

export interface ProductOfferDetail {
  id: number;
  title: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  offerType: string;
  startAt: string;
  endAt: string;
}

export interface ProductDetailsResponse {
  id: number;
  sku: string;
  name: string;
  brand: string | null;
  description: string | null;
  defaultPrice: number;
  taxRate: number;
  unit: string | null;
  categories: ProductCategory[];
  images: ProductImage[];
  offers: ProductOfferDetail[];
}

// ========== API Service ==========

export const customerBrowseApi = {
  /**
   * Get root categories
   * GET /api/customer/categories
   * Auth: JWT (CUSTOMER role)
   */
  async getCategories(): Promise<{ data?: CategoryResponse[]; error?: string; status?: number }> {
    const response = await apiClient.get<CategoryResponse[]>("/api/customer/categories", "CUSTOMER");
    
    if (response.status === 401 || response.status === 403) {
      return { 
        error: "Session expired. Please login again.", 
        status: response.status 
      };
    }
    
    if (response.error) {
      return { error: response.error, status: response.status };
    }
    
    return { data: response.data || [] };
  },

  /**
   * Get subcategories (children) for a category
   * GET /api/customer/categories/{id}/children
   * Auth: JWT (CUSTOMER role)
   */
  async getSubCategories(categoryId: number): Promise<{ data?: SubCategoryResponse[]; error?: string; status?: number }> {
    const response = await apiClient.get<SubCategoryResponse[]>(
      `/api/customer/categories/${categoryId}/children`,
      "CUSTOMER"
    );
    
    if (response.status === 401 || response.status === 403) {
      return { 
        error: "Session expired. Please login again.", 
        status: response.status 
      };
    }
    
    if (response.error) {
      return { error: response.error, status: response.status };
    }
    
    return { data: response.data || [] };
  },

  /**
   * Get products list with pagination and filters (fully server-driven)
   * GET /api/customer/products?page=<p>&size=<s>&q=<optional>&categoryId=<optional>&offersOnly=<optional>&minPrice=<optional>&maxPrice=<optional>&sortKey=<optional>
   * Auth: JWT (CUSTOMER role)
   */
  async getProducts(params: {
    page?: number;
    size?: number;
    q?: string;
    categoryId?: number;
    offersOnly?: boolean;
    minPrice?: number;
    maxPrice?: number;
    sortKey?: "RELEVANCE" | "PRICE_ASC" | "PRICE_DESC" | "NEWEST";
  }): Promise<{ data?: ProductsListResponse; error?: string; status?: number }> {
    const queryParams = new URLSearchParams();
    
    if (params.page !== undefined) {
      queryParams.append("page", params.page.toString());
    }
    if (params.size !== undefined) {
      queryParams.append("size", params.size.toString());
    }
    if (params.q !== undefined && params.q.trim()) {
      queryParams.append("q", params.q.trim());
    }
    if (params.categoryId !== undefined) {
      queryParams.append("categoryId", params.categoryId.toString());
    }
    if (params.offersOnly !== undefined && params.offersOnly) {
      queryParams.append("offersOnly", "true");
    }
    if (params.minPrice !== undefined) {
      queryParams.append("minPrice", params.minPrice.toString());
    }
    if (params.maxPrice !== undefined) {
      queryParams.append("maxPrice", params.maxPrice.toString());
    }
    if (params.sortKey !== undefined && params.sortKey !== "RELEVANCE") {
      queryParams.append("sortKey", params.sortKey);
    }
    
    const queryString = queryParams.toString();
    const endpoint = `/api/customer/products${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<ProductsListResponse>(endpoint, "CUSTOMER");
    
    if (response.status === 401 || response.status === 403) {
      return { 
        error: "Session expired. Please login again.", 
        status: response.status 
      };
    }
    
    if (response.status === 400) {
      // Handle validation errors (minPrice > maxPrice, invalid sortKey)
      return { 
        error: response.error || "Invalid filter parameters", 
        status: response.status 
      };
    }
    
    if (response.error) {
      return { error: response.error, status: response.status };
    }
    
    return { data: response.data };
  },

  /**
   * Get product details
   * GET /api/customer/products/{id}
   * Auth: JWT (CUSTOMER role)
   */
  async getProductDetails(productId: number): Promise<{ data?: ProductDetailsResponse; error?: string; status?: number }> {
    const response = await apiClient.get<ProductDetailsResponse>(
      `/api/customer/products/${productId}`,
      "CUSTOMER"
    );
    
    if (response.status === 401 || response.status === 403) {
      return { 
        error: "Session expired. Please login again.", 
        status: response.status 
      };
    }
    
    if (response.error) {
      return { error: response.error, status: response.status };
    }
    
    return { data: response.data };
  },
};
