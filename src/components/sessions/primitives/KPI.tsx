import type { ReactNode } from "react";

export default function KPI({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-base font-semibold text-gray-900">{value}</div>
    </div>
  );
}