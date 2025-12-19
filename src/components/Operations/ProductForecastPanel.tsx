import React, { useState, useEffect } from "react";
import { RefreshCw, Play, AlertCircle } from "lucide-react";
import { forecastingApi } from "../../services/forecasting.api";
import type {
  ProductHistoryAndForecast,
  ProductStockForecastSummary,
} from "../../types/forecasting.dto";
import ForecastChart from "../charts/ForecastChart";
import { Card } from "../Card";

interface ProductForecastPanelProps {
  productId: number | string;
}

export default function ProductForecastPanel({
  productId,
}: ProductForecastPanelProps) {
  const [historyDays, setHistoryDays] = useState(180);
  const [horizonDays, setHorizonDays] = useState(60);
  const [historyAndForecast, setHistoryAndForecast] =
    useState<ProductHistoryAndForecast | null>(null);
  const [stockSummary, setStockSummary] =
    useState<ProductStockForecastSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningForecast, setRunningForecast] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = async () => {
    // Validate productId
    const numericId = Number(productId);
    if (!productId || isNaN(numericId) || numericId <= 0) {
      setError("Invalid product ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const [historyForecastData, stockSummaryData] = await Promise.all([
        forecastingApi.getHistoryAndForecast(
          numericId,
          historyDays,
          horizonDays
        ),
        forecastingApi.getStockSummary(numericId),
      ]);

      setHistoryAndForecast(historyForecastData);
      setStockSummary(stockSummaryData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load forecast data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Validate productId before fetching
    const numericId = Number(productId);
    if (productId && !isNaN(numericId) && numericId > 0) {
      fetchData();
    } else {
      setError("Invalid product ID");
      setLoading(false);
    }
  }, [productId, historyDays, horizonDays]);

  const handleRunForecast = async () => {
    // Validate productId
    const numericId = Number(productId);
    if (!productId || isNaN(numericId) || numericId <= 0) {
      setError("Invalid product ID");
      return;
    }

    setRunningForecast(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Step 1: Run forecast
      const forecastSuccess = await forecastingApi.runForecast(
        numericId,
        horizonDays
      );

      if (!forecastSuccess) {
        throw new Error("Failed to run forecast");
      }

      // Step 2: Rebuild stock summary
      const rebuildSuccess = await forecastingApi.rebuildStockSummary(
        numericId,
        horizonDays
      );

      if (!rebuildSuccess) {
        throw new Error("Failed to rebuild stock summary");
      }

      // Step 3: Refresh data
      await fetchData();

      setSuccessMessage("Forecast completed successfully!");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to run forecast. Please try again."
      );
    } finally {
      setRunningForecast(false);
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const hasData =
    historyAndForecast &&
    (historyAndForecast.history.length > 0 ||
      historyAndForecast.forecast.length > 0);

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            Sales Forecast / التنبؤ بالمبيعات
          </h3>
          <p className="text-sm text-slate-600">
            Historical sales data and future demand forecast
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* History Days Select */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">History:</label>
            <select
              value={historyDays}
              onChange={(e) => setHistoryDays(Number(e.target.value))}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || runningForecast}
            >
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>365 days</option>
            </select>
          </div>

          {/* Horizon Days Select */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Forecast:</label>
            <select
              value={horizonDays}
              onChange={(e) => setHorizonDays(Number(e.target.value))}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || runningForecast}
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={loading || runningForecast}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>

          {/* Run Forecast Button */}
          <button
            onClick={handleRunForecast}
            disabled={loading || runningForecast}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {runningForecast ? "Running..." : "Run Forecast Now"}
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error</p>
            <p>{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading forecast data...</div>
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {/* Chart Section */}
          {hasData ? (
            <Card padded>
              <ForecastChart
                history={historyAndForecast!.history}
                forecast={historyAndForecast!.forecast}
                expectedStockoutDate={stockSummary?.expectedStockoutDate}
              />
            </Card>
          ) : (
            <Card padded>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
                <p className="text-slate-600 mb-2">
                  No historical data or forecast available for this product
                </p>
                <p className="text-sm text-slate-500">
                  Click "Run Forecast Now" to generate a forecast
                </p>
              </div>
            </Card>
          )}

          {/* Stock Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Current Stock */}
            <Card>
              <div className="p-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Current Stock
                </div>
                <div className="text-2xl font-semibold text-slate-800">
                  {stockSummary?.currentStock?.toFixed(2) ?? "—"}
                </div>
              </div>
            </Card>

            {/* Average Daily Demand */}
            <Card>
              <div className="p-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Avg Daily Demand
                </div>
                <div className="text-2xl font-semibold text-slate-800">
                  {stockSummary?.avgDailyDemand?.toFixed(2) ?? "—"}
                </div>
              </div>
            </Card>

            {/* Expected Stockout Date */}
            <Card>
              <div className="p-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Expected Stockout
                </div>
                <div className="text-lg font-semibold text-slate-800">
                  {stockSummary?.expectedStockoutDate
                    ? formatDate(stockSummary.expectedStockoutDate)
                    : "No expected stockout"}
                </div>
              </div>
            </Card>

            {/* Recommended Reorder Quantity */}
            <Card>
              <div className="p-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Recommended Reorder
                </div>
                <div className="text-2xl font-semibold text-slate-800">
                  {stockSummary?.recommendedReorderQty?.toFixed(2) ?? "0.00"}
                </div>
              </div>
            </Card>
          </div>

          {/* No Stock Summary Message */}
          {!stockSummary && !loading && (
            <Card padded>
              <div className="text-center py-4 text-sm text-slate-600">
                No stock forecast summary available. Click "Run Forecast Now" to
                generate a summary.
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}


