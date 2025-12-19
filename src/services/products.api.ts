import { apiClient } from "./api.client";

export interface Product {
  id: number;
  sku?: string;
  name: string;
  brand?: string;
  description?: string;
  category?: string;
  cost?: number;
  price?: number;
  wholesalePrice?: number;
  unit?: string;
  image?: string | null;
  active?: boolean;
  views?: number;
  orders?: number;
  sales?: number;
  subscribers?: number;
}

export interface ProductListResponse {
  content: Product[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface ProductFilterParams {
  page?: number;
  size?: number;
  search?: string;
  brand?: string;
  active?: boolean;
  category?: string;
}

export const productsApi = {
  /**
   * Get list of products with filtering and pagination
   */
  async getProducts(
    params: ProductFilterParams = {}
  ): Promise<ProductListResponse | null> {
    const { page = 0, size = 20, search, brand, active, category } = params;

    let url = `/api/products?page=${page}&size=${size}`;

    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    if (brand) {
      url += `&brand=${encodeURIComponent(brand)}`;
    }
    if (active !== undefined) {
      url += `&active=${active}`;
    }
    if (category) {
      url += `&category=${encodeURIComponent(category)}`;
    }

    const response = await apiClient.get<ProductListResponse>(url);

    if (response.error || !response.data) {
      console.error("Failed to fetch products:", response.error);
      return null;
    }

    return response.data;
  },

  /**
   * Get a single product by ID
   */
  async getProductById(productId: number): Promise<Product | null> {
    const response = await apiClient.get<Product>(`/api/products/${productId}`);

    if (response.error || !response.data) {
      console.error("Failed to fetch product:", response.error);
      return null;
    }

    return response.data;
  },
};


