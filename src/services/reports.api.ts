import { apiClient } from "./api.client";

// Report Summary DTO
export interface ReportSummary {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalDiscount: number;
  totalTax: number;
  mostPopularProduct?: {
    productId: number;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  } | null;
}

// Time Series Data Point
export interface TimeSeriesPoint {
  date: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export interface TimeSeriesResponse {
  granularity: "day" | "week" | "month";
  data: TimeSeriesPoint[];
}

// Report Metadata
export interface ReportMeta {
  cashiers: Array<{
    id: number;
    name: string;
  }>;
  statuses: string[];
  earliestOrderDate: string | null;
  latestOrderDate: string | null;
}

export const reportsApi = {
  /**
   * Get sales summary/KPIs
   * GET /api/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Defaults to last 30 days if not provided
   */
  async getSummary(params?: {
    from?: string;
    to?: string;
  }): Promise<{ data?: ReportSummary; error?: string }> {
    const queryParams = new URLSearchParams();
    if (params?.from) queryParams.append('from', params.from);
    if (params?.to) queryParams.append('to', params.to);

    const endpoint = `/api/reports/summary${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get<ReportSummary>(endpoint);

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * Get time series data for charts
   * GET /api/reports/series?from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  async getSeries(params?: {
    from?: string;
    to?: string;
  }): Promise<{ data?: TimeSeriesResponse; error?: string }> {
    const queryParams = new URLSearchParams();
    if (params?.from) queryParams.append('from', params.from);
    if (params?.to) queryParams.append('to', params.to);

    const endpoint = `/api/reports/series${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get<TimeSeriesResponse>(endpoint);

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * Get filter metadata
   * GET /api/reports/meta
   * Returns list of cashiers, available statuses, earliest/latest order dates
   */
  async getMeta(): Promise<{ data?: ReportMeta; error?: string }> {
    const response = await apiClient.get<ReportMeta>('/api/reports/meta');

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * Export report as CSV
   * GET /api/reports/export?from=...&to=...&cashierName=...&status=...&limit=...&offset=...
   * Downloads as order-report.csv
   */
  async exportReport(params: {
    from?: string;
    to?: string;
    cashierName?: string;
    cashierId?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ url?: string; error?: string }> {
    const queryParams = new URLSearchParams();
    if (params.from) queryParams.append('from', params.from);
    if (params.to) queryParams.append('to', params.to);
    if (params.cashierName) queryParams.append('cashierName', params.cashierName);
    if (params.cashierId) queryParams.append('cashierId', String(params.cashierId));
    if (params.status) queryParams.append('status', params.status);
    if (params.limit) queryParams.append('limit', String(params.limit));
    if (params.offset) queryParams.append('offset', String(params.offset));

    const endpoint = `/api/reports/export?${queryParams.toString()}`;
    
    try {
      const API_BASE_URL = import.meta.env.VITE_POS_BASE_URL || "http://localhost:8081";
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token && token.split('.').length === 3) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { error: errorText || `HTTP ${response.status}` };
      }

      // Get the blob and create a download URL
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      return { url };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to export report' };
    }
  },
};
