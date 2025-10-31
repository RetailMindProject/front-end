import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Filter as FilterIcon, Download, Calendar } from "lucide-react";

type Column<T> = { key: keyof T | string; label: string; align?: "left" | "center" | "right"; render?: (row: T) => React.ReactNode };
type Status = "OK" | "Low" | "Critical";

function Section({
  id,
  title,
  description,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-4 sm:px-6 py-4"
      >
        <div className="flex items-center gap-3 text-left">
          {open ? <ChevronDown className="h-5 w-5 text-slate-500" /> : <ChevronRight className="h-5 w-5 text-slate-500" />}
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-800">{title}</h2>
            {description ? <p className="text-xs sm:text-sm text-slate-500">{description}</p> : null}
          </div>
        </div>
      </button>
      {open ? <div className="px-4 sm:px-6 pb-6">{children}</div> : null}
    </section>
  );
}

function ReportTable<T extends Record<string, any>>({
  columns,
  rows,
  rowKey,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-slate-200 ${className ?? ""}`}>
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr className="text-left text-slate-700">
            {columns.map((c) => (
              <th
                key={String(c.key)}
                className={`px-3 py-2 font-medium ${alignToClass(c.align)}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)} className="hover:bg-slate-50/60">
              {columns.map((c) => (
                <td
                  key={String(c.key)}
                  className={`px-3 py-2 text-slate-700 ${alignToClass(c.align)}`}
                >
                  {c.render ? c.render(r) : formatCell(r[c.key as keyof T])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const styles =
    status === "OK"
      ? "bg-green-100 text-green-700"
      : status === "Low"
      ? "bg-amber-100 text-amber-800"
      : "bg-red-100 text-red-700";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>{status}</span>;
}

function alignToClass(align?: "left" | "center" | "right") {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function formatCell(value: unknown) {
  if (typeof value === "number") return value.toLocaleString();
  if (value == null) return "-";
  return String(value);
}

function FiltersRow({
  period,
  setPeriod,
  store,
  setStore,
  onExportCSV,
  onExportPDF,
}: {
  period: string;
  setPeriod: (v: string) => void;
  store: string;
  setStore: (v: string) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="inline-flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-500" />
          <label className="text-sm text-slate-600">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option>Daily</option>
            <option>Weekly</option>
            <option>Monthly</option>
            <option>Yearly</option>
          </select>
        </div>
        <div className="inline-flex items-center gap-2">
          <FilterIcon className="h-4 w-4 text-slate-500" />
          <label className="text-sm text-slate-600">Store</label>
          <select
            value={store}
            onChange={(e) => setStore(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option>All stores</option>
            <option>Downtown</option>
            <option>Airport</option>
            <option>Mall</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onExportCSV}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
        <button
          onClick={onExportPDF}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Download className="h-4 w-4" />
          Export PDF
        </button>
      </div>
    </div>
  );
}

const salesByStoreMock = [
  { store: "Downtown", orders: 412, qty: 1280, gross: 98500, discounts: 5400, net: 93100 },
  { store: "Airport", orders: 297, qty: 910, gross: 74200, discounts: 3900, net: 70300 },
  { store: "Mall", orders: 521, qty: 1615, gross: 123400, discounts: 7200, net: 116200 },
];

const topProductsMock = [
  { product: "iPhone 15 Pro", category: "Electronics", units: 142, net: 18900, pct: 16.5 },
  { product: "Organic Olive Oil", category: "Groceries", units: 320, net: 9600, pct: 8.1 },
  { product: "Cotton Hoodie", category: "Clothes", units: 158, net: 7100, pct: 6.2 },
];

const inventoryMovementMock = [
  { item: "Wireless Mouse", sku: "WM-001", store: "Downtown", opening: 120, received: 40, sold: 60, adjusted: -2, closing: 98, status: "OK" as Status },
  { item: "Olive Oil 500ml", sku: "OO-500", store: "Mall", opening: 60, received: 0, sold: 55, adjusted: 0, closing: 5, status: "Low" as Status },
  { item: "USB-C Cable", sku: "USBC-100", store: "Airport", opening: 80, received: 0, sold: 79, adjusted: 0, closing: 1, status: "Critical" as Status },
];

const exceptionsMock = [
  { type: "Negative stock", store: "Airport", ref: "SKU USBC-100", severity: "High", description: "Stock dipped below zero after returns.", date: "2025-10-24" },
  { type: "Unbalanced order", store: "Downtown", ref: "ORD-20041", severity: "Medium", description: "Payment variance detected.", date: "2025-10-23" },
  { type: "High discount order", store: "Mall", ref: "ORD-20077", severity: "Low", description: "Discount > 30% flagged.", date: "2025-10-22" },
];

export default function CeoReportsPage() {
  const [period, setPeriod] = useState("Monthly");
  const [store, setStore] = useState("All stores");
  const [open, setOpen] = useState<{ [key: string]: boolean }>({
    sales: true,
    inventory: true,
    exceptions: true,
  });

  const netTotal = useMemo(
    () => salesByStoreMock.reduce((sum, r) => sum + r.net, 0),
    []
  );

  const toggle = (id: string) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">CEO Reports</h1>
          <p className="text-sm text-slate-600">Consolidated operational reports for the selected period.</p>
        </header>

        <div className="mb-6">
          <FiltersRow
            period={period}
            setPeriod={setPeriod}
            store={store}
            setStore={setStore}
            onExportCSV={() => alert("Export CSV (mock)")}
            onExportPDF={() => alert("Export PDF (mock)")}
          />
        </div>

        <div className="space-y-6">
          <Section
            id="sales"
            title="Store Sales Detailed Report"
            description="Sales aggregated by store, then by category, for the selected period."
            open={open.sales}
            onToggle={toggle}
          >
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-700">Sales by Store</h3>
                <ReportTable
                  columns={[
                    { key: "store", label: "Store" },
                    { key: "orders", label: "Orders", align: "right" },
                    { key: "qty", label: "Qty", align: "right" },
                    { key: "gross", label: "Gross Sales", align: "right", render: (r: typeof salesByStoreMock[number]) => formatCurrency(r.gross) },
                    { key: "discounts", label: "Discounts", align: "right", render: (r: typeof salesByStoreMock[number]) => formatCurrency(r.discounts) },
                    { key: "net", label: "Net Sales", align: "right", render: (r: typeof salesByStoreMock[number]) => formatCurrency(r.net) },
                  ]}
                  rows={salesByStoreMock}
                  rowKey={(r, i) => `${r.store}-${i}`}
                />
                <div className="mt-2 text-right text-xs text-slate-600">Total Net: {formatCurrency(netTotal)}</div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-700">Top products in period</h3>
                <ReportTable
                  columns={[
                    { key: "product", label: "Product" },
                    { key: "category", label: "Category" },
                    { key: "units", label: "Units sold", align: "right" },
                    { key: "net", label: "Net amount", align: "right", render: (r: typeof topProductsMock[number]) => formatCurrency(r.net) },
                    { key: "pct", label: "% of store total", align: "right", render: (r: typeof topProductsMock[number]) => `${r.pct.toFixed(1)}%` },
                  ]}
                  rows={topProductsMock}
                  rowKey={(r, i) => `${r.product}-${i}`}
                />
              </div>
            </div>
          </Section>

          <Section
            id="inventory"
            title="Inventory Movement Report"
            description="Stock in / stock out / low stock per store."
            open={open.inventory}
            onToggle={toggle}
          >
            <ReportTable
              columns={[
                { key: "item", label: "Item" },
                { key: "sku", label: "SKU" },
                { key: "store", label: "Store" },
                { key: "opening", label: "Opening Qty", align: "right" },
                { key: "received", label: "Received", align: "right" },
                { key: "sold", label: "Sold", align: "right" },
                { key: "adjusted", label: "Adjusted", align: "right" },
                { key: "closing", label: "Closing Qty", align: "right" },
                {
                  key: "status",
                  label: "Status",
                  align: "center",
                  render: (r: typeof inventoryMovementMock[number]) => <StatusBadge status={r.status} />,
                },
              ]}
              rows={inventoryMovementMock}
              rowKey={(r, i) => `${r.sku}-${i}`}
            />
          </Section>

          <Section
            id="exceptions"
            title="Exceptions / Anomalies"
            description="Records that need attention."
            open={open.exceptions}
            onToggle={toggle}
          >
            <ReportTable
              columns={[
                { key: "type", label: "Type" },
                { key: "store", label: "Store" },
                { key: "ref", label: "Reference" },
                { key: "severity", label: "Severity", align: "center" },
                { key: "description", label: "Description" },
                { key: "date", label: "Date", align: "right" },
              ]}
              rows={exceptionsMock}
              rowKey={(r, i) => `${r.ref}-${i}`}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}


