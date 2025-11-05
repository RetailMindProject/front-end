import type { ReactNode } from "react";

interface ProfileInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  icon?: ReactNode;
  className?: string;
}

export default function ProfileInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  icon,
  className = "",
}: ProfileInputProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          className={`h-12 ${icon ? "pl-12" : "pl-4"} pr-4 w-full rounded-xl border-2 border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 bg-slate-50 transition text-slate-900`}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

