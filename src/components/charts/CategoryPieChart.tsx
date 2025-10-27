import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from "recharts";

export type CategoryItem = { name: string; value: number };
const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444"];

export default function CategoryPieChart({ data }: { data: CategoryItem[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={96} dataKey="value" label>
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
