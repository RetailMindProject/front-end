import { apiClient } from "./api.client";
import type {
  ProductHistoryAndForecast,
  ProductStockForecastSummary,
} from "../types/forecasting.dto";

export const forecastingApi = {
  /**
   * Get combined history + forecast for one product
   */
  async getHistoryAndForecast(
    productId: number,
    historyDays: number = 180,
    horizonDays: number = 60
  ): Promise<ProductHistoryAndForecast | null> {
    const response = await apiClient.get<ProductHistoryAndForecast>(
      `/api/forecasting/products/${productId}/history-and-forecast?historyDays=${historyDays}&horizonDays=${horizonDays}`
    );

    if (response.error || !response.data) {
      if (response.status === 204) {
        // No content - treat as no data
        return null;
      }
      console.error("Failed to fetch history and forecast:", response.error);
      return null;
    }

    return response.data;
  },

  /**
   * Get stored stock forecast summary for a single product
   */
  async getStockSummary(
    productId: number
  ): Promise<ProductStockForecastSummary | null> {
    const response = await apiClient.get<ProductStockForecastSummary>(
      `/api/forecasting/products/${productId}/stock-summary`
    );

    if (response.error || !response.data) {
      if (response.status === 204) {
        // No content - treat as no data
        return null;
      }
      console.error("Failed to fetch stock summary:", response.error);
      return null;
    }

    return response.data;
  },

  /**
   * Run forecast for a single product
   */
  async runForecast(
    productId: number,
    horizonDays: number = 60,
    fromDate?: string,
    toDate?: string
  ): Promise<boolean> {
    let url = `/api/forecasting/products/${productId}/run?horizonDays=${horizonDays}`;
    if (fromDate) {
      url += `&fromDate=${fromDate}`;
    }
    if (toDate) {
      url += `&toDate=${toDate}`;
    }

    const response = await apiClient.post<unknown>(url);

    if (response.error) {
      console.error("Failed to run forecast:", response.error);
      return false;
    }

    return true;
  },

  /**
   * Rebuild stock forecast summary for a single product
   */
  async rebuildStockSummary(
    productId: number,
    horizonDays: number = 60
  ): Promise<boolean> {
    const response = await apiClient.post<unknown>(
      `/api/forecasting/products/${productId}/stock-summary/rebuild?horizonDays=${horizonDays}`
    );

    if (response.error) {
      console.error("Failed to rebuild stock summary:", response.error);
      return false;
    }

    return true;
  },

  /**
   * Run batch forecast for all eligible products
   */
  async runBatchForecast(
    horizonDays: number = 30,
    fromDate?: string,
    toDate?: string,
    minPoints: number = 5
  ): Promise<boolean> {
    let url = `/api/forecasting/products/run-batch?horizonDays=${horizonDays}&minPoints=${minPoints}`;
    if (fromDate) {
      url += `&fromDate=${fromDate}`;
    }
    if (toDate) {
      url += `&toDate=${toDate}`;
    }

    const response = await apiClient.post<unknown>(url);

    if (response.error) {
      console.error("Failed to run batch forecast:", response.error);
      return false;
    }

    return true;
  },
};

