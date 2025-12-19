import React, { useState, useEffect } from "react";
import { Search, Play, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { productsApi, type Product, type ProductFilterParams } from "../services/products.api";
import { forecastingApi } from "../services/forecasting.api";
import type { ProductStockForecastSummary } from "../types/forecasting.dto";
import ProductForecastPanel from "../components/Operations/ProductForecastPanel";
import { Card } from "../components/Card";

export default function ProductForecastOverviewPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [stockSummary, setStockSummary] = useState<ProductStockForecastSummary | null>(null);
  
  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState("");
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

  // Fetch products
  const fetchProducts = async () => {
    setLoadingProducts(true);
    setError(null);

    try {
      const params: ProductFilterParams = {
        page,
        size: pageSize,
        search: searchTerm || undefined,
        brand: brandFilter || undefined,
        active: activeFilter,
      };

      const response = await productsApi.getProducts(params);

      if (response) {
        setProducts(response.content);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
      } else {
        setError("Failed to load products");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  };

  // Fetch stock summary for selected product
  const fetchStockSummary = async (productId: number) => {
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
  };

  // Handle product selection
  const handleProductSelect = (productId: number) => {
    setSelectedProductId(productId);
    fetchStockSummary(productId);
  };

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
        
        // Refresh stock summary if a product is selected
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

  // Fetch products on mount and when filters change
  useEffect(() => {
    fetchProducts();
  }, [page, searchTerm, brandFilter, activeFilter]);

  // Reset to first page when search term changes
  useEffect(() => {
    setPage(0);
  }, [searchTerm, brandFilter, activeFilter]);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Forecasting Overview / نظرة عامة على التنبؤ
            </h1>
            <p className="text-slate-600 mt-1">
              View and manage product forecasts and stock predictions
            </p>
          </div>
          <button
            onClick={handleBatchForecast}
            disabled={runningBatchForecast}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {runningBatchForecast ? "Running Batch Forecast..." : "Run Batch Forecast"}
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Left Column - Product List */}
        <div className="flex flex-col min-h-0">
          <Card padded>
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by SKU or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Brand filter..."
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={activeFilter === undefined ? "" : activeFilter ? "true" : "false"}
                    onChange={(e) => {
                      const value = e.target.value;
                      setActiveFilter(
                        value === "" ? undefined : value === "true"
                      );
                    }}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Products Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-700">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-slate-700">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-slate-700">
                          Brand
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-slate-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {loadingProducts ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                            Loading products...
                          </td>
                        </tr>
                      ) : products.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                            No products found
                          </td>
                        </tr>
                      ) : (
                        products.map((product) => (
                          <tr
                            key={product.id}
                            onClick={() => handleProductSelect(product.id)}
                            className={`cursor-pointer hover:bg-blue-50 transition-colors ${
                              selectedProductId === product.id
                                ? "bg-blue-100 border-l-4 border-l-blue-600"
                                : ""
                            }`}
                          >
                            <td className="px-4 py-3 text-slate-800">
                              {product.sku || "—"}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {product.name}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {product.brand || "—"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                  product.active !== false
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {product.active !== false ? "Active" : "Inactive"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Showing {page * pageSize + 1} to{" "}
                    {Math.min((page + 1) * pageSize, totalElements)} of{" "}
                    {totalElements} products
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0 || loadingProducts}
                      className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-slate-600">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1 || loadingProducts}
                      className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Product Detail + Forecast */}
        <div className="flex flex-col min-h-0">
          {selectedProductId ? (
            <div className="space-y-6 flex-1 overflow-y-auto">
              {/* Stock Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <div className="p-4">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                      Current Stock
                    </div>
                    {loadingStockSummary ? (
                      <div className="text-slate-400">Loading...</div>
                    ) : (
                      <div className="text-2xl font-semibold text-slate-800">
                        {stockSummary?.currentStock?.toFixed(2) ?? "—"}
                      </div>
                    )}
                  </div>
                </Card>

                <Card>
                  <div className="p-4">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                      Avg Daily Demand
                    </div>
                    {loadingStockSummary ? (
                      <div className="text-slate-400">Loading...</div>
                    ) : (
                      <div className="text-2xl font-semibold text-slate-800">
                        {stockSummary?.avgDailyDemand?.toFixed(2) ?? "—"}
                      </div>
                    )}
                  </div>
                </Card>

                <Card>
                  <div className="p-4">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                      Expected Stockout
                    </div>
                    {loadingStockSummary ? (
                      <div className="text-slate-400">Loading...</div>
                    ) : (
                      <div className="text-lg font-semibold text-slate-800">
                        {stockSummary?.expectedStockoutDate
                          ? formatDate(stockSummary.expectedStockoutDate)
                          : "No expected stockout"}
                      </div>
                    )}
                  </div>
                </Card>

                <Card>
                  <div className="p-4">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                      Recommended Reorder
                    </div>
                    {loadingStockSummary ? (
                      <div className="text-slate-400">Loading...</div>
                    ) : (
                      <div className="text-2xl font-semibold text-slate-800">
                        {stockSummary?.recommendedReorderQty?.toFixed(2) ?? "0.00"}
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Product Forecast Panel */}
              <Card padded>
                <ProductForecastPanel productId={selectedProductId} />
              </Card>
            </div>
          ) : (
            <Card padded>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
                <p className="text-slate-600 mb-2">No product selected</p>
                <p className="text-sm text-slate-500">
                  Select a product from the list to view its forecast details
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}


