import { apiClient } from "./api.client";
import { productsApi } from "./products.api";

export interface Product {
  id: number;
  sku: string;
  name: string;
  price: number;
  category?: string | null;
}

export interface Category {
  id: number;
  name: string;
}

export interface CreateOfferRequest {
  code: string;
  title: string;
  description: string;
  offerType: "PRODUCT" | "CATEGORY" | "ORDER" | "BUNDLE";
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
  productIds?: number[];
  categoryIds?: number[];
  minOrderAmount?: number;
  applyOnce?: boolean;
  bundleItems?: { productId: number; requiredQty: number }[];
}

export interface OfferResponse {
  id: number;
  code: string;
  title: string;
  description: string;
  offerType: "PRODUCT" | "CATEGORY" | "ORDER" | "BUNDLE";
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
  products: Product[] | null;
  categories: any[] | null;
  minOrderAmount: number | null;
  applyOnce: boolean | null;
  bundleItems: any[] | null;
}

export interface CreateOfferResponse {
  data: OfferResponse;
  success: boolean;
  message: string;
}

export const offersApi = {
  /**
   * Create a new offer
   */
  async createOffer(request: CreateOfferRequest): Promise<{ data?: CreateOfferResponse; error?: string }> {
    const response = await apiClient.post<CreateOfferResponse>("/api/offers", request);
    
    if (response.error) {
      return { error: response.error };
    }
    
    if (!response.data) {
      return { error: "No data received from server" };
    }
    
    return { data: response.data };
  },

  /**
   * Update an existing offer
   */
  async updateOffer(offerId: number, request: CreateOfferRequest): Promise<{ data?: CreateOfferResponse; error?: string }> {
    const response = await apiClient.put<CreateOfferResponse>(`/api/offers/${offerId}`, request);
    
    if (response.error) {
      return { error: response.error };
    }
    
    if (!response.data) {
      return { error: "No data received from server" };
    }
    
    return { data: response.data };
  },

  /**
   * Toggle offer status (active/inactive)
   * Uses PATCH /api/offers/{id}/toggle-status
   */
  async updateOfferStatus(offerId: number): Promise<{ data?: OfferResponse; error?: string }> {
    try {
      // PATCH /api/offers/{id}/toggle-status - no body needed as it toggles
      const response = await apiClient.patch<any>(
        `/api/offers/${offerId}/toggle-status`
      );
      
      if (response.error) {
        return { error: response.error };
      }
      
      if (!response.data) {
        return { error: "No data received from server" };
      }
      
      // Handle different response structures
      // If response has nested data structure: { data: OfferResponse, success: boolean, message: string }
      if (response.data.data && response.data.data.id) {
        return { data: response.data.data };
      }
      
      // If response.data is the OfferResponse directly
      if (response.data.id) {
        return { data: response.data };
      }
      
      return { error: "Invalid response structure from server" };
    } catch (error) {
      console.error("Error updating offer status:", error);
      return { error: error instanceof Error ? error.message : "Failed to update offer status" };
    }
  },

  /**
   * Fetch a single offer by ID
   */
  async fetchOfferById(offerId: number): Promise<OfferResponse | null> {
    try {
      const response = await apiClient.get<any>(`/api/offers/${offerId}`);
      
      if (response.error) {
        console.error("Failed to fetch offer:", response.error);
        return null;
      }
      
      if (!response.data) {
        console.warn("No offer data received from API");
        return null;
      }
      
      // Handle different response structures
      let offer: OfferResponse | null = null;
      
      if (response.data.id) {
        // If response.data is the OfferResponse directly
        offer = response.data;
      } else if (response.data.data && response.data.data.id) {
        // If response has nested data structure
        offer = response.data.data;
      }
      
      return offer;
    } catch (error) {
      console.error("Exception while fetching offer:", error);
      return null;
    }
  },

  /**
   * Fetch all offers
   */
  async fetchOffers(size: number = 1000): Promise<OfferResponse[] | null> {
    try {
      const response = await apiClient.get<any>(`/api/offers?size=${size}`);
      
      if (response.error) {
        console.error("Failed to fetch offers:", response.error);
        return null;
      }
      
      if (!response.data) {
        console.warn("No offers data received from API");
        return null;
      }
      
      // Handle different response structures
      let offers: OfferResponse[] = [];
      
      // If response.data is an array, use it directly
      if (Array.isArray(response.data)) {
        offers = response.data;
      }
      // If response.data has a 'data' property (nested structure)
      else if (response.data.data && Array.isArray(response.data.data)) {
        offers = response.data.data;
      }
      // If response.data has a 'content' property (pagination)
      else if (response.data.content && Array.isArray(response.data.content)) {
        offers = response.data.content;
      }
      // If response.data has an 'items' property
      else if (response.data.items && Array.isArray(response.data.items)) {
        offers = response.data.items;
      }
      
      console.log("Fetched offers:", offers);
      return offers.length > 0 ? offers : [];
    } catch (error) {
      console.error("Exception while fetching offers:", error);
      return null;
    }
  },

  /**
   * Fetch products by subcategory ID
   * Uses productsApi.search() or filter() with category filter
   */
  async fetchProductsBySubCategory(
    subCategoryId: number
  ): Promise<Product[] | null> {
    try {
      // Use search API with category filter
      // Note: This assumes the backend search/filter supports category filtering
      // If not, we may need to fetch all products and filter client-side
      let allProducts: Product[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        // Try using filter API - adjust based on actual backend support
        const response = await productsApi.filter({
          page,
          size: pageSize,
          isActive: true,
        });

        if (response.error) {
          console.error("Failed to fetch products by subcategory:", response.error);
          return null;
        }

        if (!response.data) {
          console.warn("No products data received from API");
          break;
        }

        // Filter products by subcategory on client side
        // Check if product has this subcategory in its categories array
        const pageProducts = response.data.content || [];
        const filteredProducts = pageProducts
          .filter((p: any) => {
            if (p.categories && Array.isArray(p.categories)) {
              return p.categories.some((cat: any) => cat.id === subCategoryId);
            }
            return false;
          })
          .map((p: any) => {
            const categoryName =
              p.categories && p.categories.length > 0
                ? p.categories[0].name
                : null;

            return {
              id: p.id,
              sku: p.sku || "",
              name: p.name || "",
              price: p.defaultPrice || p.price || 0,
              category: categoryName,
            };
          });

        allProducts = allProducts.concat(filteredProducts);

        // Check if there are more pages
        const totalPages = response.data.totalPages || 0;
        hasMore = page < totalPages - 1;
        page++;
      }

      console.log("Fetched products by subcategory:", allProducts);
      return allProducts.length > 0 ? allProducts : null;
    } catch (error) {
      console.error("Exception while fetching products by subcategory:", error);
      return null;
    }
  },

  /**
   * Fetch all products for offer selection
   */
  async fetchProducts(): Promise<Product[] | null> {
    try {
      // Fetch all products using filter API with large page size
      // We'll fetch multiple pages if needed to get all products
      let allProducts: Product[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const response = await productsApi.filter({
          page,
          size: pageSize,
          isActive: true, // Only fetch active products
        });

        if (response.error) {
          console.error("Failed to fetch products:", response.error);
          return null;
        }

        if (!response.data) {
          console.warn("No products data received from API");
          break;
        }

        // Handle paginated response
        const pageProducts = response.data.content || [];
        const mappedProducts = pageProducts.map((p: any) => {
          // Get category name from categories array or category field
          const categoryName = 
            (p.categories && p.categories.length > 0)
              ? p.categories[0].name
              : (typeof p.category === 'string' 
                  ? p.category 
                  : (p.category?.name || p.categoryName || null));

          return {
            id: p.id,
            sku: p.sku || "",
            name: p.name || "",
            price: p.price || p.defaultPrice || 0,
            category: categoryName,
          };
        });

        allProducts = allProducts.concat(mappedProducts);

        // Check if there are more pages
        const totalPages = response.data.totalPages || 0;
        hasMore = page < totalPages - 1;
        page++;
      }

      console.log("Fetched products:", allProducts);
      return allProducts.length > 0 ? allProducts : null;
    } catch (error) {
      console.error("Exception while fetching products:", error);
      return null;
    }
  },

  /**
   * Fetch all categories for offer selection
   * Since products don't contain category info, we need a separate endpoint
   */
  async fetchCategories(): Promise<Category[] | null> {
    try {
      // Try different possible category endpoints
      const possibleEndpoints = [
        "/api/categories",
        "/api/product-categories", 
        "/api/category",
        "/api/categories/list",
        "/api/products/categories",
        "/api/inventory/categories",
      ];

      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying category endpoint: ${endpoint}`);
          const response = await apiClient.get<any>(endpoint);
          
          if (response.error) {
            console.log(`Endpoint ${endpoint} failed:`, response.error);
            continue; // Try next endpoint
          }
          
          if (!response.data) {
            console.log(`Endpoint ${endpoint} returned no data`);
            continue;
          }
          
          // Handle different response structures
          let categories: Category[] = [];
          
          // If response.data is an array, use it directly
          if (Array.isArray(response.data)) {
            categories = response.data.map((c: any) => ({
              id: c.id,
              name: c.name || "",
            }));
          }
          // If response.data has a 'data' property (nested structure)
          else if (response.data.data && Array.isArray(response.data.data)) {
            categories = response.data.data.map((c: any) => ({
              id: c.id,
              name: c.name || "",
            }));
          }
          // If response.data has a 'content' property (pagination)
          else if (response.data.content && Array.isArray(response.data.content)) {
            categories = response.data.content.map((c: any) => ({
              id: c.id,
              name: c.name || "",
            }));
          }
          // If response.data has an 'items' property
          else if (response.data.items && Array.isArray(response.data.items)) {
            categories = response.data.items.map((c: any) => ({
              id: c.id,
              name: c.name || "",
            }));
          }
          
          if (categories.length > 0) {
            console.log(`Successfully fetched categories from ${endpoint}:`, categories);
            return categories.sort((a, b) => a.name.localeCompare(b.name));
          }
        } catch (error) {
          console.log(`Exception trying endpoint ${endpoint}:`, error);
          continue; // Try next endpoint
        }
      }

      // If all endpoints failed, return empty array
      console.error("All category endpoints failed. Please check the correct endpoint in the backend.");
      return [];
    } catch (error) {
      console.error("Exception while fetching categories:", error);
      return [];
    }
  },
};

