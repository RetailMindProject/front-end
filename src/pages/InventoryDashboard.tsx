import React, { useMemo } from "react";
import { Card, CardTitle, CardValue, CardHint, SalesLineChart, CategoryPieChart, BarChart } from "../components";

// Mock data
const weeklyCategoryMovement = [
  { category: "Electronics", in: 45, out: 32 },
  { category: "Groceries", in: 120, out: 95 },
  { category: "Clothes", in: 38, out: 28 },
  { category: "Accessories", in: 25, out: 18 },
];

const categorySales = [
  { name: "Electronics", value: 12500 },
  { name: "Groceries", value: 8900 },
  { name: "Clothes", value: 5600 },
  { name: "Accessories", value: 3200 },
];

const weeklyMovementLine = [
  { day: "Mon", quantity: 45 },
  { day: "Tue", quantity: 52 },
  { day: "Wed", quantity: 38 },
  { day: "Thu", quantity: 61 },
  { day: "Fri", quantity: 48 },
  { day: "Sat", quantity: 55 },
  { day: "Sun", quantity: 42 },
];

const mostMovedProducts = [
  { name: "iPhone 15 Pro", category: "Electronics", movement: 142 },
  { name: "Organic Olive Oil", category: "Groceries", movement: 320 },
  { name: "Cotton Hoodie", category: "Clothes", movement: 158 },
];

const recentMovements = [
  { date: "2025-01-28", product: "iPhone 15 Pro", type: "IN", quantity: 25, category: "Electronics" },
  { date: "2025-01-28", product: "Organic Olive Oil", type: "OUT", quantity: 15, category: "Groceries" },
  { date: "2025-01-28", product: "Cotton Hoodie", type: "IN", quantity: 50, category: "Clothes" },
  { date: "2025-01-27", product: "Wireless Earbuds", type: "OUT", quantity: 12, category: "Electronics" },
  { date: "2025-01-27", product: "Yogurt Pack", type: "IN", quantity: 100, category: "Groceries" },
];

const fmt = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function InventoryDashboard() {
  const totalIn = useMemo(() => weeklyCategoryMovement.reduce((a, b) => a + b.in, 0), []);
  const totalOut = useMemo(() => weeklyCategoryMovement.reduce((a, b) => a + b.out, 0), []);
  const movementCount = useMemo(() => recentMovements.length, []);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Inventory Dashboard</h1>
        <p className="text-slate-600">Weekly category movement and sales overview</p>
      </div>

      {/* KPI Row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardTitle>📥 Total In</CardTitle>
          <CardValue>{totalIn}</CardValue>
          <CardHint>This week</CardHint>
        </Card>

        <Card>
          <CardTitle>📤 Total Out</CardTitle>
          <CardValue>{totalOut}</CardValue>
          <CardHint>This week</CardHint>
        </Card>

        <Card>
          <CardTitle>📊 Movement Count</CardTitle>
          <CardValue>{movementCount}</CardValue>
          <CardHint>Recent movements</CardHint>
        </Card>

        <Card>
          <CardTitle>⭐ Most Moved Product</CardTitle>
          <div className="mt-1">
            <div className="font-medium">{mostMovedProducts[0].name}</div>
            <div className="text-xs text-slate-500">{mostMovedProducts[0].movement} movements</div>
          </div>
        </Card>
      </section>

      {/* Charts Row */}
      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card padded>
          <h2 className="mb-3 text-lg font-medium leading-none tracking-tight">Weekly Category Movement (Bar)</h2>
          <BarChart data={weeklyCategoryMovement.map(item => ({ name: item.category, value: item.in + item.out }))} />
        </Card>

        <Card padded>
          <h2 className="mb-3 text-lg font-medium leading-none tracking-tight">Weekly Movement Trend (Line)</h2>
          <SalesLineChart data={weeklyMovementLine.map(item => ({ day: item.day, revenue: item.quantity, orders: 0 }))} />
        </Card>
      </section>

      {/* Charts Row 2 */}
      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card padded>
          <h2 className="mb-3 text-lg font-medium leading-none tracking-tight">Categories Sales (Pie)</h2>
          <CategoryPieChart data={categorySales.map(item => ({ name: item.name, value: item.value / 100 }))} />
        </Card>

        <Card padded>
          <h2 className="mb-3 text-lg font-medium leading-none tracking-tight">Most Moved Products</h2>
          <div className="space-y-3">
            {mostMovedProducts.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <div className="font-medium text-sm">{product.name}</div>
                  <div className="text-xs text-gray-500">{product.category}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-indigo-600">{product.movement}</div>
                  <div className="text-xs text-gray-500">movements</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Recent Movements */}
      <section className="mt-6">
        <Card padded>
          <h2 className="mb-3 text-lg font-medium leading-none tracking-tight">Recent In/Out Movements</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Date</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Product</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Category</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-700">Type</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {recentMovements.map((movement, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-600">{movement.date}</td>
                    <td className="py-2 px-3 font-medium">{movement.product}</td>
                    <td className="py-2 px-3 text-gray-600">{movement.category}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        movement.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {movement.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-medium">{movement.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </>
  );
}

