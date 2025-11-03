import React from "react";

export type DataTableProps<T> = {
  columns: Array<{ key: keyof T | string; header: string; width?: string; render?: (row: T)=>React.ReactNode }>;
  data: T[]; total: number; page: number; pageSize: number;
  onPageChange: (p:number)=>void; onPageSizeChange: (s:number)=>void;
  onSort?: (key:string, dir:"asc"|"desc")=>void;
  loading?: boolean; emptyMessage?: string; onRowClick?: (row:T)=>void;
};

export default function DataTable<T>({ columns, data, total, page, pageSize, onPageChange, onPageSizeChange, loading, emptyMessage, onRowClick }: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="shadow-sm">
      <div className="relative max-h-[60vh] overflow-auto rounded-2xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
            <tr>
              {columns.map((c)=> (
                <th key={String(c.key)} className="px-4 py-2 text-left font-medium text-muted-foreground" style={{ width: c.width }}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="text-sm text-muted-foreground">{emptyMessage || 'No data'}</div>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx)=> (
                <tr key={idx} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={()=> onRowClick && onRowClick(row)}>
                  {columns.map((c)=> {
                    const raw = (row as any)[c.key as any];
                    const isNumeric = typeof raw === 'number';
                    return (
                      <td key={String(c.key)} className={`px-4 py-2.5 ${isNumeric ? 'text-right font-tabular-nums' : 'text-left'} text-slate-700`}>
                        {c.render ? c.render(row) : raw}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
        <div className="text-xs text-muted-foreground">Page {page} of {totalPages}</div>
        <div className="flex items-center gap-2">
          <select value={pageSize} onChange={(e)=>onPageSizeChange(parseInt(e.target.value))} className="rounded border px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            {[10,20,50].map(s=> <option key={s} value={s}>{s}/page</option>)}
          </select>
          <div className="inline-flex rounded-xl overflow-hidden border bg-background shadow-sm">
            <button onClick={()=>onPageChange(Math.max(1, page-1))} className="px-2 py-1 text-xs hover:bg-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Prev</button>
            <button onClick={()=>onPageChange(Math.min(totalPages, page+1))} className="px-2 py-1 text-xs hover:bg-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border-l">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}


