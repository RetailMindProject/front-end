import React from "react";
import { LogOut } from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function Topbar() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
      <div className="text-sm text-slate-500">Store Manager</div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <button className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100">
          <LogOut className="mr-1 inline-block h-4 w-4" /> Logout
        </button>
      </div>
    </header>
  );
}
