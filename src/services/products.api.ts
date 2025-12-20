simimport { apiClient, type ApiResponse } from "./api.client";
import { getCurrentToken } from "./tokens";

const API_BASE_URL = "http://localhost:8081";

// DTOs from backend ProductController
export interface CategoryDTO {
  id: number;
  name: string;
  parentId?: number | null;
}

export interface CategoryCreateDTO {
  name: string;
  parentId?: number | null;
}

export interface ProductCategoryDTO {
  category?: CategoryDTO;
}

export interface ProductDTO {
  id: number | string;
  name: string;
  sku?: string;
  brand?: string;
  description?: string;
  category?: string | CategoryDTO | ProductCategoryDTO;
  productCategory?: ProductCategoryDTO;
  categories?: CategoryDTO[];
  cost?: number;
  price?: number;
  defaultCost?: number;
  defaultPrice?: number;
  wholesalePrice?: number;
  unit?: string;
  imageUrl?: string | null;
  primaryImageUrl?: string | null; // Backend returns this for the primary image
  images?: Array<{ id: number; url: string; mimeType?: string; title?: string; altText?: string; sortOrder?: number; isPrimary?: boolean }>;
  isActive?: boolean;
  taxRate?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductCreateDTO {
  name: string;
  sku?: string;
  brand?: string;
  description?: string;
  category?: string; // Keep for backward compatibility
  categoryIds?: number[]; // Array of category IDs to link
  parentCategoryId?: number | null; // Required for create, can be null
  subCategoryId?: number; // Optional subcategory
  cost?: number;
  price?: number;
  defaultCost?: number;
  defaultPrice?: number;
  wholesalePrice?: number;
  unit?: string;
  imageUrl?: string | null;
  isActive?: boolean;
  taxRate?: number;
}

export interface ProductUpdateDTO extends ProductCreateDTO {}

export interface ProductMediaDTO {
  url: string;
  mimeType?: string;
  title?: string;
  altText?: string;
  sortOrder?: number;
  isPrimary?: boolean;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

function buildQuery(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.append(key, String(value));
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export const productsApi = {
  async getCategories() {
    return apiClient.get<CategoryDTO[]>("/api/categories");
  },

  async createCategory(payload: CategoryCreateDTO) {
    return apiClient.post<CategoryDTO>("/api/categories", payload);
  },

  async getProductCategories(productId: number | string) {
    return apiClient.get<CategoryDTO[]>(`/api/categories/product/${productId}`);
  },

  async getById(id: number | string) {
    return apiClient.get<ProductDTO>(`/api/products/${id}`);
  },

  async search(params: { q?: string; page?: number; size?: number } = {}) {
    const query = buildQuery(params);
    return apiClient.get<PageResponse<ProductDTO>>(`/api/products/search${query}`);
  },

  async filter(params: {
    brand?: string;
    isActive?: boolean;
    minPrice?: number;
    maxPrice?: number;
    sku?: string;
    page?: number;
    size?: number;
    sort?: string;
  } = {}) {
    const query = buildQuery(params);
    return apiClient.get<PageResponse<ProductDTO>>(`/api/products/filter${query}`);
  },

  async create(payload: ProductCreateDTO) {
    return apiClient.post<ProductDTO>("/api/products", payload);
  },

  async update(id: number | string, payload: ProductUpdateDTO) {
    return apiClient.put<ProductDTO>(`/api/products/${id}`, payload);
  },

  async remove(id: number | string) {
    return apiClient.delete<void>(`/api/products/${id}`);
  },

  async addImage(productId: number | string, payload: ProductMediaDTO) {
    return apiClient.post<ProductDTO>(`/api/products/${productId}/images`, payload);
  },

  async uploadImage(
    productId: number | string, 
    file: File, 
    options?: { isPrimary?: boolean; sortOrder?: number; title?: string; altText?: string }
  ): Promise<ApiResponse<ProductDTO>> {
    const token = getCurrentToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isPrimary', String(options?.isPrimary ?? true));
    formData.append('sortOrder', String(options?.sortOrder ?? 0));
    formData.append('title', options?.title || 'Product Image');
    formData.append('altText', options?.altText || 'Product image');
    
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    // Don't set Content-Type header - browser will set it with boundary for FormData

    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${productId}/images/upload`, {
        method: "POST",
        headers,
        body: formData,
      });

      // Handle empty response
      let data: unknown = null;
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Invalid JSON response",
            status: response.status,
          };
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.clear();
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        
        // Extract error message from response
        let errorMessage = `HTTP error! status: ${response.status}`;
        if (data) {
          const errorData = data as { message?: string; error?: string; exception?: string };
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.exception) {
            // For Hibernate errors, extract the meaningful part
            if (errorData.exception.includes('already associated with the session')) {
              errorMessage = 'Image already exists. The file may have been saved but the database record already exists.';
            } else {
              errorMessage = errorData.exception;
            }
          }
        }
        
        console.error('Image upload failed:', {
          status: response.status,
          productId,
          error: errorMessage,
          responseData: data
        });
        
        return {
          error: errorMessage,
          status: response.status,
        };
      }

      return {
        data: data as ProductDTO,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      };
    }
  },

  async updateImage(productId: number | string, mediaId: number | string, file: File): Promise<ApiResponse<ProductDTO>> {
    const token = getCurrentToken();
    const formData = new FormData();
    formData.append('file', file);
    
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    // Don't set Content-Type header - browser will set it with boundary for FormData

    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${productId}/images/${mediaId}/upload`, {
        method: "PUT",
        headers,
        body: formData,
      });

      // Handle empty response
      let data: unknown = null;
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Invalid JSON response",
            status: response.status,
          };
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.clear();
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        
        const message = (data as { message?: string })?.message;
        return {
          error: message || `HTTP error! status: ${response.status}`,
          status: response.status,
        };
      }

      return {
        data: data as ProductDTO,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      };
    }
  },

  // Helper function to get image URL for viewing
  getImageUrl(productId: number | string, fileName: string): string {
    // Remove any path prefix if fileName already includes it
    const cleanFileName = fileName.includes('/') ? fileName.split('/').pop() || fileName : fileName;
    return `${API_BASE_URL}/api/products/${productId}/images/${cleanFileName}`;
  },

  // Helper function to normalize image URLs from various formats
  // Handles media.url field which can be: filename, path, or full URL
  normalizeImageUrl(imageUrl: string | null | undefined, productId?: number | string): string | null {
    if (!imageUrl) return null;
    
    // If it's already a full URL (http/https), return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // If it's already an API endpoint URL, return as is
    if (imageUrl.startsWith('/api/products/')) {
      return `${API_BASE_URL}${imageUrl}`;
    }
    
    // If productId is provided, convert to API endpoint
    // media.url can be: "abc123.jpg" or "uploads/products/1/abc123.jpg"
    if (productId) {
      // Extract filename from path if needed
      const fileName = imageUrl.includes('/') ? imageUrl.split('/').pop() || imageUrl : imageUrl;
      const normalizedUrl = this.getImageUrl(productId, fileName);
      console.log('Normalized image URL:', { original: imageUrl, productId, fileName, normalized: normalizedUrl });
      return normalizedUrl;
    }
    
    // If no productId, try to extract it from path like "uploads/products/1/abc123.jpg"
    if (imageUrl.includes('uploads/products/')) {
      const parts = imageUrl.split('/');
      const productIdIndex = parts.indexOf('products');
      if (productIdIndex >= 0 && parts[productIdIndex + 1]) {
        const extractedProductId = parts[productIdIndex + 1];
        const fileName = parts[parts.length - 1];
        return this.getImageUrl(extractedProductId, fileName);
      }
    }
    
    // Fallback: assume it's a relative path
    return imageUrl.startsWith('/') ? `${API_BASE_URL}${imageUrl}` : `${API_BASE_URL}/${imageUrl}`;
  },

  async removeImage(productId: number | string, mediaId: number | string) {
    return apiClient.delete<void>(`/api/products/${productId}/images/${mediaId}`);
  },

  async setPrimaryImage(productId: number | string, mediaId: number | string) {
    return apiClient.put<ProductDTO>(`/api/products/${productId}/images/${mediaId}/set-primary`, {});
  },

};

