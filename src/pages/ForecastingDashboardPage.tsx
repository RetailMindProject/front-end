import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Filter,
  Loader2,
  Package,
  Search,
  TrendingUp,
} from "lucide-react";
import { productsApi, type ProductDTO } from "../services/products.api";
import { forecastingApi } from "../services/forecasting.api";
import type { ProductStockForecastSummary } from "../types/forecasting.dto";

type Urgency = "critical" | "high" | "medium" | "low" | "unknown";

function getUrgency(summary: ProductStockForecastSummary | null | undefined): Urgency {
  if (!summary) return "unknown";
  if (summary.currentStock <= 0) return "critical";
  if (!summary.expectedStockoutDate) {
    return summary.recommendedReorderQty > 0 ? "medium" : "low";
  }

  const stockout = new Date(summary.expectedStockoutDate);
  const now = new Date();
  const diffDays = Math.ceil((stockout.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 3) return "critical";
  if (diffDays <= 7) return "high";
  if (diffDays <= 14) return "medium";
  return "low";
}

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const cfg = (() => {
    switch (urgency) {
      case "critical":
        return { label: "Critical", cls: "bg-red-100 text-red-800 border-red-200" };
      case "high":
        return { label: "High", cls: "bg-orange-100 text-orange-800 border-orange-200" };
      case "medium":
        return { label: "Medium", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" };
      case "low":
        return { label: "Low", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" };
      default:
        return { label: "—", cls: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  })();

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function StockStatus({ urgency }: { urgency: Urgency }) {
  const cfg = (() => {
    switch (urgency) {
      case "critical":
        return { label: "At risk", dot: "bg-red-500", text: "text-red-700" };
      case "high":
        return { label: "Low", dot: "bg-orange-500", text: "text-orange-700" };
      case "medium":
        return { label: "Watch", dot: "bg-yellow-500", text: "text-yellow-800" };
      case "low":
        return { label: "OK", dot: "bg-emerald-500", text: "text-emerald-700" };
      default:
        return { label: "No data", dot: "bg-slate-400", text: "text-slate-600" };
    }
  })();

  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold ${cfg.text}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function ForecastingDashboardPage() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);

  // stock summaries keyed by productId
  const [summaries, setSummaries] = useState<Record<number, ProductStockForecastSummary | null>>({});
  const [summariesRefreshKey, setSummariesRefreshKey] = useState(0);
  const [batchHorizonDays, setBatchHorizonDays] = useState<number>(30);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    setError(null);
    try {
      const response = await productsApi.filter({
        page: 0,
        size: 50,
        brand: brandFilter || undefined,
        isActive: activeFilter,
        sku: debouncedSearchTerm || undefined,
      });

      if (!response.data) {
        setProducts([]);
        setError(response.error || "Failed to load products");
        return;
      }

      // productsApi.filter() is SKU-based; we also apply a client-side name/brand search
      let content = response.data.content;
      if (debouncedSearchTerm) {
        const q = debouncedSearchTerm.toLowerCase();
        content = content.filter(
          (p) =>
            p.name?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            p.brand?.toLowerCase().includes(q)
        );
      }

      setProducts(content);
    } catch (e) {
      setProducts([]);
      setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  }, [activeFilter, brandFilter, debouncedSearchTerm]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fetch summaries for currently visible products (best-effort)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const ids = products
        .map((p) => (typeof p.id === "string" ? Number(p.id) : p.id))
        .filter((id): id is number => Number.isFinite(id) && id > 0);

      if (ids.length === 0) {
        setSummaries({});
        return;
      }

      setLoadingSummaries(true);
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            const summary = await forecastingApi.getStockSummary(id);
            return [id, summary] as const;
          })
        );

        if (cancelled) return;
        const map: Record<number, ProductStockForecastSummary | null> = {};
        results.forEach(([id, s]) => {
          map[id] = s;
        });
        setSummaries(map);
      } finally {
        if (!cancelled) setLoadingSummaries(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [products, summariesRefreshKey]);

  const productRows = useMemo(() => {
    return products.map((p) => {
      const id = typeof p.id === "string" ? Number(p.id) : p.id;
      const summary = Number.isFinite(id) ? summaries[id] : null;
      const urgency = getUrgency(summary);
      return { product: p, productId: id, summary, urgency };
    });
  }, [products, summaries]);

  const restockItems = useMemo(() => {
    const items = productRows
      .filter((r) => r.summary && (r.summary.recommendedReorderQty ?? 0) > 0)
      .map((r) => ({
        productId: r.productId,
        name: r.product.name,
        currentStock: r.summary!.currentStock,
        recommendedReorderQty: r.summary!.recommendedReorderQty,
        urgency: getUrgency(r.summary),
      }));

    const urgencyRank: Record<Urgency, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
      unknown: 0,
    };

    return items
      .sort((a, b) => urgencyRank[b.urgency] - urgencyRank[a.urgency])
      .slice(0, 12);
  }, [productRows]);

  const hasFilters = searchTerm || brandFilter || activeFilter !== undefined;

  const goToDetail = (productId: number) => {
    navigate(`products/${productId}`);
  };

  const handleRunBatchForecast = async () => {
    setBatchRunning(true);
    setBatchMessage(null);
    setBatchError(null);
    try {
      // Match existing behavior from previous overview page
      const ok = await forecastingApi.runBatchForecast(batchHorizonDays, undefined, undefined, 5);
      if (!ok) {
        setBatchError("Batch forecast failed. Please try again.");
        return;
      }
      setBatchMessage("Batch forecast completed successfully.");
      // Refresh summaries to reflect new stock-summary calculations
      setSummariesRefreshKey((k) => k + 1);
      // Keep products fresh in case backend changes eligibility/visibility
      fetchProducts();
      window.setTimeout(() => setBatchMessage(null), 5000);
    } catch (e) {
      setBatchError(e instanceof Error ? e.message : "Batch forecast failed. Please try again.");
    } finally {
      setBatchRunning(false);
    }
  };

  return (
    <div className="min-h-full w-full bg-gradient-to-br from-slate-50 via-indigo-50/30 to-indigo-50/20">
      <div className="px-6 sm:px-8 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Forecasting
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Browse products, review stock health, and open detailed forecasts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={batchHorizonDays}
              onChange={(e) => setBatchHorizonDays(Number(e.target.value))}
              disabled={batchRunning}
              className="px-3 py-2.5 border border-slate-300/50 rounded-xl bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-semibold text-slate-900 disabled:opacity-50"
              aria-label="Batch forecast horizon"
            >
              <option value={5}>5 days</option>
              <option value={10}>10 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={360}>360 days</option>
            </select>

            <button
              onClick={handleRunBatchForecast}
              disabled={batchRunning}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {batchRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" />
                  Run Batch Forecast
                </>
              )}
            </button>
          </div>
        </div>

        {batchMessage && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Success</p>
              <p>{batchMessage}</p>
            </div>
          </div>
        )}

        {batchError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Batch Forecast Failed</p>
              <p>{batchError}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Products List */}
          <div className="xl:col-span-2 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200/50">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-indigo-600" />
                  Products
                </h2>
                {hasFilters && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setBrandFilter("");
                      setActiveFilter(undefined);
                    }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name / SKU / brand..."
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-300/50 rounded-xl bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    placeholder="Brand filter..."
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-300/50 rounded-xl bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div className="mt-3">
                <select
                  value={activeFilter === undefined ? "" : activeFilter ? "true" : "false"}
                  onChange={(e) => {
                    const v = e.target.value;
                    setActiveFilter(v === "" ? undefined : v === "true");
                  }}
                  className="w-full md:w-auto px-4 py-2.5 border border-slate-300/50 rounded-xl bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-medium"
                >
                  <option value="">All Status</option>
                  <option value="true">Active Only</option>
                  <option value="false">Inactive Only</option>
                </select>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200/50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Forecast
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingProducts ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-600">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                          Loading products...
                        </div>
                      </td>
                    </tr>
                  ) : productRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-600">
                        <div className="inline-flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-slate-400" />
                          No products found
                        </div>
                      </td>
                    </tr>
                  ) : (
                    productRows.map((row) => (
                      <tr key={String(row.product.id)} className="hover:bg-indigo-50/30 transition">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{row.product.name}</div>
                          <div className="text-xs text-slate-500">
                            {row.product.brand || "—"} {row.product.sku ? `• ${row.product.sku}` : ""}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {loadingSummaries ? (
                            <span className="text-slate-500 text-xs inline-flex items-center gap-2">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Loading...
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-900">
                              {row.summary ? row.summary.currentStock.toFixed(2) : "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <StockStatus urgency={row.urgency} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          {Number.isFinite(row.productId) ? (
                            <button
                              onClick={() => goToDetail(row.productId)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
                            >
                              View Forecast
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Restock Recommendations */}
          <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-200/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                Restock Recommendations
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Prioritized products needing replenishment.
              </p>
            </div>

            <div className="p-4">
              {loadingProducts || loadingSummaries ? (
                <div className="py-10 text-center text-slate-600">
                  <div className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    Loading recommendations...
                  </div>
                </div>
              ) : restockItems.length === 0 ? (
                <div className="py-10 text-center text-slate-600">
                  <AlertCircle className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No restock needs detected</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Run forecasts or adjust filters to see recommendations.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {restockItems.map((item) => (
                    <button
                      key={item.productId}
                      onClick={() => goToDetail(item.productId)}
                      className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{item.name}</div>
                          <div className="text-xs text-slate-600 mt-1">
                            Stock: <span className="font-semibold">{item.currentStock.toFixed(2)}</span> •{" "}
                            Reorder:{" "}
                            <span className="font-semibold">{item.recommendedReorderQty.toFixed(2)}</span>
                          </div>
                        </div>
                        <UrgencyBadge urgency={item.urgency} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

