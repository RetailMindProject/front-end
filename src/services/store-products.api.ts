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
  expirationDate?: string | null; // Optional expiration date for batch tracking
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

export interface WasteRequestDTO {
  productId: number;
  quantity: number;
  batchId?: number | null;
  note: string; // Required - waste reason (formatted as "Waste Reason: REASON" or "Waste Reason: REASON. additional notes")
}

export interface WasteRecordDTO {
  id: number;
  productId: number;
  productName: string;
  productSku?: string;
  quantity: number;
  batchId?: number | null;
  expirationDate?: string | null;
  wasteReason: 'EXPIRED' | 'BROKEN' | 'DAMAGED' | 'OTHER';
  notes?: string;
  createdAt: string;
  createdBy?: string;
  movementId: number;
}

export interface ProductsForWasteParams {
  page?: number;
  size?: number;
  q?: string; // Search by name, SKU, or ID
  hasInventory?: boolean;
}

export interface ProductBatchDTO {
  batchId: number;
  expirationDate: string;
  totalQuantity: number;
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

  // Get products with existing inventory (for re-stocking window)
  async getProductsWithInventory(params?: StoreProductSearchParams): Promise<ApiResponse<{ content: StoreProductResponseDTO[]; totalElements: number; totalPages: number; number: number; size: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.q) queryParams.append('q', params.q);
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    
    const queryString = queryParams.toString();
    return apiClient.get<{ content: StoreProductResponseDTO[]; totalElements: number; totalPages: number; number: number; size: number }>(
      `/api/store-products/with-inventory${queryString ? `?${queryString}` : ''}`
    );
  },

  // Re-stock an existing product
  async restock(dto: StoreTransferRequestDTO): Promise<ApiResponse<StoreProductResponseDTO>> {
    return apiClient.post<StoreProductResponseDTO>("/api/store-products/restock", dto);
  },

  // Get batches (expiration dates) for a product
  async getBatchesForProduct(productId: number | string): Promise<ApiResponse<ProductBatchDTO[]>> {
    return apiClient.get<ProductBatchDTO[]>(`/api/store-products/${productId}/batches`);
  },

  // Get products available for waste (with pagination and search)
  async getProductsForWaste(params?: ProductsForWasteParams): Promise<ApiResponse<{ content: StoreProductResponseDTO[]; totalElements: number; totalPages: number; number: number; size: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.q) queryParams.append('q', params.q);
    if (params?.hasInventory !== undefined) queryParams.append('hasInventory', params.hasInventory.toString());
    
    const queryString = queryParams.toString();
    return apiClient.get<{ content: StoreProductResponseDTO[]; totalElements: number; totalPages: number; number: number; size: number }>(
      `/api/store-products/waste/products${queryString ? `?${queryString}` : ''}`
    );
  },

  // Record waste
  async recordWaste(dto: WasteRequestDTO): Promise<ApiResponse<StoreProductResponseDTO>> {
    return apiClient.post<StoreProductResponseDTO>("/api/store-products/waste", dto);
  },

  // Get waste history
  async getWasteHistory(params?: { 
    page?: number;
    size?: number;
    reason?: string;
    productId?: number;
  }): Promise<ApiResponse<{ content: WasteRecordDTO[]; totalElements: number; totalPages: number; number: number; size: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.reason) queryParams.append('reason', params.reason);
    if (params?.productId) queryParams.append('productId', params.productId.toString());
    
    const queryString = queryParams.toString();
    return apiClient.get<{ content: WasteRecordDTO[]; totalElements: number; totalPages: number; number: number; size: number }>(
      `/api/store-products/waste-history${queryString ? `?${queryString}` : ''}`
    );
  },
};

