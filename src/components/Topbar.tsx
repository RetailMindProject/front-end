import { useState, useEffect } from "react";
import { LogOut, MessageSquare } from "lucide-react";
import NotificationBell from "./NotificationBell";
import MessagesPanel from "./MessagesPanel";
import { getMockMessages } from "./messages/utils";
import type { Message } from "./messages/types";
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
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Show messages only for Store Manager
  const showMessages = role === "Store Manager";

  useEffect(() => {
    if (showMessages) {
      setMessages(getMockMessages());
    }
  }, [showMessages]);

  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <>
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
            {showMessages && (
              <button
                onClick={() => setMessagesOpen(true)}
                aria-label="Messages"
                className="relative rounded-lg p-2 text-slate-600 hover:text-indigo-700 hover:bg-white transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-red-600 text-[10px] font-medium text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}
            <NotificationBell />
            <button className="flex items-center gap-2 rounded-lg border border-slate-200/60 bg-white/60 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:shadow-sm transition-all">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {showMessages && (
        <MessagesPanel 
          isOpen={messagesOpen} 
          onClose={() => setMessagesOpen(false)}
          onMessagesChange={setMessages}
        />
      )}
    </>
  );
}
