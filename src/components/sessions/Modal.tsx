import React from "react";
import { X } from "lucide-react";

export default function Modal({
  title,
  onClose,
  children,
}: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0f172a] p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-medium text-white">{title}</div>
          <button className="rounded-lg p-1 text-slate-300 hover:bg-slate-800" onClick={onClose} aria-label="Close modal">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
