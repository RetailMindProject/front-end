import React from "react";

export function Card({ children, padded = false }: { children: React.ReactNode; padded?: boolean }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${padded ? "p-5" : "p-4"}`}>{children}</div>;
}
export function CardTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium text-slate-600">{children}</div>;
}
export function CardValue({ children }: { children: React.ReactNode }) {
  return <div className="text-2xl font-semibold tracking-tight">{children}</div>;
}
export function CardHint({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-slate-500">{children}</div>;
}
