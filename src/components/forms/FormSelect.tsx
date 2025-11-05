import React from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  hint?: string;
  className?: string;
}

export default function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select option",
  required = false,
  hint,
  className = "",
}: FormSelectProps) {
  return (
    <div>
      <label className="block mb-1 text-sm font-medium text-slate-700">
        {label} {required && "*"}
      </label>
      <select
        value={value}
        onChange={onChange}
        required={required}
        className={`w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 ${className}`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <p className="text-[11px] text-slate-400 mt-1">{hint}</p>
      )}
    </div>
  );
}

