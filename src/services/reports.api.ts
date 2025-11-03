import type { ReportFilters, KpiItem, SalesRow } from "../types/reports.dto";

// TODO: wire real API endpoints

function delay<T>(data: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

export const reportsApi = {
  async fetchMeta() {
    return delay({
      categories: [ { id: "c1", name: "Electronics" }, { id: "c2", name: "Groceries" } ],
      brands: [ { id: "b1", name: "Apple" }, { id: "b2", name: "OrganicCo" } ],
      products: [ { id: "p1", name: "iPhone 15 Pro" }, { id: "p2", name: "Olive Oil 500ml" } ],
      paymentMethods: ["CASH", "CARD", "WALLET"],
      cashiers: [ { id: "u1", name: "Moath Saleh" }, { id: "u2", name: "Sara" } ],
      shifts: [ { id: "s1", name: "Morning" }, { id: "s2", name: "Evening" } ],
      segments: [ "New", "Returning", "VIP" ],
    });
  },

  async fetchSalesSummary(_filters: ReportFilters): Promise<KpiItem[]> {
    return delay([
      { id: "totalSales", label: "Total Sales", value: "$123,450", delta: 5.2 },
      { id: "ordersCount", label: "Orders", value: 982, delta: 2.1 },
      { id: "avgOrder", label: "Avg Order Value", value: "$125.72", delta: -1.4 },
      { id: "discountPct", label: "Discount %", value: "8.3%", delta: 0.3 },
      { id: "refunds", label: "Refunds %", value: "1.1%" },
    ]);
  },

  async fetchSalesSeries(_filters: ReportFilters, granularity: "day"|"week"|"month") {
    const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const data = days.map((d, i) => ({ name: d, value: 100 + i * 20 }));
    return delay({ granularity, data });
  },

  async fetchSalesTable({ filters, page, size, sort }: { filters: ReportFilters; page: number; size: number; sort?: string; }) {
    const rows: SalesRow[] = Array.from({ length: size }).map((_, idx) => ({
      date: "2025-10-2" + ((page*size+idx)%10),
      invoiceId: "INV-" + (10000 + page*size + idx),
      cashier: idx % 2 ? "Moath" : "Sara",
      itemsCount: 3 + (idx % 5),
      subtotal: 120 + idx * 5,
      discount: (idx % 3) * 5,
      tax: 7,
      total: 120 + idx * 5 - (idx % 3) * 5 + 7,
      paymentMethod: idx % 2 ? "CARD" : "CASH",
      customer: idx % 3 ? "Customer " + idx : undefined,
    }));
    return delay({ data: rows, total: 200 });
  },

  async exportReport({ type, filters, columns }: { type: "csv"|"xlsx"|"pdf"; filters: ReportFilters; columns: string[] }) {
    const url = URL.createObjectURL(new Blob(["mock export"], { type: "text/plain" }));
    return delay({ url, type });
  },
};


