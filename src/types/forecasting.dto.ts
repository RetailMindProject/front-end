// Forecasting DTOs for frontend

export interface SalesHistoryPoint {
  ds: string; // yyyy-MM-dd
  y: number;
}

export interface ForecastPoint {
  ds: string; // yyyy-MM-dd
  yhat: number;
  yhat_lower?: number | null;
  yhat_upper?: number | null;
}

export interface ProductHistoryAndForecast {
  productId: number;
  history: SalesHistoryPoint[];
  forecast: ForecastPoint[];
}

export interface ProductStockForecastSummary {
  productId: number;
  currentStock: number;
  avgDailyDemand: number;
  expectedStockoutDate: string | null; // yyyy-MM-dd
  recommendedReorderQty: number;
}


