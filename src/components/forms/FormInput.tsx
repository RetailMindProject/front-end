import React from "react";

interface FormInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  hint?: string;
  className?: string;
}

export default function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  hint,
  className = "",
}: FormInputProps) {
  return (
    <div>
      <label className="block mb-1 text-sm font-medium text-slate-700">
        {label} {required && "*"}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 ${className}`}
      />
      {hint && (
        <p className="text-[11px] text-slate-400 mt-1">{hint}</p>
      )}
    </div>
  );
}

