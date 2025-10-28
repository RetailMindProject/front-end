import React from "react";
import { Menu, LayoutDashboard, UsersRound, FileText, TrendingUp } from "lucide-react";
import SideLink from "./SideLink";

export default function CEOSidebar({ open, onToggle, onNavigate }: { 
  open: boolean; 
  onToggle: () => void;
  onNavigate?: (page: string) => void;
}) {
  const activePage = 'dashboard'; // This will be managed by parent
  
  return (
    <aside className={`${open ? "w-64" : "w-16"} sticky top-0 h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 border-r border-indigo-200/50 transition-all shadow-lg`}>
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_2px_2px,_indigo_500_1px,_transparent_0)] bg-[length:40px_40px]"></div>
      
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
        <SideLink 
          icon={<LayoutDashboard className="h-4 w-4" />} 
          label="Dashboard" 
          open={open} 
          active={activePage === 'dashboard'}
          onClick={() => onNavigate?.('dashboard')}
        />
        <SideLink 
          icon={<UsersRound className="h-4 w-4" />} 
          label="Manage Accounts" 
          open={open} 
          active={activePage === 'manage-accounts'}
          onClick={() => onNavigate?.('manage-accounts')}
        />
        <SideLink 
          icon={<FileText className="h-4 w-4" />} 
          label="Reports" 
          open={open} 
          active={activePage === 'reports'}
          onClick={() => onNavigate?.('reports')}
        />
        <SideLink 
          icon={<TrendingUp className="h-4 w-4" />} 
          label="Forecasting" 
          open={open} 
          active={activePage === 'forecasting'}
          onClick={() => onNavigate?.('forecasting')}
        />
      </nav>
    </aside>
  );
}

