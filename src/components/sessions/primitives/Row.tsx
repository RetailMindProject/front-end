import type { ReactNode } from "react";

export default function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-1 text-sm">
      <div className="col-span-1 text-gray-600">{label}</div>
      <div className="col-span-2 text-gray-900">{value}</div>
    </div>
  );
}