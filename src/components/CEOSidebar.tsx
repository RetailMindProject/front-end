import { Menu, LayoutDashboard, UsersRound, FileText, TrendingUp, Send } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function CEOSidebar({ open, onToggle }: { 
  open: boolean; 
  onToggle: () => void;
}) {
  const location = useLocation();
  const path = location.pathname;
  
  const navItems = [
    { to: "/ceo", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: "/ceo/manage-accounts", label: "Manage Accounts", icon: <UsersRound className="h-4 w-4" /> },
    { to: "/ceo/reports", label: "Reports", icon: <FileText className="h-4 w-4" /> },
    { to: "/ceo/forecasting", label: "Forecasting", icon: <TrendingUp className="h-4 w-4" /> },
    { to: "/ceo/outbox", label: "Outbox", icon: <Send className="h-4 w-4" /> },
  ];
  
  return (
    <aside className={`${open ? "w-64" : "w-16"} sticky top-0 h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 border-r border-indigo-200/50 transition-all duration-300 ease-in-out shadow-lg relative flex flex-col`}>
      <div className="pointer-events-none absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_2px_2px,_indigo_500_1px,_transparent_0)] bg-[length:40px_40px]"></div>
      
      {/* Header */}
      <div className={`relative border-b border-indigo-200/30 ${open ? "flex items-center justify-between px-3 py-4" : "flex flex-col items-center px-2 py-3 gap-2"}`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center ring-2 ring-blue-400/30">
            <img 
              src="/picture/retalmind%20(3).jpeg" 
              alt="RetailMind" 
              className="h-9 w-9 rounded-full object-cover"
            />
          </div>
          <span className={`font-bold text-white transition-opacity duration-300 ${open ? "opacity-100 block" : "opacity-0 hidden"}`}>RetailMind</span>
        </div>
        <button 
          onClick={onToggle} 
          className="rounded-lg p-2 hover:bg-slate-800 transition-colors" 
          aria-label="Toggle Sidebar"
        >
          <Menu className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 px-2 py-2 text-sm overflow-y-auto">
        {navItems.map((item) => {
          // Normalize pathname (remove trailing slash)
          const normalizedPath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
          const normalizedLink = item.to.endsWith('/') && item.to.length > 1 ? item.to.slice(0, -1) : item.to;
          
          // Check if it's the exact match
          const isExactMatch = normalizedPath === normalizedLink;
          
          // Check if it's a nested route (pathname starts with link.to + '/')
          const isNestedMatch = normalizedPath.startsWith(normalizedLink + '/');
          
          // Find if there's a more specific (longer) link that matches better
          const hasMoreSpecificMatch = navItems.some(otherItem => {
            const otherNormalized = otherItem.to.endsWith('/') && otherItem.to.length > 1 ? otherItem.to.slice(0, -1) : otherItem.to;
            return otherNormalized !== normalizedLink && 
                   (normalizedPath === otherNormalized || normalizedPath.startsWith(otherNormalized + '/')) &&
                   otherNormalized.length > normalizedLink.length;
          });
          
          // A link is active if:
          // 1. It's an exact match, OR
          // 2. It's a nested match AND there's no more specific link that matches
          const isActive = isExactMatch || (isNestedMatch && !hasMoreSpecificMatch);
          
          return (
            <Link key={item.to} to={item.to} className="block mb-1">
              <div className={`relative flex items-center ${open ? 'gap-3 px-3 py-2.5' : 'justify-center px-2 py-2'} rounded-lg transition-all duration-200 ease-in-out group ${
                isActive 
                  ? 'bg-gray-600 text-white' 
                  : 'hover:bg-gray-200 text-gray-700'
              }`}>
                {/* Active left accent */}
                {isActive && open && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-white/40"></div>
                )}
                <span className={`h-4 w-4 flex-shrink-0 transition-all duration-200 ${isActive ? 'text-white scale-110' : 'text-slate-700 group-hover:scale-105 group-hover:text-[#0066FF]'}`}>
                  {item.icon}
                </span>
                <span className={`truncate ${isActive ? 'font-semibold text-white' : 'text-gray-700'} ${open ? 'opacity-100' : 'opacity-0 hidden'}`}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer section with version */}
      <div className="border-t border-gray-300 px-3 py-4 mt-auto">
        <div className={`transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-xs text-gray-600 text-center">
            RetailMind POS
          </p>
          <p className="text-[10px] text-gray-500 text-center mt-1">
            v1.0.0 © 2023
          </p>
        </div>
      </div>
    </aside>
  );
}

