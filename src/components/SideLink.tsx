import React from "react";

export default function SideLink({
  icon,
  label,
  open,
  active,
}: { icon: React.ReactNode; label: string; open: boolean; active?: boolean }) {
  return (
    <div
      className={`mb-1 flex cursor-default items-center gap-2 rounded-lg px-3 py-2 ${
        active ? "bg-blue-200 text-blue-900" : "text-blue-700 hover:bg-blue-100"
      }`}
      title={label}
    >
      {icon}
      <span className={`${open ? "block" : "hidden"}`}>{label}</span>
    </div>
  );
}
