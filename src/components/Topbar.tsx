import { useState, useEffect } from "react";
import { LogOut, MessageSquare, User, ChevronDown } from "lucide-react";
import NotificationBell from "./NotificationBell";
import MessagesPanel from "./MessagesPanel";
import { Link, useLocation } from "react-router-dom";
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

  useEffect(() => {
    // Don't load unread count for CASHIER role (endpoint requires JWT)
    if (currentRole === 'CASHIER') {
      return;
    }

    const loadUnreadCount = async () => {
      const result = await messagesApi.getUnreadCount();
      if (result.data !== undefined) {
        setUnreadCount(result.data);
      }
    };

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [currentRole]);

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
    <header className="sticky top-0 z-10 bg-slate-900 shadow-md">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        {/* Left: User Name (Clickable to Profile) */}
        <div className="flex items-center gap-3">
          <Link 
            to="/profile"
            className="text-white font-medium text-sm hover:text-slate-300 transition-colors cursor-pointer"
          >
            {userName}
          </Link>
        </div>

        {/* Right: Icons + User Avatar */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMessagesOpen(true)}
            aria-label="Messages" 
            className="relative p-2 text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <MessageSquare className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[10px] text-white font-semibold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button 
            className="p-2 text-white hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="User"
          >
            <User className="h-5 w-5" />
          </button>
          <NotificationBell />
          <div className="relative user-menu-container">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <img
                src={getAvatarImage()}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border-2 border-white/30"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `${window.location.origin}/picture/ceo.png`;
                }}
              />
              <ChevronDown className="h-4 w-4 text-white" />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <Link
                  to="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <MessagesPanel 
        isOpen={messagesOpen} 
        onClose={() => setMessagesOpen(false)}
      />
    </header>
  );
}
