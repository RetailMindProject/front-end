import React, { useMemo } from "react";
import { Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export type SidebarLink = {
  to: string;
  label: string;
  icon: React.ReactNode;
  section?: string;
};

export default function Sidebar({
  open,
  onToggle,
  links,
}: {
  open: boolean;
  onToggle: () => void;
  links: SidebarLink[];
}) {
  const { pathname } = useLocation();

  const grouped = useMemo(() => {
    const map = new Map<string, SidebarLink[]>();
    const order: string[] = [];

    links.forEach((l) => {
      const section = l.section?.trim() || "Navigation";
      if (!map.has(section)) {
        map.set(section, []);
        order.push(section);
      }
      map.get(section)!.push(l);
    });

    return order.map((section) => ({ section, links: map.get(section)! }));
  }, [links]);
  
  return (
    <aside
      className={`${open ? "w-64" : "w-16"} sticky top-0 h-screen bg-white/90 backdrop-blur-xl border-r border-slate-200/60 transition-all duration-300 ease-in-out shadow-md relative flex flex-col`}
    >
      {/* Decorative background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_2px_2px,_rgb(37_99_235)_1px,_transparent_0)] bg-[length:44px_44px]" />
      
      {/* Header */}
      <div
        className={`relative border-b border-slate-200/60 ${
          open ? "flex items-center justify-between px-3 py-4" : "flex flex-col items-center px-2 py-3 gap-2"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center ring-2 ring-blue-400/25 shadow-sm">
            <img 
              src="/picture/retalmind%20(3).jpeg" 
              alt="RetailMind" 
              className="h-9 w-9 rounded-lg object-cover"
            />
          </div>
          <span
            className={`font-extrabold tracking-tight text-slate-900 transition-opacity duration-300 ${
              open ? "opacity-100 block" : "opacity-0 hidden"
            }`}
          >
            RetailMind
          </span>
        </div>
        <button 
          onClick={onToggle} 
          className="rounded-lg p-2 hover:bg-slate-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
          aria-label="Toggle Sidebar"
        >
          <Menu className="h-5 w-5 text-slate-700" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 px-2 py-2 text-sm overflow-y-auto">
        {grouped.map((group) => (
          <div key={group.section} className="mb-3">
            {open && (
              <div className="px-3 pt-3 pb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {group.section}
              </div>
            )}

            {group.links.map((link) => {
              // Normalize pathname (remove trailing slash)
              const normalizedPath = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
              const normalizedLink = link.to.endsWith("/") && link.to.length > 1 ? link.to.slice(0, -1) : link.to;

              // Check if it's the exact match
              const isExactMatch = normalizedPath === normalizedLink;

              // Check if it's a nested route (pathname starts with link.to + '/')
              const isNestedMatch = normalizedPath.startsWith(normalizedLink + "/");

              // Find if there's a more specific (longer) link that matches better
              const hasMoreSpecificMatch = links.some((otherLink) => {
                const otherNormalized =
                  otherLink.to.endsWith("/") && otherLink.to.length > 1 ? otherLink.to.slice(0, -1) : otherLink.to;
                return (
                  otherNormalized !== normalizedLink &&
                  (normalizedPath === otherNormalized || normalizedPath.startsWith(otherNormalized + "/")) &&
                  otherNormalized.length > normalizedLink.length
                );
              });

              const isActive = isExactMatch || (isNestedMatch && !hasMoreSpecificMatch);

              return (
                <Link key={link.to} to={link.to} className="block mb-1 group/link" title={!open ? link.label : undefined}>
                  <div
                    className={`relative flex items-center ${
                      open ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2"
                    } rounded-lg transition-all duration-200 group ${
                      isActive
                        ? "bg-blue-50 text-slate-900 border border-blue-100 shadow-sm font-semibold"
                        : "text-slate-700 hover:bg-slate-100/70 hover:shadow-sm"
                    } focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:ring-offset-2`}
                  >
                    {/* Active left accent */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-blue-500" />
                    )}

                    <span
                      className={`h-4 w-4 flex-shrink-0 transition-all duration-200 ${
                        isActive ? "text-blue-600" : "text-slate-600 group-hover:text-blue-600 group-hover:scale-105"
                      }`}
                    >
                      {link.icon}
                    </span>

                    <span className={`truncate ${open ? "opacity-100" : "opacity-0 hidden"}`}>{link.label}</span>

                    {/* Tooltip (collapsed) */}
                    {!open && (
                      <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 opacity-0 group-hover/link:opacity-100 transition-all duration-200 shadow-lg">
                        {link.label}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer section with version */}
      <div className="border-t border-slate-200/60 px-3 py-4 mt-auto bg-gradient-to-b from-white/40 to-white/80">
        <div className={`transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}>
          <p className="text-xs text-slate-600 text-center font-semibold">RetailMind POS</p>
          <p className="text-[10px] text-slate-400 text-center mt-1">v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
