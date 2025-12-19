import { useEffect, useState } from "react";
import { Filter as FilterIcon, Calendar, RefreshCw, Save, Download, ChevronDown } from "lucide-react";
import type { ReportFilters } from "../../types/reports.dto";

export default function FiltersBar({
  filters,
  setFilters,
  onExport,
  onSaveView,
  onReset,
}: {
  filters: ReportFilters;
  setFilters: (f: ReportFilters) => void;
  onExport: (type: "csv"|"xlsx"|"pdf") => void;
  onSaveView: () => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dateFrom = params.get("from");
    const dateTo = params.get("to");
    if (dateFrom && dateTo) setFilters({ ...filters, dateFrom, dateTo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setQuick = (preset: "today"|"wtd"|"mtd"|"qtd"|"ytd") => {
    const now = new Date();
    const start = new Date(now);
    if (preset === "today") start.setHours(0,0,0,0);
    if (preset === "wtd") start.setDate(now.getDate() - now.getDay());
    if (preset === "mtd") start.setDate(1);
    if (preset === "qtd") start.setMonth(Math.floor(now.getMonth()/3)*3, 1);
    if (preset === "ytd") start.setMonth(0,1);
    setFilters({ ...filters, dateFrom: start.toISOString(), dateTo: now.toISOString() });
  };

  const badge = (label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      className="inline-flex items-center rounded-full border px-3 py-1 text-xs hover:bg-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {label}
    </button>
  );

  return (
    <div className="sticky top-0 z-40 mb-4 rounded-2xl border bg-background/60 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/50 p-4 md:p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FilterIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <button
          type="button"
          onClick={()=>setOpen((v)=>!v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-xl border px-2 py-1 text-xs hover:bg-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span>{open ? 'Hide' : 'Show'}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
      </div>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[1000px]' : 'max-h-0'}`}>
        <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-6 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-500" />
          <input type="date" value={filters.dateFrom.slice(0,10)} onChange={(e)=>setFilters({ ...filters, dateFrom: new Date(e.target.value).toISOString() })} className="w-full rounded-xl border px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"/>
          <span className="text-xs text-muted-foreground">to</span>
          <input type="date" value={filters.dateTo.slice(0,10)} onChange={(e)=>setFilters({ ...filters, dateTo: new Date(e.target.value).toISOString() })} className="w-full rounded-xl border px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"/>
        </div>
        <div className="col-span-12 md:col-span-6 flex flex-wrap items-center gap-2">
          {badge("Today", ()=>setQuick("today"))}
          {badge("WTD", ()=>setQuick("wtd"))}
          {badge("MTD", ()=>setQuick("mtd"))}
          {badge("QTD", ()=>setQuick("qtd"))}
          {badge("YTD", ()=>setQuick("ytd"))}
        </div>

        <div className="col-span-12 md:col-span-6">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Products</div>
          <div className="grid grid-cols-12 gap-2">
            <select multiple value={filters.categoryIds} onChange={(e)=>setFilters({ ...filters, categoryIds: Array.from(e.target.selectedOptions).map(o=>o.value) })} className="col-span-12 sm:col-span-4 rounded-xl border px-2 py-1.5 text-sm h-28 overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <option value="c1">Electronics</option>
          <option value="c2">Groceries</option>
            </select>
            <select multiple value={filters.brandIds} onChange={(e)=>setFilters({ ...filters, brandIds: Array.from(e.target.selectedOptions).map(o=>o.value) })} className="col-span-12 sm:col-span-4 rounded-xl border px-2 py-1.5 text-sm h-28 overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <option value="b1">Apple</option>
          <option value="b2">OrganicCo</option>
            </select>
            <select multiple value={filters.productIds} onChange={(e)=>setFilters({ ...filters, productIds: Array.from(e.target.selectedOptions).map(o=>o.value) })} className="col-span-12 sm:col-span-4 rounded-xl border px-2 py-1.5 text-sm h-28 overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <option value="p1">iPhone 15 Pro</option>
          <option value="p2">Olive Oil 500ml</option>
            </select>
          </div>
        </div>

        <div className="col-span-12 md:col-span-6">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Payments</div>
          <select multiple value={filters.paymentMethods} onChange={(e)=>setFilters({ ...filters, paymentMethods: Array.from(e.target.selectedOptions).map(o=>o.value) })} className="w-full rounded-xl border px-2 py-1.5 text-sm h-28 overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <option>CASH</option>
          <option>CARD</option>
          <option>WALLET</option>
          </select>
        </div>
        <div className="col-span-12 md:col-span-6">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Staff</div>
          <div className="grid grid-cols-12 gap-2">
            <select multiple value={filters.cashierIds} onChange={(e)=>setFilters({ ...filters, cashierIds: Array.from(e.target.selectedOptions).map(o=>o.value) })} className="col-span-12 sm:col-span-6 rounded-xl border px-2 py-1.5 text-sm h-28 overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <option value="u1">Moath</option>
          <option value="u2">Sara</option>
            </select>
            <select multiple value={filters.shiftIds} onChange={(e)=>setFilters({ ...filters, shiftIds: Array.from(e.target.selectedOptions).map(o=>o.value) })} className="col-span-12 sm:col-span-6 rounded-xl border px-2 py-1.5 text-sm h-28 overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <option value="s1">Morning</option>
          <option value="s2">Evening</option>
            </select>
          </div>
        </div>
        <div className="col-span-12 md:col-span-6">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Customers</div>
          <select multiple value={filters.customerSegments} onChange={(e)=>setFilters({ ...filters, customerSegments: Array.from(e.target.selectedOptions).map(o=>o.value) })} className="w-full rounded-xl border px-2 py-1.5 text-sm h-28 overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <option>New</option>
          <option>Returning</option>
          <option>VIP</option>
          </select>
        </div>

        <div className="col-span-12 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700" title="Show totals after discounts/tax as configured.">
              <input type="checkbox" checked={filters.netMode} onChange={(e)=>setFilters({ ...filters, netMode: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"/>
              Net mode
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700" title="Include discount impact in KPIs & totals.">
              <input type="checkbox" checked={filters.includeDiscounts} onChange={(e)=>setFilters({ ...filters, includeDiscounts: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"/>
              Include discounts
            </label>
          </div>

          <div className="flex items-center gap-2 ms-auto">
            <button onClick={onReset} className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <RefreshCw className="h-4 w-4"/> Reset
            </button>
            <button onClick={onSaveView} className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Save className="h-4 w-4"/> Save view
            </button>
            <div className="inline-flex items-center overflow-hidden rounded-xl border bg-background shadow-sm">
              <div className="px-2 text-muted-foreground"><Download className="h-4 w-4"/></div>
              <button onClick={()=>onExport("csv")} className="px-3 py-1.5 text-xs font-medium hover:bg-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">CSV</button>
              <button onClick={()=>onExport("xlsx")} className="px-3 py-1.5 text-xs font-medium hover:bg-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border-l">
                XLSX
              </button>
              <button onClick={()=>onExport("pdf")} className="px-3 py-1.5 text-xs font-medium hover:bg-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border-l">PDF</button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}


