import { apiClient, type ApiResponse } from "./api.client";

// DTOs from backend StoreProductController
export interface StoreProductResponseDTO {
  productId: number;
  productName: string;
  sku?: string;
  brand?: string;
  category?: string;
  price?: number;
  cost?: number;
  warehouseQuantity?: number; // camelCase (if backend uses it)
  warehouseQty?: number; // lowercase (actual backend response)
  storeQuantity?: number; // camelCase (if backend uses it)
  storeQty?: number; // lowercase (actual backend response)
  imageUrl?: string | null;
  primaryImageUrl?: string | null;
  images?: Array<{ id: number; url: string; mimeType?: string; title?: string; altText?: string; sortOrder?: number; isPrimary?: boolean }>;
  isActive?: boolean;
}

export interface StoreTransferRequestDTO {
  productId: number;
  quantity: number;
  notes?: string;
}

export interface AdjustQuantityDTO {
  productId: number;
  quantity: number;
  notes?: string;
}

export interface StoreProductFilterParams {
  brand?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sku?: string;
  page?: number;
  size?: number;
  sort?: string; // e.g., "name,asc" or "price,desc"
}

export interface StoreProductSearchParams {
  q?: string;
  page?: number;
  size?: number;
}

export const storeProductsApi = {
  // Transfer WAREHOUSE → STORE
  async transferToStore(dto: StoreTransferRequestDTO): Promise<ApiResponse<StoreProductResponseDTO>> {
    return apiClient.post<StoreProductResponseDTO>("/api/store-products/transfer-to-store", dto);
  },

  // Transfer STORE → WAREHOUSE (remove from store)
  async removeFromStore(dto: StoreTransferRequestDTO): Promise<ApiResponse<StoreProductResponseDTO>> {
    // Note: DELETE endpoint with body - backend expects this
    return apiClient.delete<StoreProductResponseDTO>("/api/store-products/remove-from-store", dto);
  },

  // Transfer STORE → WAREHOUSE (alternative endpoint)
  async transferToInventory(dto: StoreTransferRequestDTO): Promise<ApiResponse<StoreProductResponseDTO>> {
    return apiClient.post<StoreProductResponseDTO>("/api/store-products/transfer-to-inventory", dto);
  },

  // Add products to inventory (PURCHASE)
  async addToInventory(dto: StoreTransferRequestDTO): Promise<ApiResponse<StoreProductResponseDTO>> {
    return apiClient.post<StoreProductResponseDTO>("/api/store-products/add-to-inventory", dto);
  },

  // Increase quantity in store (ADJUSTMENT)
  async increaseStoreQuantity(dto: AdjustQuantityDTO): Promise<ApiResponse<StoreProductResponseDTO>> {
    return apiClient.post<StoreProductResponseDTO>("/api/store-products/store/increase", dto);
  },

  // Decrease quantity in store (ADJUSTMENT)
  async decreaseStoreQuantity(dto: AdjustQuantityDTO): Promise<ApiResponse<StoreProductResponseDTO>> {
    return apiClient.post<StoreProductResponseDTO>("/api/store-products/store/decrease", dto);
  },

  // Increase quantity in warehouse (ADJUSTMENT)
  async increaseWarehouseQuantity(dto: AdjustQuantityDTO): Promise<ApiResponse<StoreProductResponseDTO>> {
    return apiClient.post<StoreProductResponseDTO>("/api/store-products/warehouse/increase", dto);
  },

  // Decrease quantity in warehouse (ADJUSTMENT)
  async decreaseWarehouseQuantity(dto: AdjustQuantityDTO): Promise<ApiResponse<StoreProductResponseDTO>> {
    return apiClient.post<StoreProductResponseDTO>("/api/store-products/warehouse/decrease", dto);
  },

  // Simple search by name or SKU
  async search(params: StoreProductSearchParams): Promise<ApiResponse<{ content: StoreProductResponseDTO[]; totalElements: number; totalPages: number; number: number; size: number }>> {
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.append('q', params.q);
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    
    return apiClient.get<{ content: StoreProductResponseDTO[]; totalElements: number; totalPages: number; number: number; size: number }>(
      `/api/store-products/search?${queryParams.toString()}`
    );
  },

  // Advanced filter with sorting
  async filter(params: StoreProductFilterParams): Promise<ApiResponse<{ content: StoreProductResponseDTO[]; totalElements: number; totalPages: number; number: number; size: number }>> {
    const queryParams = new URLSearchParams();
    if (params.brand) queryParams.append('brand', params.brand);
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params.minPrice !== undefined) queryParams.append('minPrice', params.minPrice.toString());
    if (params.maxPrice !== undefined) queryParams.append('maxPrice', params.maxPrice.toString());
    if (params.sku) queryParams.append('sku', params.sku);
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.sort) queryParams.append('sort', params.sort);
    
    return apiClient.get<{ content: StoreProductResponseDTO[]; totalElements: number; totalPages: number; number: number; size: number }>(
      `/api/store-products/filter?${queryParams.toString()}`
    );
  },

  // Get stock for a specific product
  async getByProductId(productId: number | string): Promise<ApiResponse<StoreProductResponseDTO>> {
    return apiClient.get<StoreProductResponseDTO>(`/api/store-products/${productId}`);
  },
};

