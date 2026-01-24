import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Search, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  X,
  Loader2,
  Package,
  TrendingUp,
  Calendar,
  ShoppingCart,
  Sparkles,
  BarChart3,
  Zap
} from "lucide-react";
import { productsApi, type ProductDTO } from "../services/products.api";
import { forecastingApi } from "../services/forecasting.api";
import type { ProductStockForecastSummary } from "../types/forecasting.dto";
import ProductForecastPanel from "../components/Operations/ProductForecastPanel";
import PageHeader from "../components/PageHeader";

// Premium KPI Card Component with Glassmorphism
interface KPICardProps {
  label: string;
  value: string | number;
  loading?: boolean;
  highlight?: boolean;
  format?: "number" | "date" | "text";
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}

function KPICard({ label, value, loading, highlight, format = "text", icon, trend }: KPICardProps) {
  const formattedValue = useMemo(() => {
    if (loading) return null;
    if (value === null || value === undefined || value === "—") return "—";
    
    switch (format) {
      case "number":
        return typeof value === "number" 
          ? value.toLocaleString("en-US", { maximumFractionDigits: 0 })
          : value;
      case "date":
        if (typeof value === "string") {
          const date = new Date(value);
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        }
        return value;
      default:
        return value;
    }
  }, [value, loading, format]);

  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : null;
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "";

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-slate-50/50 backdrop-blur-xl border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Animated gradient border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/0 via-indigo-500/20 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                {icon}
              </div>
            )}
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {label}
            </div>
          </div>
          {trendIcon && (
            <span className={`text-lg font-bold ${trendColor}`}>{trendIcon}</span>
          )}
        </div>
        
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : (
          <div
            className={`text-4xl font-extrabold tracking-tight bg-gradient-to-r ${
              highlight
                ? "from-amber-600 to-orange-600"
                : "from-slate-900 via-slate-800 to-slate-900"
            } bg-clip-text text-transparent`}
          >
            {formattedValue}
          </div>
        )}
      </div>
    </div>
  );
}

// Premium Status Badge Component
interface StatusBadgeProps {
  isActive: boolean;
}

function StatusBadge({ isActive }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 ${
        isActive
          ? "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border border-emerald-200/50"
          : "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 border border-slate-300/50"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
        isActive ? "bg-emerald-500" : "bg-slate-400"
      }`} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

// Premium Action Button Component
interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary";
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function ActionButton({
  onClick,
  disabled,
  loading,
  variant = "primary",
  icon,
  children,
}: ActionButtonProps) {
  if (variant === "primary") {
    return (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className="group relative px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 shadow-lg hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 overflow-hidden"
      >
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/50 to-indigo-500/50 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
        
        {/* Content */}
        <span className="relative flex items-center gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            icon
          )}
          {children}
        </span>
        
        {/* Shine effect */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-white/80 backdrop-blur-sm border border-slate-300/50 hover:bg-white hover:border-slate-400 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

export default function ProductForecastOverviewPage() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [stockSummary, setStockSummary] = useState<ProductStockForecastSummary | null>(null);
  
  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  
  // Loading and error states
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingStockSummary, setLoadingStockSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runningBatchForecast, setRunningBatchForecast] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch products with proper search and filtering
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    setError(null);

    try {
      const params: {
        page: number;
        size: number;
        sku?: string;
        brand?: string;
        isActive?: boolean;
      } = {
        page,
        size: pageSize,
      };

      if (debouncedSearchTerm) {
        params.sku = debouncedSearchTerm;
      }
      if (brandFilter) {
        params.brand = brandFilter;
      }
      if (activeFilter !== undefined) {
        params.isActive = activeFilter;
      }

      const response = await productsApi.filter(params);

      if (response.data) {
        let filteredContent = response.data.content;
        
        if (debouncedSearchTerm) {
          const searchLower = debouncedSearchTerm.toLowerCase();
          filteredContent = response.data.content.filter(
            (p) =>
              p.name?.toLowerCase().includes(searchLower) ||
              p.sku?.toLowerCase().includes(searchLower) ||
              p.brand?.toLowerCase().includes(searchLower)
          );
        }

        setProducts(filteredContent);
        setTotalPages(response.data.totalPages);
        setTotalElements(filteredContent.length);
      } else {
        setError("Failed to load products");
        setProducts([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [page, pageSize, debouncedSearchTerm, brandFilter, activeFilter]);

  // Fetch stock summary for selected product
  const fetchStockSummary = useCallback(async (productId: number) => {
    setLoadingStockSummary(true);
    try {
      const summary = await forecastingApi.getStockSummary(productId);
      setStockSummary(summary);
    } catch (err) {
      console.error("Failed to fetch stock summary:", err);
      setStockSummary(null);
    } finally {
      setLoadingStockSummary(false);
    }
  }, []);

  // Handle product selection
  const handleProductSelect = useCallback((productId: number) => {
    setSelectedProductId(productId);
    fetchStockSummary(productId);
  }, [fetchStockSummary]);

  // Handle batch forecast
  const handleBatchForecast = async () => {
    setRunningBatchForecast(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const success = await forecastingApi.runBatchForecast(30, undefined, undefined, 5);

      if (success) {
        setSuccessMessage("Batch forecast completed successfully!");
        setTimeout(() => setSuccessMessage(null), 5000);
        
        if (selectedProductId) {
          fetchStockSummary(selectedProductId);
        }
      } else {
        setError("Failed to run batch forecast. Please try again.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to run batch forecast. Please try again."
      );
    } finally {
      setRunningBatchForecast(false);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setBrandFilter("");
    setActiveFilter(undefined);
    setPage(0);
  };

  const hasActiveFilters = searchTerm || brandFilter || activeFilter !== undefined;

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearchTerm, brandFilter, activeFilter]);

  // Fetch products on mount and when filters change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "—";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  return (
    <div className="flex flex-col min-h-full w-full bg-gradient-to-br from-slate-50 via-indigo-50/30 to-indigo-50/20 relative">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,_rgb(99_102_241)_1px,_transparent_0)] bg-[length:40px_40px] animate-pulse" />
      </div>

      <PageHeader
        title="Forecasting Overview"
        icon={<BarChart3 className="h-6 w-6 text-white" />}
        right={
          <ActionButton
            onClick={handleBatchForecast}
            loading={runningBatchForecast}
            variant="primary"
            icon={<Zap className="h-4 w-4" />}
          >
            {runningBatchForecast ? "Running Forecast..." : "Run Batch Forecast"}
          </ActionButton>
        }
        className="mb-0"
      />

      {/* Messages Section */}
      <div className="relative z-[5] px-6 sm:px-8 pt-4 flex-shrink-0">
        {successMessage && (
          <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/50 rounded-xl text-sm text-emerald-800 flex items-start gap-3 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
            <div className="p-1.5 rounded-lg bg-emerald-100">
              <AlertCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold">Success</p>
              <p>{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/50 rounded-xl text-sm text-red-800 flex items-start gap-3 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
            <div className="p-1.5 rounded-lg bg-red-100">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-[5] flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 sm:px-8 pb-8 min-h-0 overflow-auto">
        {/* Left Column - Product List */}
        <div className="flex flex-col min-h-0">
          <div className="flex-1 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 space-y-5 flex-1 flex flex-col min-h-0">
              {/* Search and Filters Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Package className="h-5 w-5 text-indigo-600" />
                    Products
                  </h2>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all duration-200 font-medium"
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear filters
                    </button>
                  )}
                </div>

                {/* Search Input with Glassmorphism */}
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search by SKU, name, or brand..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-slate-300/50 rounded-xl text-sm text-slate-900 placeholder-slate-400 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </div>

                {/* Filter Row */}
                <div className="flex gap-3">
                  <div className="relative flex-1 group">
                    <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none group-focus-within:text-indigo-600 transition-colors" />
                    <input
                      type="text"
                      placeholder="Filter by brand..."
                      value={brandFilter}
                      onChange={(e) => setBrandFilter(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-slate-300/50 rounded-xl text-sm text-slate-900 placeholder-slate-400 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 shadow-sm hover:shadow-md"
                    />
                  </div>
                  <select
                    value={activeFilter === undefined ? "" : activeFilter ? "true" : "false"}
                    onChange={(e) => {
                      const value = e.target.value;
                      setActiveFilter(value === "" ? undefined : value === "true");
                    }}
                    className="px-4 py-3 border border-slate-300/50 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-md min-w-[160px] font-medium"
                  >
                    <option value="">All Status</option>
                    <option value="true">Active Only</option>
                    <option value="false">Inactive Only</option>
                  </select>
                </div>
              </div>

              {/* Products Table */}
              <div className="flex-1 border border-slate-200/50 rounded-xl overflow-hidden bg-white/40 backdrop-blur-sm shadow-inner min-h-0 flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 sticky top-0 border-b border-slate-200/50 backdrop-blur-sm z-10">
                      <tr>
                        <th className="px-5 py-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wider">
                          SKU
                        </th>
                        <th className="px-5 py-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wider">
                          Product Name
                        </th>
                        <th className="px-5 py-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wider">
                          Brand
                        </th>
                        <th className="px-5 py-4 text-center font-bold text-slate-700 uppercase text-xs tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50 bg-white/30">
                      {loadingProducts ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-20 text-center">
                            <div className="flex flex-col items-center gap-4 text-slate-500">
                              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                              <span className="text-sm font-medium">Loading products...</span>
                            </div>
                          </td>
                        </tr>
                      ) : products.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-20 text-center">
                            <div className="flex flex-col items-center gap-4 text-slate-500">
                              <div className="p-4 rounded-full bg-slate-100">
                                <AlertCircle className="h-10 w-10 text-slate-400" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-700">No products found</p>
                                <p className="text-xs text-slate-500 mt-1.5">
                                  {hasActiveFilters
                                    ? "Try adjusting your filters"
                                    : "No products available"}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        products.map((product, index) => {
                          const productId = typeof product.id === "string" 
                            ? parseInt(product.id) 
                            : product.id;
                          const isSelected = selectedProductId === productId;
                          
                          return (
                            <tr
                              key={product.id}
                              onClick={() => handleProductSelect(productId)}
                              className={`cursor-pointer transition-all duration-200 ${
                                isSelected
                                  ? "bg-gradient-to-r from-indigo-50/80 to-indigo-50/80 border-l-4 border-l-indigo-600 shadow-md"
                                  : index % 2 === 0
                                  ? "bg-white/20 hover:bg-indigo-50/40"
                                  : "bg-white/10 hover:bg-indigo-50/40"
                              }`}
                            >
                              <td className="px-5 py-4">
                                <span className="text-xs font-mono text-slate-500 font-medium">
                                  {product.sku || "—"}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="font-semibold text-slate-900">
                                  {product.name}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-slate-600 font-medium">
                                  {product.brand || "—"}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-center">
                                <StatusBadge isActive={product.isActive !== false} />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-5 border-t border-slate-200/50">
                  <div className="text-sm text-slate-600 font-medium">
                    Showing{" "}
                    <span className="font-bold text-slate-900">
                      {page * pageSize + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-bold text-slate-900">
                      {Math.min((page + 1) * pageSize, totalElements)}
                    </span>{" "}
                    of{" "}
                    <span className="font-bold text-slate-900">
                      {totalElements}
                    </span>{" "}
                    products
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0 || loadingProducts}
                      className="p-2.5 border border-slate-300/50 rounded-xl hover:bg-white hover:border-indigo-500 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 bg-white/60 backdrop-blur-sm"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-slate-700 font-bold min-w-[110px] text-center px-4 py-2.5 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1 || loadingProducts}
                      className="p-2.5 border border-slate-300/50 rounded-xl hover:bg-white hover:border-indigo-500 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 bg-white/60 backdrop-blur-sm"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Forecast Details */}
        <div className="flex flex-col min-h-0">
          {selectedProductId ? (
            <div className="space-y-6 flex-1 overflow-y-auto pb-2 custom-scrollbar">
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 gap-4">
                <KPICard
                  label="Current Stock"
                  value={stockSummary?.currentStock ?? "—"}
                  loading={loadingStockSummary}
                  format="number"
                  icon={<Package className="h-5 w-5" />}
                />
                <KPICard
                  label="Avg Daily Demand"
                  value={stockSummary?.avgDailyDemand?.toFixed(2) ?? "—"}
                  loading={loadingStockSummary}
                  format="number"
                  icon={<TrendingUp className="h-5 w-5" />}
                />
                <KPICard
                  label="Expected Stockout"
                  value={
                    stockSummary?.expectedStockoutDate
                      ? formatDate(stockSummary.expectedStockoutDate)
                      : "No stockout"
                  }
                  loading={loadingStockSummary}
                  highlight={!!stockSummary?.expectedStockoutDate}
                  format="date"
                  icon={<Calendar className="h-5 w-5" />}
                />
                <KPICard
                  label="Recommended Reorder"
                  value={stockSummary?.recommendedReorderQty ?? 0}
                  loading={loadingStockSummary}
                  format="number"
                  icon={<ShoppingCart className="h-5 w-5" />}
                />
              </div>

              {/* Forecast Chart Panel */}
              <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl overflow-hidden">
                <div className="p-6">
                  <ProductForecastPanel productId={selectedProductId} />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-full blur-2xl opacity-20 animate-pulse" />
                    <div className="relative p-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-4 border-white shadow-xl">
                      <Sparkles className="h-12 w-12 text-slate-400" />
                    </div>
                  </div>
                  <p className="text-slate-700 font-bold text-lg mb-2">No product selected</p>
                  <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                    Select a product from the list to view detailed forecast analysis and stock predictions
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(241, 245, 249, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #6366f1, #8b5cf6);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #4f46e5, #7c3aed);
        }
      `}</style>
    </div>
  );
}
