import React from "react";
import { Menu, LayoutDashboard, UsersRound, FileText, TrendingUp, Send } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function CEOSidebar({ open, onToggle }: { 
  open: boolean; 
  onToggle: () => void;
}) {
  const location = useLocation();
  const path = location.pathname;
  
  return (
    <aside className={`${open ? "w-64" : "w-16"} sticky top-0 h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 border-r border-indigo-200/50 transition-all shadow-lg relative`}>
      <div className="pointer-events-none absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_2px_2px,_indigo_500_1px,_transparent_0)] bg-[length:40px_40px]"></div>
      
      <div className="relative flex items-center justify-between px-3 py-4 border-b border-indigo-200/30">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg ring-2 ring-white/20">
            <img 
              src="/picture/retalmind%20(3).jpeg" 
              alt="RetailMind" 
              className="h-9 w-9 rounded-lg"
            />
          </div>
          <span className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 ${open ? "block" : "hidden"}`}>RetailMind CEO</span>
        </div>
        <button onClick={onToggle} className="rounded-lg p-2 hover:bg-indigo-100/50 transition-colors" aria-label="Toggle Sidebar">
          <Menu className="h-5 w-5 text-indigo-600" />
        </button>
      </div>

      <nav className="relative px-2 py-2 text-sm">
        <Link to="/ceo" className="block">
          <div className={`flex items-center gap-3 rounded-md px-3 py-2 hover:bg-indigo-100/60 ${path === '/ceo' ? 'bg-indigo-100/60' : ''}`}>
            <LayoutDashboard className="h-4 w-4" />
            {open && <span>Dashboard</span>}
          </div>
        </Link>
        <Link to="/ceo/manage-accounts" className="block">
          <div className={`flex items-center gap-3 rounded-md px-3 py-2 hover:bg-indigo-100/60 ${path.includes('/ceo/manage-accounts') ? 'bg-indigo-100/60' : ''}`}>
            <UsersRound className="h-4 w-4" />
            {open && <span>Manage Accounts</span>}
          </div>
        </Link>
        <Link to="/ceo/reports" className="block">
          <div className={`flex items-center gap-3 rounded-md px-3 py-2 hover:bg-indigo-100/60 ${path.includes('/ceo/reports') ? 'bg-indigo-100/60' : ''}`}>
            <FileText className="h-4 w-4" />
            {open && <span>Reports</span>}
          </div>
        </Link>
        <Link to="/ceo/forecasting" className="block">
          <div className={`flex items-center gap-3 rounded-md px-3 py-2 hover:bg-indigo-100/60 ${path.includes('/ceo/forecasting') ? 'bg-indigo-100/60' : ''}`}>
            <TrendingUp className="h-4 w-4" />
            {open && <span>Forecasting</span>}
          </div>
        </Link>
        <Link to="/ceo/outbox" className="block">
          <div className={`flex items-center gap-3 rounded-md px-3 py-2 hover:bg-indigo-100/60 ${path.includes('/ceo/outbox') ? 'bg-indigo-100/60' : ''}`}>
            <Send className="h-4 w-4" />
            {open && <span>Outbox</span>}
          </div>
        </Link>
      </nav>
    </aside>
  );
}

