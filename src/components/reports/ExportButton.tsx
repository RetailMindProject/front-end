import React from "react";
import { Download } from "lucide-react";
import type { ReportFilters } from "../../types/reports.dto";
import { reportsApi } from "../../services/reports.api";

export default function ExportButton({ filters, columns }: { filters: ReportFilters; columns: string[] }) {
  const handleExport = async (type: "csv"|"xlsx"|"pdf") => {
    const res = await reportsApi.exportReport({ type, filters, columns });
    const a = document.createElement('a');
    a.href = res.url;
    a.download = `reports.${type}`;
    a.click();
  };
  return (
    <div className="inline-flex rounded-xl border bg-background shadow-sm overflow-hidden">
      <div className="px-2 text-muted-foreground flex items-center">
        <Download className="h-4 w-4" />
      </div>
      <button onClick={()=>handleExport("csv")} className="px-3 py-1.5 text-xs font-medium hover:bg-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">CSV</button>
      <button onClick={()=>handleExport("xlsx")} className="px-3 py-1.5 text-xs font-medium hover:bg-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border-l">XLSX</button>
      <button onClick={()=>handleExport("pdf")} className="px-3 py-1.5 text-xs font-medium hover:bg-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border-l">PDF</button>
    </div>
  );
}


