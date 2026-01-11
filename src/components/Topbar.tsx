import { useState, useEffect } from "react";
import { LogOut, MessageSquare, UserCheck } from "lucide-react";
import NotificationBell from "./NotificationBell";
import MessagesPanel from "./MessagesPanel";
import { Link, useLocation } from "react-router-dom";
import { getUserDisplayName, getUserInfo, getCurrentRole } from "../services/tokens";
import { logout } from "../services/auth.api";
import { messagesApi } from "../services/messages.api";
import { terminalApi } from "../services/terminal.api";

function useRoleHeader() {
  useLocation(); // Keep for potential future use
  const userInfo = getUserInfo();
  const currentRole = getCurrentRole();
  
  // Get user name from stored info or JWT token
  const userName = getUserDisplayName();
  
  // Get role display name
  let roleDisplayName = "Dashboard";
  if (currentRole === "CEO") {
    roleDisplayName = "CEO";
  } else if (currentRole === "STORE_MANAGER") {
    roleDisplayName = "Store Manager";
  } else if (currentRole === "INVENTORY_MANAGER") {
    roleDisplayName = "Inventory Manager";
  } else if (userInfo) {
    // Fallback to role from userInfo
    if (userInfo.role === "CEO") {
      roleDisplayName = "CEO";
    } else if (userInfo.role === "STORE_MANAGER") {
      roleDisplayName = "Store Manager";
    } else if (userInfo.role === "INVENTORY_MANAGER") {
      roleDisplayName = "Inventory Manager";
    }
  }
  
  return { role: roleDisplayName, name: userName };
}

export default function Topbar() {
  const { role, name } = useRoleHeader();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [pendingPairingRequests, setPendingPairingRequests] = useState(0);
  const currentRole = getCurrentRole();
  const isStoreManager = currentRole === 'STORE_MANAGER' || currentRole === 'CEO';

  useEffect(() => {
    const loadUnreadCount = async () => {
      const result = await messagesApi.getUnreadCount();
      if (result.data !== undefined) {
        setUnreadCount(result.data);
      }
    };

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isStoreManager) return;

    const loadPendingRequests = async () => {
      const result = await terminalApi.getPendingPairingRequests();
      if (result.data) {
        setPendingPairingRequests(result.data.length);
      }
    };

    loadPendingRequests();
    const interval = setInterval(loadPendingRequests, 5000);
    
    return () => clearInterval(interval);
  }, [isStoreManager]);
  
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

        {/* Left section: Messages, Pairing Requests, Notifications, Logout */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button 
            onClick={() => setMessagesOpen(true)}
            aria-label="Messages" 
            className="relative rounded-lg p-2 text-slate-600 hover:text-[#0066FF] hover:bg-blue-50/80 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          >
            <MessageSquare className="h-5 w-5 transition-transform duration-200" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#0066FF] text-[10px] text-white font-semibold ring-2 ring-white shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {isStoreManager && (
            <Link
              to="/store-manager/pairing-requests"
              aria-label="Pairing Requests"
              className={`relative rounded-lg p-2 text-slate-600 hover:text-[#0066FF] hover:bg-blue-50/80 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 ${
                location.pathname === "/store-manager/pairing-requests" ? "text-[#0066FF] bg-blue-50/80" : ""
              }`}
            >
              <UserCheck className="h-5 w-5 transition-transform duration-200" />
              {pendingPairingRequests > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-orange-500 text-[10px] text-white font-semibold ring-2 ring-white shadow-sm">
                  {pendingPairingRequests > 9 ? "9+" : pendingPairingRequests}
                </span>
              )}
            </Link>
          )}
          <NotificationBell />
          <button 
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-slate-200/60 bg-white/80 backdrop-blur-sm px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:shadow-sm hover:border-[#0066FF]/20 hover:text-[#0066FF] transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
          >
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
