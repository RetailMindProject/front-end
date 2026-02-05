import { useCallback, useEffect, useMemo, useState } from "react";
import { LogOut, MessageSquare, ChevronDown } from "lucide-react";
import NotificationBell from "./NotificationBell";
import MessagesPanel from "./MessagesPanel";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getUserInfo, getCurrentRole, getUserDisplayName } from "../services/tokens";
import { logout } from "../services/auth.api";
import { messagesApi } from "../services/messages.api";

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
  const { name: userName } = useRoleHeader();
  const [unreadCount, setUnreadCount] = useState(0);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const currentRole = getCurrentRole();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const basePath = useMemo(() => pathname.split("/").slice(0, 2).join("/"), [pathname]);
  
  // Get avatar image based on role
  const getAvatarImage = (): string => {
    if (currentRole === "CEO") {
      return `${window.location.origin}/picture/ceo.png`;
    } else if (currentRole === "STORE_MANAGER") {
      return `${window.location.origin}/picture/storemanager.png`;
    } else if (currentRole === "INVENTORY_MANAGER") {
      return `${window.location.origin}/picture/inventorymanager.png`;
    }
    return `${window.location.origin}/picture/storemanager.png`; // Default fallback
  };

  const loadUnreadCount = useCallback(async () => {
    // Don't load unread count for CASHIER role (endpoint requires JWT)
    if (currentRole === "CASHIER") return;
    const result = await messagesApi.getUnreadCount();
    if (result.data !== undefined) {
      setUnreadCount(result.data);
    }
  }, [currentRole]);

  useEffect(() => {
    // Don't load unread count for CASHIER role (endpoint requires JWT)
    if (currentRole === 'CASHIER') {
      return;
    }

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 5000);
    const onFocus = () => loadUnreadCount();
    const onUpdated = () => loadUnreadCount();
    window.addEventListener("focus", onFocus);
    window.addEventListener("messages-updated", onUpdated as any);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("messages-updated", onUpdated as any);
    };
  }, [currentRole, loadUnreadCount]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen && !(event.target as Element).closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-200/60">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        {/* Left: Person icon + name */}
          <div className="relative user-menu-container">
            <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-3 rounded-lg hover:bg-slate-100 transition-all duration-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            aria-label="User menu"
            >
              <img
                src={getAvatarImage()}
                alt="Profile"
              className="w-8 h-8 rounded-full object-cover border border-slate-200 ring-1 ring-white"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `${window.location.origin}/picture/ceo.png`;
                }}
              />
            <span className="text-slate-900 font-semibold text-sm sm:text-base">{userName}</span>
            <ChevronDown className={`h-4 w-4 text-slate-700 transition-all duration-200 ${userMenuOpen ? "rotate-180" : "rotate-0"}`} />
            </button>
            {userMenuOpen && (
            <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <Link
                  to="/profile"
                  onClick={() => setUserMenuOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-all duration-200"
                >
                  Profile
                </Link>
              </div>
            )}
          </div>

        {/* Right: Messages + Notifications */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMessagesOpen(true)}
            aria-label="Messages" 
            className="relative p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <MessageSquare className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 px-1 place-items-center rounded-full bg-red-500 text-[10px] text-white font-semibold ring-2 ring-white shadow-sm animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <NotificationBell unreadCount={unreadCount} />

          <button
            onClick={() => logout()}
            aria-label="Logout"
            className="flex items-center gap-2 p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden sm:inline text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>

      <MessagesPanel 
        isOpen={messagesOpen} 
        onClose={() => setMessagesOpen(false)}
        onOpenMessageBox={() => navigate(`${basePath}/message-box`)}
      />
    </header>
  );
}
