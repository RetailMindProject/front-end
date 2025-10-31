import React from "react";
import { LogOut, MessageSquare } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { Link, useLocation } from "react-router-dom";

function useRoleHeader() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/ceo")) {
    return { role: "CEO", name: "Ahmad Ali" };
  }
  if (pathname.startsWith("/store-manager")) {
    return { role: "Store Manager", name: "Moath Saleh" };
  }
  if (pathname.startsWith("/inventory-manager")) {
    return { role: "Inventory Manager", name: "Sara Mohammed" };
  }
  return { role: "Dashboard", name: "Guest" };
}

export default function Topbar() {
  const { role, name } = useRoleHeader();
  return (
    <header className="sticky top-0 z-10 border-b border-indigo-200/40 shadow-sm bg-gradient-to-r from-white via-blue-50/40 to-indigo-50/40 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        {/* Right section: Name and Position */}
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 animate-pulse"></div>
          <Link to="/profile" className="leading-tight">
            <div className="text-base sm:text-lg font-semibold text-slate-800 hover:text-indigo-700 transition-colors cursor-pointer">
              {name}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500">{role}</div>
          </Link>
        </div>

        {/* Soft divider (optional) */}
        <div className="hidden sm:block h-6 w-px bg-gradient-to-b from-transparent via-indigo-200 to-transparent" />

        {/* Left section: Messages, Notifications, Logout */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button aria-label="Messages" className="rounded-lg p-2 text-slate-600 hover:text-indigo-700 hover:bg-white transition-colors">
            <MessageSquare className="h-5 w-5" />
          </button>
          <NotificationBell />
          <button className="flex items-center gap-2 rounded-lg border border-slate-200/60 bg-white/60 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:shadow-sm transition-all">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
