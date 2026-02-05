import type { ReactNode } from "react";

export default function SectionHeader({
  title,
  icon,
  right,
  className,
}: {
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-indigo-200/40 bg-white/80 backdrop-blur-md shadow-sm ${className || ""}`}>
      <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500 rounded-t-2xl" />
      <div className="px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg ring-2 ring-white/20">
                {icon}
              </div>
            )}
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h3>
          </div>
          {right && <div className="flex items-center gap-2">{right}</div>}
        </div>
      </div>
    </div>
  );
}

