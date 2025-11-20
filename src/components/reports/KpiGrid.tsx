import type { KpiItem } from "../../types/reports.dto";

export default function KpiGrid({ items, loading }: { items: KpiItem[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border bg-gradient-to-r from-blue-500/20 to-blue-400/20 animate-pulse"/>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {items.map((kpi)=> (
        <div 
          key={kpi.id} 
          className="rounded-2xl border bg-gradient-to-r from-blue-500 to-blue-400 p-6 shadow-sm h-full text-white transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-blue-500/20 hover:scale-[1.02] hover:-translate-y-0.5 cursor-default"
        >
          <div className="text-sm text-white/80 transition-opacity duration-200">{kpi.label}</div>
          <div className="mt-1 text-3xl font-semibold tracking-tight text-white transition-transform duration-200">{kpi.value}</div>
          {typeof kpi.delta === 'number' && (
            <div className="mt-4 flex">
              <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-white/20 text-white transition-all duration-200 hover:bg-white/30`}>
                {kpi.delta >= 0 ? '▲' : '▼'} {Math.abs(kpi.delta).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


