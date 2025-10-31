import React from "react";
import { LogOut } from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function Topbar() {
  return (
    <header className="sticky top-0 z-10 bg-gradient-to-r from-white via-indigo-50/30 to-blue-50/30 backdrop-blur-sm border-b border-indigo-200/40 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 animate-pulse"></div>
          <div>
            <h2 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
              Store Manager
            </h2>
            <p className="text-xs text-gray-500">Dashboard Control Panel</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white/80 hover:shadow-md transition-all duration-200 border border-gray-200/50">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
