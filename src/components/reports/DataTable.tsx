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
          <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
            <tr>
              {columns.map((c)=> (
                <th 
                  key={String(c.key)} 
                  className="px-4 py-2.5 text-left text-sm font-semibold text-slate-700 bg-slate-50/50 transition-colors duration-150" 
                  style={{ width: c.width }}
                >
                  {c.header}
                </th>
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
                <tr 
                  key={idx} 
                  className="hover:bg-blue-50/50 transition-all duration-150 ease-in-out cursor-pointer border-b border-slate-100 hover:border-blue-200/50 group"
                  onClick={()=> onRowClick && onRowClick(row)}
                >
                  {columns.map((c)=> {
                    const raw = (row as any)[c.key as any];
                    const isNumeric = typeof raw === 'number';
                    return (
                      <td 
                        key={String(c.key)} 
                        className={`px-4 py-2.5 ${isNumeric ? 'text-right font-tabular-nums' : 'text-left'} text-slate-700 group-hover:text-slate-900 transition-colors duration-150`}
                      >
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
        <div className="text-xs text-muted-foreground">Page {page} of {totalPages} {total > 0 && `(${total} total)`}</div>
        <div className="flex items-center gap-2">
          <select 
            value={pageSize} 
            onChange={(e)=>onPageSizeChange(parseInt(e.target.value))} 
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150 cursor-pointer"
          >
            {[10,20,50].map(s=> <option key={s} value={s}>{s}/page</option>)}
          </select>
          <div className="inline-flex rounded-lg overflow-hidden border border-slate-300 bg-white shadow-sm">
            <button 
              onClick={()=>onPageChange(Math.max(1, page-1))} 
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={()=>onPageChange(Math.min(totalPages, page+1))} 
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-150 border-l border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


