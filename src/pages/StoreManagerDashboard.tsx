import React, { useMemo, useState } from "react";
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
  const [currentPage, setCurrentPage] = useState('dashboard');
  const totalSales = useMemo(() => fmt.format(recentDaily.reduce((a, b) => a + b.amount, 0)), []);
  const totalOrders = useMemo(() => recentDaily.reduce((a, b) => a + b.orders, 0), []);
  const today = recentDaily[recentDaily.length - 1];

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  if (currentPage === 'sessions') {
    return (
      <div className="flex min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-50">
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((s) => !s)} onNavigate={handleNavigate} />
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar />
          <div className="flex-1">
            <Sessions />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-50">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((s) => !s)} onNavigate={handleNavigate} />

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />

        <main className="p-4 md:p-6">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Store Manager Dashboard</h1>
            <p className="text-slate-600">Mock view – UI only (no backend data)</p>
          </div>

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
              <CardValue>{fmt.format(today.amount)}</CardValue>
              <CardHint>{today.date}</CardHint>
            </Card>

            <Card>
              <CardTitle>⭐ Most Popular Product</CardTitle>
              <div className="mt-1">
                <div className="font-medium">{topProducts[0].name}</div>
                <div className="text-xs text-slate-500">Sold {topProducts[0].sold} • {fmt.format(topProducts[0].revenue)}</div>
              </div>
            </Card>
          </section>

          {/* Charts Row */}
          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card padded>
              <h2 className="mb-3 text-lg font-medium leading-none tracking-tight">Sales / Money (Line)</h2>
              <SalesLineChart data={salesTrend} />
            </Card>

            <Card padded>
              <h2 className="mb-3 text-lg font-medium leading-none tracking-tight">Category Products Counts (Pie)</h2>
              <CategoryPieChart data={categoryCounts} />
            </Card>
          </section>

          {/* Insights Row */}
          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card padded>
              <h2 className="mb-3 text-lg font-medium leading-none tracking-tight">Most Popular Products</h2>
              <ProductsList items={topProducts} />
            </Card>

            <Card padded>
              <h2 className="mb-3 text-lg font-medium leading-none tracking-tight">Recent Daily Amount & Orders</h2>
              <RecentDailyTable rows={recentDaily} />
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
