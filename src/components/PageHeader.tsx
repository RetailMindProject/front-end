import type { ReactNode } from "react";

export default function PageHeader({
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
    <header
      className={`border-b border-indigo-200/50 bg-white/80 backdrop-blur-md shadow-sm mb-6 sm:mb-8 ${className || ""}`}
    >
      <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500" />
      <div className="px-4 sm:px-6 py-5 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {icon && (
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg ring-2 ring-white/20">
                {icon}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                {title}
              </h1>
            </div>
          </div>
          {right && <div className="flex items-center gap-3">{right}</div>}
        </div>
      </div>
    </header>
  );
}

