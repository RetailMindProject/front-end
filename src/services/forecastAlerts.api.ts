import { apiClient } from "./api.client";

export type ForecastUrgency = "critical" | "high" | "medium" | "low" | "unknown";

export interface ForecastAlert {
  id: string;
  productId: number;
  productName: string;
  urgency: ForecastUrgency;
  createdAt: string;
}

export const forecastAlertsApi = {
  /**
   * Get active forecast alerts for products that are critical / at risk.
   * The backend should return only relevant alerts (e.g. last 24 hours).
   */
  async getActiveAlerts(): Promise<ForecastAlert[]> {
    const response = await apiClient.get<ForecastAlert[]>("/api/forecasting/alerts");

    if (response.error || !response.data) {
      // Treat missing/empty data as "no alerts" but log real errors for debugging
      if (response.status && response.status !== 204) {
        console.error("Failed to load forecast alerts:", response.error);
      }
      return [];
    }

    return response.data;
  },
};

