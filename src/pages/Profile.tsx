import React from "react";
import { useLocation } from "react-router-dom";

function useRoleAndName() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/ceo")) return { role: "CEO", name: "Ahmad Ali" };
  if (pathname.startsWith("/store-manager")) return { role: "Store Manager", name: "Moath Saleh" };
  if (pathname.startsWith("/inventory-manager")) return { role: "Inventory Manager", name: "Sara Mohammed" };
  return { role: "Dashboard", name: "Guest" };
}

export default function Profile() {
  const { role, name } = useRoleAndName();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold text-slate-800">{name}</div>
        <div className="text-sm text-slate-500">{role}</div>
        <p className="mt-4 text-slate-600">Profile details coming soon...</p>
      </div>
    </div>
  );
}


