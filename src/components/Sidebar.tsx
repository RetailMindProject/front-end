import React from "react";
import { Menu, Package, UsersRound, Settings, LineChart as LineChartIcon, LayoutDashboard } from "lucide-react";
import SideLink from "./SideLink";

export default function Sidebar({ open, onToggle, onNavigate }: { 
  open: boolean; 
  onToggle: () => void;
  onNavigate?: (page: string) => void;
}) {
  return (
    <aside className={`${open ? "w-64" : "w-16"} sticky top-0 h-screen border-r border-blue-200 bg-blue-50/50 transition-all`}>
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg">
            <img 
              src="/picture/retalmind%20(3).jpeg" 
              alt="RetailMind" 
              className="h-8 w-8 rounded-lg"
            />
          </div>
          <span className={`font-semibold text-blue-800 ${open ? "block" : "hidden"}`}>RetailMind</span>
        </div>
        <button onClick={onToggle} className="rounded p-1 hover:bg-blue-100" aria-label="Toggle Sidebar">
          <Menu className="h-5 w-5 text-blue-800" />
        </button>
      </div>

      <nav className="px-2 py-2 text-sm">
        <SideLink 
          icon={<LayoutDashboard className="h-4 w-4" />} 
          label="Dashboard" 
          open={open} 
          active 
          onClick={() => onNavigate?.('dashboard')}
        />
        <SideLink 
          icon={<Package className="h-4 w-4" />} 
          label="Products" 
          open={open} 
          onClick={() => onNavigate?.('products')}
        />
        <SideLink 
          icon={<Package className="h-4 w-4" />} 
          label="Store Operations" 
          open={open} 
          onClick={() => onNavigate?.('operations')}
        />
        <SideLink 
          icon={<LineChartIcon className="h-4 w-4" />} 
          label="Sessions" 
          open={open} 
          onClick={() => onNavigate?.('sessions')}
        />
        <SideLink 
          icon={<UsersRound className="h-4 w-4" />} 
          label="Cashiers" 
          open={open} 
          onClick={() => onNavigate?.('cashiers')}
        />
        <SideLink 
          icon={<Settings className="h-4 w-4" />} 
          label="Settings" 
          open={open} 
          onClick={() => onNavigate?.('settings')}
        />
      </nav>
    </aside>
  );
}
