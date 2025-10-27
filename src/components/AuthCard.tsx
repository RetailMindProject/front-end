import type { ReactNode } from "react";

export default function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full md:w-[680px] bg-white p-10 rounded-2xl shadow-xl border border-gray-100 flex flex-col justify-center h-full md:min-h-screen">
      {children}
    </div>
  );
}
