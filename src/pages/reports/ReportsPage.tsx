import { useEffect, useState } from "react";
import RoleGate from "../../components/reports/RoleGate";
import FiltersBar from "../../components/reports/FiltersBar";
import KpiGrid from "../../components/reports/KpiGrid";
import DataTable from "../../components/reports/DataTable";
import { reportsApi } from "../../services/reports.api";
import type { ReportFilters, KpiItem, SalesRow } from "../../types/reports.dto";

export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: new Date(new Date().setDate(new Date().getDate()-7)).toISOString(),
    dateTo: new Date().toISOString(),
    categoryIds: [], brandIds: [], productIds: [],
    paymentMethods: [], cashierIds: [], shiftIds: [],
    customerSegments: [], netMode: false, includeDiscounts: true,
  });
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loadingTable, setLoadingTable] = useState(true);

  useEffect(() => {
    setLoadingKpis(true);
    reportsApi.fetchSalesSummary(filters).then(setKpis).finally(()=>setLoadingKpis(false));
  }, [filters]);

  useEffect(() => {
    setLoadingTable(true);
    reportsApi.fetchSalesTable({ filters, page, size: pageSize }).then((res)=>{
      setRows(res.data); setTotal(res.total);
    }).finally(()=>setLoadingTable(false));
  }, [filters, page, pageSize]);

  return (
    <RoleGate>
      <div className="p-4 md:p-6 space-y-4">
        <FiltersBar
          filters={filters}
          setFilters={setFilters}
          onExport={()=>{}}
          onSaveView={()=>{}}
          onReset={()=>{
            setFilters({
              dateFrom: new Date(new Date().setDate(new Date().getDate()-7)).toISOString(),
              dateTo: new Date().toISOString(),
              categoryIds: [], brandIds: [], productIds: [],
              paymentMethods: [], cashierIds: [], shiftIds: [],
              customerSegments: [], netMode: false, includeDiscounts: true,
            });
          }}
        />

        <KpiGrid items={kpis} loading={loadingKpis} />

        <DataTable<SalesRow>
          columns={[
            { key: 'date', header: 'Date' },
            { key: 'invoiceId', header: 'Invoice #' },
            { key: 'cashier', header: 'Cashier' },
            { key: 'itemsCount', header: 'Items' },
            { key: 'subtotal', header: 'Subtotal', render: (r)=> `$${r.subtotal.toFixed(2)}` },
            { key: 'discount', header: 'Discount', render: (r)=> `$${r.discount.toFixed(2)}` },
            { key: 'tax', header: 'Tax', render: (r)=> `$${r.tax.toFixed(2)}` },
            { key: 'total', header: 'Total', render: (r)=> `$${r.total.toFixed(2)}` },
            { key: 'paymentMethod', header: 'Payment' },
          ]}
          data={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s)=>{ setPageSize(s); setPage(1); }}
          loading={loadingTable}
          emptyMessage="No sales found for selected period"
        />
      </div>
    </RoleGate>
  );
}


