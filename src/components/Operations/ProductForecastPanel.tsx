import { useState, useEffect } from "react";
import { RefreshCw, Play, AlertCircle, Loader2, BarChart3 } from "lucide-react";
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-4 border-b border-slate-200/50">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg">
              <BarChart3 className="h-5 w-5" />
            </div>
            Sales Forecast
          </h3>
          <p className="text-sm text-slate-600 font-medium">
            Historical sales data and future demand forecast
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* History Days Select */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">History:</label>
            <select
              value={historyDays}
              onChange={(e) => setHistoryDays(Number(e.target.value))}
              className="px-3 py-2 border border-slate-300/50 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-md"
              disabled={loading || runningForecast}
            >
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>365 days</option>
            </select>
          </div>

          {/* Horizon Days Select */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Forecast:</label>
            <select
              value={horizonDays}
              onChange={(e) => setHorizonDays(Number(e.target.value))}
              className="px-3 py-2 border border-slate-300/50 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-md"
              disabled={loading || runningForecast}
            >
              <option value={5}>5 days</option>
              <option value={10}>10 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={360}>360 days</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={loading || runningForecast}
            className="px-4 py-2 bg-white/80 backdrop-blur-sm hover:bg-white text-slate-700 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-slate-300/50 hover:border-slate-400 hover:shadow-md"
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
            className="group relative px-5 py-2 bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-700 hover:via-indigo-700 hover:to-indigo-800 text-white rounded-lg text-sm font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/50 to-indigo-500/50 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
            <span className="relative flex items-center gap-2">
              {runningForecast ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {runningForecast ? "Running..." : "Run Forecast Now"}
            </span>
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/50 rounded-xl text-sm text-emerald-800 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100">
              <AlertCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="font-bold">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/50 rounded-xl text-sm text-red-800 flex items-start gap-3 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
          <div className="p-1.5 rounded-lg bg-red-100">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold mb-1">Error</p>
            <p className="mb-3">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
          <div className="text-slate-600 font-medium">Loading forecast data...</div>
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {/* Chart Section */}
          {hasData ? (
            <div className="rounded-xl overflow-hidden">
              <ForecastChart
                history={historyAndForecast!.history}
                forecast={historyAndForecast!.forecast}
                expectedStockoutDate={stockSummary?.expectedStockoutDate}
              />
            </div>
          ) : (
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/50 p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-full blur-2xl opacity-20 animate-pulse" />
                  <div className="relative p-5 rounded-full bg-slate-100 border-4 border-white shadow-xl">
                    <AlertCircle className="h-10 w-10 text-slate-400" />
                  </div>
                </div>
                <p className="text-slate-700 font-bold mb-2">
                  No historical data or forecast available
                </p>
                <p className="text-sm text-slate-500 max-w-md">
                  Click "Run Forecast Now" to generate a forecast for this product
                </p>
              </div>
            </div>
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


