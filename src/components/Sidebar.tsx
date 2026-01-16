import React from "react";
import { Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar({ open, onToggle, links }: { 
  open: boolean; 
  onToggle: () => void;
  links: { to: string; label: string; icon: React.ReactNode }[];
}) {
  const { pathname } = useLocation();
  
  return (
    <aside className={`${open ? "w-64" : "w-16"} sticky top-0 h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 border-r border-indigo-200/50 transition-all duration-300 ease-in-out shadow-lg relative flex flex-col`}>
      {/* Decorative background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_2px_2px,_indigo_500_1px,_transparent_0)] bg-[length:40px_40px]"></div>
      
      {/* Header */}
      <div className={`relative border-b border-indigo-200/30 ${open ? "flex items-center justify-between px-3 py-4" : "flex flex-col items-center px-2 py-3 gap-2"}`}>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg ring-2 ring-white/20 transition-transform duration-200 hover:scale-105">
            <img 
              src="/picture/retalmind%20(3).jpeg" 
              alt="RetailMind" 
              className="h-9 w-9 rounded-lg"
            />
          </div>
          <span className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 transition-opacity duration-300 ${open ? "opacity-100 block" : "opacity-0 hidden"}`}>RetailMind</span>
        </div>
        <button 
          onClick={onToggle} 
          className="rounded-lg p-2 hover:bg-indigo-100/50 hover:scale-105 active:scale-95 transition-all duration-200 ease-in-out" 
          aria-label="Toggle Sidebar"
        >
          <Menu className="h-5 w-5 text-indigo-600 transition-transform duration-200" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 px-2 py-2 text-sm overflow-y-auto">
        {links.map((link) => {
          // Normalize pathname (remove trailing slash)
          const normalizedPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
          const normalizedLink = link.to.endsWith('/') && link.to.length > 1 ? link.to.slice(0, -1) : link.to;
          
          // Check if it's the exact match
          const isExactMatch = normalizedPath === normalizedLink;
          
          // Check if it's a nested route (pathname starts with link.to + '/')
          const isNestedMatch = normalizedPath.startsWith(normalizedLink + '/');
          
          // Find if there's a more specific (longer) link that matches better
          const hasMoreSpecificMatch = links.some(otherLink => {
            const otherNormalized = otherLink.to.endsWith('/') && otherLink.to.length > 1 ? otherLink.to.slice(0, -1) : otherLink.to;
            return otherNormalized !== normalizedLink && 
                   (normalizedPath === otherNormalized || normalizedPath.startsWith(otherNormalized + '/')) &&
                   otherNormalized.length > normalizedLink.length;
          });
          
          // A link is active if:
          // 1. It's an exact match, OR
          // 2. It's a nested match AND there's no more specific link that matches
          const isActive = isExactMatch || (isNestedMatch && !hasMoreSpecificMatch);
          
          return (
            <Link key={link.to} to={link.to} className="block mb-1">
              <div className={`relative flex items-center ${open ? 'gap-3 px-3 py-2.5' : 'justify-center px-2 py-2'} rounded-lg transition-all duration-200 ease-in-out group ${
                isActive 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-md shadow-blue-500/30' 
                  : 'hover:bg-indigo-100/60 text-slate-700 hover:shadow-sm'
              } focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2`}>
                {/* Active left accent */}
                {isActive && open && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-white/40 transition-all duration-200"></div>
                )}
                <span className={`h-4 w-4 flex-shrink-0 transition-all duration-200 ${isActive ? 'text-white scale-110' : 'text-slate-700 group-hover:scale-110 group-hover:text-[#0066FF] group-hover:rotate-3'}`}>
                  {link.icon}
                </span>
                <span className={`truncate transition-all duration-300 ${isActive ? 'font-semibold text-white' : 'group-hover:text-indigo-700 group-hover:translate-x-0.5'} ${open ? 'opacity-100' : 'opacity-0 hidden'}`}>
                  {link.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer section with version */}
      <div className="relative border-t border-indigo-200/30 px-3 py-4 mt-auto">
        <div className={`transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-xs text-slate-500 text-center">
            RetailMind POS
          </p>
          <p className="text-[10px] text-slate-400 text-center mt-1">
            v1.0.0 © 2025
          </p>
        </div>
      </div>
    </aside>
  );
}
