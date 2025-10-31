import type { ReactNode } from "react";

export default function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full md:w-[600px] bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
      {children}
    </div>
  );
}
