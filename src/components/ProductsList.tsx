
export type Product = { name: string; sku: string; sold: number; revenue: number };
const fmt = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function ProductsList({ items }: { items: Product[] }) {
  return (
    <ul className="divide-y divide-slate-200">
      {items.map((p) => (
        <li key={p.sku} className="flex items-center justify-between py-3">
          <div className="min-w-0">
            <div className="truncate font-medium">{p.name}</div>
            <div className="text-xs text-slate-500">{p.sku}</div>
          </div>
          <div className="text-right text-sm">
            <div>Sold {p.sold}</div>
            <div className="text-xs text-slate-500">{fmt.format(p.revenue)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
