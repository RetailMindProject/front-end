import { useMemo, useState, useEffect } from "react";
import {
  Sidebar,
  Topbar,
  Card,
  CardTitle,
  CardValue,
  CardHint,
  SalesLineChart,
  CategoryPieChart,
  ProductsList,
  RecentDailyTable,
} from "../components";
import Sessions from "./Sessions";
import { LineChart as LineChartIcon, LayoutDashboard, Package, Upload, Percent, Send } from "lucide-react";
import UploadReport from "./UploadReport";
import StoreOperations from "./StoreOperations";
import StoreManagerOffersPage from "./StoreManagerOffersPage";
import MessageDetail from "./MessageDetail";
import Outbox from "./Outbox";
import Compose from "./Compose";
import { Routes, Route } from "react-router-dom";
import { dashboardApi, type DashboardSummary, type SalesTrendItem, type CategoryCount, type TopProduct, type RecentDaily } from "../services/dashboard.api";

// -------- Mock Data --------
const salesTrend = [
  { day: "Mon", revenue: 420, orders: 18 },
  { day: "Tue", revenue: 560, orders: 22 },
  { day: "Wed", revenue: 310, orders: 12 },
  { day: "Thu", revenue: 780, orders: 28 },
  { day: "Fri", revenue: 980, orders: 33 },
  { day: "Sat", revenue: 640, orders: 26 },
  { day: "Sun", revenue: 480, orders: 19 },
];

const categoryCounts = [
  { name: "Electronics", value: 48 },
  { name: "Groceries", value: 27 },
  { name: "Clothes", value: 15 },
  { name: "Accessories", value: 10 },
];

const topProducts = [
  { name: "iPhone 15 Pro", sku: "ELE-IPH15P", sold: 42, revenue: 47999 },
  { name: "Organic Olive Oil", sku: "GRC-OLV500", sold: 120, revenue: 3599 },
  { name: "Cotton Hoodie", sku: "CLT-HDY001", sold: 58, revenue: 2899 },
];

const recentDaily = [
  { date: "2025-10-21", amount: 1340, orders: 52 },
  { date: "2025-10-22", amount: 1520, orders: 57 },
  { date: "2025-10-23", amount: 980, orders: 41 },
  { date: "2025-10-24", amount: 2010, orders: 75 },
  { date: "2025-10-25", amount: 1760, orders: 64 },
];

const fmt = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function StoreManager() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [salesTrendData, setSalesTrendData] = useState<SalesTrendItem[] | null>(null);
  const [categoryCountsData, setCategoryCountsData] = useState<CategoryCount[] | null>(null);
  const [topProductsData, setTopProductsData] = useState<TopProduct[] | null>(null);
  const [recentDailyData, setRecentDailyData] = useState<RecentDaily[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryData, trendData, categoryData, productsData, dailyData] = await Promise.all([
          dashboardApi.fetchStoreSummary(),
          dashboardApi.fetchSalesTrend(),
          dashboardApi.fetchCategoryCounts(),
          dashboardApi.fetchTopProducts(),
          dashboardApi.fetchRecentDaily(),
        ]);
        
        if (summaryData) {
          setDashboardData(summaryData);
        } else {
          setError("Failed to load dashboard data");
        }
        
        if (trendData) {
          setSalesTrendData(trendData);
        }
        
        if (categoryData) {
          setCategoryCountsData(categoryData);
        }
        
        if (productsData) {
          setTopProductsData(productsData);
        }
        
        if (dailyData) {
          setRecentDailyData(dailyData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Use API data if available, otherwise fall back to mock data
  const totalSales = useMemo(() => {
    if (dashboardData) {
      return fmt.format(dashboardData.totalSales);
    }
    return fmt.format(recentDaily.reduce((a, b) => a + b.amount, 0));
  }, [dashboardData]);

  const totalOrders = useMemo(() => {
    if (dashboardData) {
      return dashboardData.totalOrders;
    }
    return recentDaily.reduce((a, b) => a + b.orders, 0);
  }, [dashboardData]);

  const recentDailyAmount = useMemo(() => {
    if (dashboardData) {
      return fmt.format(dashboardData.recentDailyAmount);
    }
    return fmt.format(recentDaily[recentDaily.length - 1].amount);
  }, [dashboardData]);

  const recentDate = useMemo(() => {
    if (dashboardData) {
      return dashboardData.recentDate;
    }
    return recentDaily[recentDaily.length - 1].date;
  }, [dashboardData]);

  const mostPopularProduct = useMemo(() => {
    if (dashboardData) {
      return {
        name: dashboardData.mostPopularProduct,
        sold: dashboardData.mostPopularSold,
        revenue: dashboardData.mostPopularRevenue,
      };
    }
    return topProducts[0];
  }, [dashboardData]);

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-50">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((s) => !s)}
        links={[
          { to: "/store-manager", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
          { to: "/store-manager/sessions", label: "Sessions", icon: <LineChartIcon className="h-4 w-4" /> },
          { to: "/store-manager/offers", label: "Offers", icon: <Percent className="h-4 w-4" /> },
          { to: "/store-manager/operations", label: "Store Operations", icon: <Package className="h-4 w-4" /> },
          { to: "/store-manager/upload-report", label: "Upload Report", icon: <Upload className="h-4 w-4" /> },
          { to: "/store-manager/outbox", label: "Outbox", icon: <Send className="h-4 w-4" /> },
        ]}
      />

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />

        <Routes>
          <Route
            index
            element={
              <main className="p-4 md:p-6">
                <div className="mb-6">
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Store Manager Dashboard</h1>
                  {loading && <p className="text-slate-600">Loading dashboard data...</p>}
                  {error && <p className="text-red-600">Error: {error}</p>}
                  {!loading && !error && dashboardData && <p className="text-slate-600">Connected to backend API</p>}
                </div>

                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-slate-500">Loading...</div>
                  </div>
                )}

                {!loading && (
                  <>

                {/* KPI Row */}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Card>
                    <CardTitle>💰 Total Sales</CardTitle>
                    <CardValue>{totalSales}</CardValue>
                    <CardHint>Last 5 days</CardHint>
                  </Card>

                  <Card>
                    <CardTitle>🧾 Total Orders</CardTitle>
                    <CardValue>{totalOrders}</CardValue>
                    <CardHint>Last 5 days</CardHint>
                  </Card>

                  <Card>
                    <CardTitle>📅 Recent Daily Amount</CardTitle>
                    <CardValue>{recentDailyAmount}</CardValue>
                    <CardHint>{recentDate}</CardHint>
                  </Card>

                  <Card>
                    <CardTitle>⭐ Most Popular Product</CardTitle>
                    <div className="mt-1">
                      <div className="font-medium">{mostPopularProduct.name}</div>
                      <div className="text-xs text-slate-500">Sold {mostPopularProduct.sold} • {fmt.format(mostPopularProduct.revenue)}</div>
                    </div>
                  </Card>
                </section>

                {/* Charts Row */}
                <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <Card padded>
                    <h2 className="mb-3 text-lg font-medium leading-none tracking-tight">Sales / Money (Line)</h2>
                    <SalesLineChart data={salesTrendData || salesTrend} />
                  </Card>

                  <Card padded>
                    <h2 className="mb-3 text-lg font-medium leading-none tracking-tight">Category Products Counts (Pie)</h2>
                    <CategoryPieChart data={categoryCountsData || categoryCounts} />
                  </Card>
                </section>

                {/* Insights Row */}
                <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <Card padded>
                    <h2 className="mb-3 text-lg font-medium leading-none tracking-tight">Most Popular Products</h2>
                    <ProductsList items={topProductsData || topProducts} />
                  </Card>

                  <Card padded>
                    <h2 className="mb-3 text-lg font-medium leading-none tracking-tight">Recent Daily Amount & Orders</h2>
                    <RecentDailyTable rows={recentDailyData || recentDaily} />
                  </Card>
                </section>
                  </>
                )}
              </main>
            }
          />
          <Route path="sessions" element={<div className="flex-1 p-4 md:p-6"><Sessions /></div>} />
          <Route path="offers" element={<div className="flex-1"><StoreManagerOffersPage /></div>} />
          <Route path="operations" element={<div className="flex-1 p-4 md:p-6"><StoreOperations /></div>} />
          <Route path="upload-report" element={<UploadReport />} />
          <Route path="outbox" element={<div className="flex-1 overflow-auto"><Outbox /></div>} />
          <Route path="compose" element={<Compose />} />
          <Route path="message/:id" element={<MessageDetail />} />
        </Routes>
      </div>
    </div>
  );
}
