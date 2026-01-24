import type { ReactNode } from "react";

export default function BackButton({
  onClick,
  children,
  className,
}: {
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/70 border border-slate-200 text-slate-700 hover:bg-white hover:text-slate-900 transition-all duration-200 shadow-sm text-sm font-semibold ${className || ""}`}
    >
      {children}
    </button>
  );
}

