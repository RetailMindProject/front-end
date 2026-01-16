import type { ReactNode } from "react";

export default function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full bg-white/90 backdrop-blur-xl p-8 md:p-10 rounded-2xl shadow-2xl border border-white/50 relative overflow-hidden animate-in slide-in-from-top-2">
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-white/40 pointer-events-none" />
      
      {/* Top accent gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0066FF] via-[#0044CC] to-[#0066FF]" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
