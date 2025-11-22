import { apiClient } from "./api.client";

export interface DashboardSummary {
  totalSales: number;
  totalOrders: number;
  recentDailyAmount: number;
  recentDate: string;
  mostPopularProduct: string;
  mostPopularSold: number;
  mostPopularRevenue: number;
}

export interface SalesTrendItem {
  day: string;
  revenue: number;
  orders: number;
}

export interface CategoryCount {
  name: string;
  value: number;
}

export interface TopProduct {
  productId: number;
  name: string;
  sku: string;
  sold: number;
  revenue: number;
}

export interface RecentDaily {
  date: string;
  amount: number;
  orders: number;
}

export interface InventorySummary {
  totalInThisWeek: number;
  totalOutThisWeek: number;
  movementCount: number;
  mostMovedProduct: string;
}

export interface RecentMovement {
  date: string;
  productName: string;
  categoryName: string;
  locationType: "STORE" | "WAREHOUSE";
  refType: "SALE" | "PURCHASE";
  quantityChange: number;
}

export interface CategoryMovement {
  categoryName: string;
  totalIn: number;
  totalOut: number;
}

export interface CategorySales {
  categoryName: string;
  salesQty: number;
}

export interface TopProductMovement {
  productId: number;
  productName: string;
  categoryName: string;
  totalMovementQty: number;
}

export interface WeeklyTrend {
  date: string;
  totalIn: number;
  totalOut: number;
}

export const dashboardApi = {
  async fetchStoreSummary(): Promise<DashboardSummary | null> {
    const response = await apiClient.get<DashboardSummary>("/api/dashboard/store/summary");
    
    if (response.error || !response.data) {
      console.error("Failed to fetch dashboard summary:", response.error);
      return null;
    }
    
    return response.data;
  },

  async fetchSalesTrend(): Promise<SalesTrendItem[] | null> {
    const response = await apiClient.get<SalesTrendItem[]>("/api/dashboard/store/sales-trend");
    
    if (response.error || !response.data) {
      console.error("Failed to fetch sales trend:", response.error);
      return null;
    }
    
    return response.data;
  },

  async fetchCategoryCounts(): Promise<CategoryCount[] | null> {
    const response = await apiClient.get<CategoryCount[]>("/api/dashboard/store/category-counts");
    
    if (response.error || !response.data) {
      console.error("Failed to fetch category counts:", response.error);
      return null;
    }
    
    return response.data;
  },

  async fetchTopProducts(): Promise<TopProduct[] | null> {
    const response = await apiClient.get<TopProduct[]>("/api/dashboard/store/top-products");
    
    if (response.error || !response.data) {
      console.error("Failed to fetch top products:", response.error);
      return null;
    }
    
    return response.data;
  },

  async fetchRecentDaily(): Promise<RecentDaily[] | null> {
    const response = await apiClient.get<RecentDaily[]>("/api/dashboard/store/recent-daily");
    
    if (response.error || !response.data) {
      console.error("Failed to fetch recent daily:", response.error);
      return null;
    }
    
    return response.data;
  },

  async fetchInventorySummary(): Promise<InventorySummary | null> {
    const response = await apiClient.get<InventorySummary>("/api/dashboard/inventory/summary");
    
    if (response.error || !response.data) {
      console.error("Failed to fetch inventory summary:", response.error);
      return null;
    }
    
    return response.data;
  },

  async fetchRecentMovements(): Promise<RecentMovement[] | null> {
    const response = await apiClient.get<RecentMovement[]>("/api/dashboard/inventory/recent-movements");
    
    if (response.error || !response.data) {
      console.error("Failed to fetch recent movements:", response.error);
      return null;
    }
    
    return response.data;
  },

  async fetchCategoryMovement(): Promise<CategoryMovement[] | null> {
    const response = await apiClient.get<CategoryMovement[]>("/api/dashboard/inventory/category-movement");
    
    if (response.error || !response.data) {
      console.error("Failed to fetch category movement:", response.error);
      return null;
    }
    
    return response.data;
  },

  async fetchCategorySales(): Promise<CategorySales[] | null> {
    const response = await apiClient.get<CategorySales[]>("/api/dashboard/inventory/category-sales-pie");
    
    if (response.error || !response.data) {
      console.error("Failed to fetch category sales:", response.error);
      return null;
    }
    
    return response.data;
  },

  async fetchInventoryTopProducts(): Promise<TopProductMovement[] | null> {
    const response = await apiClient.get<TopProductMovement[]>("/api/dashboard/inventory/top-products");
    
    if (response.error || !response.data) {
      console.error("Failed to fetch inventory top products:", response.error);
      return null;
    }
    
    return response.data;
  },

  async fetchWeeklyTrend(): Promise<WeeklyTrend[] | null> {
    const response = await apiClient.get<WeeklyTrend[]>("/api/dashboard/inventory/weekly-trend");
    
    if (response.error || !response.data) {
      console.error("Failed to fetch weekly trend:", response.error);
      return null;
    }
    
    return response.data;
  },
};

