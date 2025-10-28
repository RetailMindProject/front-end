import React from "react";

export default function SideLink({
  icon,
  label,
  open,
  active,
  onClick,
}: { 
  icon: React.ReactNode; 
  label: string; 
  open: boolean; 
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`mb-1.5 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
        active 
          ? "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-md shadow-indigo-500/30" 
          : "text-indigo-700/80 hover:bg-indigo-50/70 hover:text-indigo-900"
      }`}
      title={label}
      onClick={onClick}
    >
      <div className={`${active ? "scale-110" : ""} transition-transform duration-200`}>
        {icon}
      </div>
      <span className={`font-medium text-sm ${open ? "block" : "hidden"}`}>{label}</span>
    </div>
  );
}
