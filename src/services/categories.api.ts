import { apiClient } from "./api.client";

// Category with subcategories (hierarchy)
export interface CategoryHierarchy {
  id: number;
  name: string;
  parentId: number | null;
  parentName: string | null;
  subCategories: SubCategory[];
}

// SubCategory (used in hierarchy)
export interface SubCategory {
  id: number;
  name: string;
  productCount?: number;
}

// Simple Category (used in parents and all)
export interface Category {
  id: number;
  name: string;
  parentId: number | null;
}

export const categoriesApi = {
  /**
   * Get categories hierarchy with subcategories
   * GET /api/categories/hierarchy
   */
  async getHierarchy(): Promise<{ data?: CategoryHierarchy[]; error?: string }> {
    const response = await apiClient.get<CategoryHierarchy[]>("/api/categories/hierarchy");

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data || [] };
  },

  /**
   * Get parent categories only
   * GET /api/categories/parents
   */
  async getParents(): Promise<{ data?: Category[]; error?: string }> {
    const response = await apiClient.get<Category[]>("/api/categories/parents");

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data || [] };
  },

  /**
   * Get subcategories for a specific parent category
   * GET /api/categories/{parentId}/sub-categories
   */
  async getSubCategories(
    parentId: number
  ): Promise<{ data?: SubCategory[]; error?: string }> {
    const response = await apiClient.get<SubCategory[]>(
      `/api/categories/${parentId}/sub-categories`
    );

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data || [] };
  },

  /**
   * Get all categories (flat list)
   * GET /api/categories/all
   */
  async getAll(): Promise<{ data?: Category[]; error?: string }> {
    const response = await apiClient.get<Category[]>("/api/categories/all");

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data || [] };
  },
};

