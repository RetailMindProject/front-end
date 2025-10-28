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
      className={`mb-1 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 ${
        active ? "bg-blue-200 text-blue-900" : "text-blue-700 hover:bg-blue-100"
      }`}
      title={label}
      onClick={onClick}
    >
      {icon}
      <span className={`${open ? "block" : "hidden"}`}>{label}</span>
    </div>
  );
}
