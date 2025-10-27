import React from "react";

export type Daily = { date: string; amount: number; orders: number };
const fmt = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function RecentDailyTable({ rows }: { rows: Daily[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-slate-500">
          <th className="py-2 font-medium">Date</th>
          <th className="py-2 font-medium">Amount</th>
          <th className="py-2 font-medium">Orders</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((d) => (
          <tr key={d.date} className="border-t border-slate-200">
            <td className="py-2">{d.date}</td>
            <td className="py-2">{fmt.format(d.amount)}</td>
            <td className="py-2">{d.orders}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
