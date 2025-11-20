import { useState } from "react";
import { LogOut, MessageSquare } from "lucide-react";
import NotificationBell from "./NotificationBell";
import MessagesPanel from "./MessagesPanel";
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
  const [hasMessages] = useState(true);
  const [messagesOpen, setMessagesOpen] = useState(false);
  
  return (
    <header className="sticky top-0 z-10 border-b border-[#0066FF]/20 shadow-sm bg-white/80 backdrop-blur-md transition-all duration-200 ease-in-out">
      {/* Primary accent line */}
      <div className="h-0.5 bg-gradient-to-r from-[#0066FF] via-[#3572EF] to-[#0066FF]"></div>
      
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        {/* Right section: Name and Position */}
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 animate-pulse shadow-sm shadow-indigo-500/50"></div>
          <Link to="/profile" className="leading-tight group">
            <div className="text-base sm:text-lg font-semibold text-slate-800 group-hover:text-[#0066FF] transition-all duration-200 ease-in-out cursor-pointer">
              {name}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 group-hover:text-slate-600 transition-colors duration-200">{role}</div>
          </Link>
        </div>

        {/* Soft divider */}
        <div className="hidden sm:block h-6 w-px bg-gradient-to-b from-transparent via-indigo-200/60 to-transparent" />

        {/* Left section: Messages, Notifications, Logout */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button 
            onClick={() => setMessagesOpen(true)}
            aria-label="Messages" 
            className="relative rounded-lg p-2 text-slate-600 hover:text-[#0066FF] hover:bg-blue-50/80 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          >
            <MessageSquare className="h-5 w-5 transition-transform duration-200" />
            {hasMessages && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#0066FF] ring-2 ring-white"></span>
            )}
          </button>
          <NotificationBell />
          <button className="flex items-center gap-2 rounded-lg border border-slate-200/60 bg-white/80 backdrop-blur-sm px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:shadow-sm hover:border-[#0066FF]/20 hover:text-[#0066FF] transition-all duration-200 ease-in-out hover:scale-105 active:scale-95">
            <LogOut className="h-4 w-4 transition-transform duration-200" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <MessagesPanel 
        isOpen={messagesOpen} 
        onClose={() => setMessagesOpen(false)}
      />
    </header>
  );
}
