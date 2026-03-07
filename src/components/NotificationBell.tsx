import { useEffect, useMemo, useState } from "react";
import { Bell, MessageSquare, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { messagesApi } from "../services/messages.api";
import { terminalApi, type PairingRequestResponse } from "../services/terminal.api";
import { transferRequestsApi, type TransferRequestDTO } from "../services/transfer-requests.api";
import { getCurrentRole } from "../services/tokens";
import type { Message } from "./messages/types";

type NotificationItem = 
  | { type: "message"; data: Message }
  | { type: "pairing_request"; data: PairingRequestResponse; read: boolean }
  | { type: "transfer_request"; data: TransferRequestDTO };

export default function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pairingRequests, setPairingRequests] = useState<PairingRequestResponse[]>([]);
  const [transferRequests, setTransferRequests] = useState<TransferRequestDTO[]>([]);
  const [readPairingRequests, setReadPairingRequests] = useState<Set<number>>(new Set());
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const basePath = pathname.split("/").slice(0, 2).join("/");
  const currentRole = getCurrentRole();
  const isStoreManagerOrCEO = currentRole === "STORE_MANAGER" || currentRole === "CEO";
  const isInventoryManager = currentRole === "INVENTORY_MANAGER";

  // Check if message is Low Stock alert
  const isLowStockAlert = (msg: Message): boolean => {
    return msg.title === "Low stock alert" || msg.message.includes("[LOW_STOCK]");
  };

  // Check if message is unread
  const isUnread = (msg: Message): boolean => {
    return msg.status === "SENT" && msg.readAt == null;
  };

  // Check if message is Transfer Request
  const isTransferRequest = (msg: Message): boolean => {
    return msg.title === "TRANSFER_REQUEST" || 
           msg.message.includes("[TRANSFER_REQUEST]") || 
           msg.message.includes("/requestId");
  };

  // Calculate unread Low Stock count for badge
  const unreadLowStockCount = useMemo(() => {
    return messages.filter(msg => isLowStockAlert(msg) && isUnread(msg) && !isTransferRequest(msg)).length;
  }, [messages]);

  // Calculate pending transfer requests count for badge (Inventory Manager only)
  const pendingTransferRequestsCount = useMemo(() => {
    if (!isInventoryManager) return 0;
    return transferRequests.filter(req => req.status === "PENDING").length;
  }, [transferRequests, isInventoryManager]);

  // Total badge count: Low Stock + Transfer Requests
  const totalBadgeCount = useMemo(() => {
    return unreadLowStockCount + pendingTransferRequestsCount;
  }, [unreadLowStockCount, pendingTransferRequestsCount]);

  // Get unread Low Stock alerts for dropdown (top 5, excluding transfer requests)
  const unreadLowStockAlerts = useMemo(() => {
    return messages
      .filter(msg => isLowStockAlert(msg) && isUnread(msg) && !isTransferRequest(msg))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [messages]);

  // Get pending transfer requests for dropdown (top 5)
  const pendingTransferRequests = useMemo(() => {
    if (!isInventoryManager) return [];
    return transferRequests
      .filter(req => req.status === "PENDING")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [transferRequests, isInventoryManager]);

  // Load read pairing requests from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("readPairingRequests");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as number[];
        setReadPairingRequests(new Set(parsed));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const loadMessages = async () => {
    const res = await messagesApi.getInboxMessages();
    // Default to empty array if data is undefined/null
    setMessages(res.data ?? []);
  };

  const loadPairingRequests = async () => {
    if (!isStoreManagerOrCEO) return;
    
    const result = await terminalApi.getPendingPairingRequests();
    const list = result.data ?? [];
    setPairingRequests(list);
    
    // Clean up read IDs for requests that no longer exist (approved/rejected/expired)
    const currentRequestIds = new Set(list.map(req => req.id));
    const stored = localStorage.getItem("readPairingRequests");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as number[];
        const validReadIds = parsed.filter(id => currentRequestIds.has(id));
        if (validReadIds.length !== parsed.length) {
          localStorage.setItem("readPairingRequests", JSON.stringify(validReadIds));
          setReadPairingRequests(new Set(validReadIds));
        }
      } catch {
        // Ignore parse errors
      }
    }
  };

  const loadTransferRequests = async () => {
    if (!isInventoryManager) return;
    
    const result = await transferRequestsApi.getPending();
    const list = result.data ?? [];
    setTransferRequests(list);
  };

  const load = async () => {
    await Promise.all([loadMessages(), loadPairingRequests(), loadTransferRequests()]);
  };

  // Load pairing requests in background for unread count (even when dropdown is closed)
  useEffect(() => {
    if (!isStoreManagerOrCEO) return;
    loadPairingRequests();
    const interval = window.setInterval(loadPairingRequests, 5000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStoreManagerOrCEO]);

  // Load transfer requests in background for unread count (Inventory Manager only)
  useEffect(() => {
    if (!isInventoryManager) return;
    loadTransferRequests();
    const interval = window.setInterval(loadTransferRequests, 5000);
    // Listen for transfer requests updates
    const handleUpdate = () => loadTransferRequests();
    window.addEventListener("transfer-requests-updated", handleUpdate);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("transfer-requests-updated", handleUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInventoryManager]);

  // Load all notifications when dropdown opens (do NOT mark as read)
  useEffect(() => {
    if (!open) return;
    load();
    const interval = window.setInterval(load, 5000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Handle Low Stock alert click: mark as read and navigate
  const handleLowStockAlertClick = async (msg: Message) => {
    // Mark as read only on click
    if (isUnread(msg)) {
      try {
        await messagesApi.markAsRead(msg.id);
        // Update local state optimistically
        setMessages(prev =>
          prev.map(m =>
            m.id === msg.id
              ? { ...m, read: true, status: "READ" as const, readAt: new Date().toISOString() }
              : m
          )
        );
        // Dispatch event to refresh counts
        window.dispatchEvent(new Event("messages-updated"));
      } catch (err) {
        console.error("Failed to mark message as read:", err);
      }
    }
    
    // Navigate to message details in notification mode for low stock alerts
    setOpen(false);
    const isLowStock = isLowStockAlert(msg);
    if (isLowStock) {
      navigate(`${basePath}/message/${msg.id}?mode=notification`);
    } else {
      navigate(`${basePath}/message/${msg.id}`);
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handlePairingRequestClick = (requestId: number) => {
    // Mark as read
    const newRead = new Set(readPairingRequests);
    newRead.add(requestId);
    setReadPairingRequests(newRead);
    localStorage.setItem("readPairingRequests", JSON.stringify(Array.from(newRead)));
    
    // Navigate to pairing requests page
    setOpen(false);
    navigate(`${basePath}/pairing-requests`);
  };

  const handleTransferRequestClick = (requestId: number | undefined) => {
    // Only navigate if requestId exists
    if (!requestId) return;
    // Navigate to transfer request details
    setOpen(false);
    navigate(`${basePath}/inventory/transfer-requests/${requestId}`);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen((v) => !v)} 
        className="relative rounded-lg p-2 text-slate-700 hover:bg-slate-100 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" 
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 transition-transform duration-200" />
        {totalBadgeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#0066FF] text-[10px] text-white font-semibold ring-2 ring-white shadow-sm animate-pulse hover:animate-none hover:scale-125 transition-transform duration-200">
            {totalBadgeCount > 9 ? "9+" : totalBadgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[100] mt-2 w-80 rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-md p-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="mb-2 px-2 py-1.5 text-sm font-semibold text-slate-800 border-b border-slate-100">Notifications</div>
          <ul className="max-h-72 divide-y divide-slate-100 overflow-auto">
            {/* Transfer Requests (Inventory Manager only) */}
            {isInventoryManager && pendingTransferRequests.length > 0 && (
              <>
                {pendingTransferRequests.map((req) => {
                  const items = req.items ?? [];
                  const totalItems = items.length;
                  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
                  const timeStr = req.requestedAt ? formatTimestamp(req.requestedAt) : "-";
                  const requesterDisplay = req.requesterName || "Unknown Requester";
                  
                  return (
                    <li
                      key={`transfer-${req.requestId}`}
                      className="px-2 py-2.5 text-sm hover:bg-blue-50/50 rounded-lg transition-all duration-200 cursor-pointer group border-l-2 border-blue-500 bg-blue-50/30"
                      onClick={() => handleTransferRequestClick(req.requestId)}
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <ArrowRightLeft className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-blue-900 group-hover:text-blue-700 transition-colors duration-200">
                              Transfer Request
                            </span>
                            <span className="text-xs text-blue-600 group-hover:text-blue-700 transition-colors duration-200">{timeStr}</span>
                          </div>
                          <div className="text-blue-700 mb-1 group-hover:text-blue-800 transition-colors duration-200 line-clamp-2 text-xs">
                            New transfer request from {requesterDisplay} – {totalItems} {totalItems === 1 ? "item" : "items"}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </>
            )}
            {/* Low Stock Alerts */}
            {unreadLowStockAlerts.length > 0 && (
              <>
                {unreadLowStockAlerts.map((msg) => {
                  const shortBody = msg.message.length > 100 
                    ? msg.message.substring(0, 100) + '...' 
                    : msg.message;
                  const timeStr = formatTimestamp(msg.createdAt);
                  
                  return (
                    <li 
                      key={`lowstock-${msg.id}`} 
                      className="px-2 py-2.5 text-sm hover:bg-red-50/50 rounded-lg transition-all duration-200 cursor-pointer group border-l-2 border-red-400 bg-red-50/30"
                      onClick={() => handleLowStockAlertClick(msg)}
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-red-900 group-hover:text-red-700 transition-colors duration-200">{msg.title}</span>
                            <span className="text-xs text-red-600 group-hover:text-red-700 transition-colors duration-200">{timeStr}</span>
                          </div>
                          <div className="text-red-700 mb-1 group-hover:text-red-800 transition-colors duration-200 line-clamp-2 text-xs">{shortBody}</div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </>
            )}
            {/* Pairing Requests */}
            {pairingRequests.filter(req => !readPairingRequests.has(req.id)).length > 0 && (
              <>
                {pairingRequests
                  .filter(req => !readPairingRequests.has(req.id))
                  .map((req) => {
                    const isUnread = !readPairingRequests.has(req.id);
                    const cashierName = req.requestedByName && req.requestedByName.trim() && req.requestedByName.trim() !== "Unknown"
                      ? req.requestedByName.trim()
                      : "Cashier";
                    
                    return (
                      <li 
                        key={`pairing-${req.id}`} 
                        className={`px-2 py-2.5 text-sm hover:bg-blue-50/50 rounded-lg transition-all duration-200 cursor-pointer group border-l-2 ${
                          isUnread ? "border-blue-500 bg-blue-50/30" : "border-transparent hover:border-blue-400"
                        }`}
                        onClick={() => handlePairingRequestClick(req.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-semibold ${isUnread ? "text-blue-700" : "text-slate-800"} group-hover:text-blue-700 transition-colors duration-200`}>
                            Terminal Pairing Request
                            {isUnread && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500"></span>}
                          </span>
                          <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors duration-200">
                            {formatTimestamp(req.issuedAt)}
                          </span>
                        </div>
                        <div className={`mb-1 group-hover:text-slate-700 transition-colors duration-200 ${isUnread ? "text-slate-700 font-medium" : "text-slate-600"}`}>
                          {cashierName} requested pairing with terminal {req.terminalCode}
                        </div>
                      </li>
                    );
                  })}
              </>
            )}
            {unreadLowStockAlerts.length === 0 && 
             pairingRequests.filter(req => !readPairingRequests.has(req.id)).length === 0 &&
             pendingTransferRequests.length === 0 && (
              <li className="px-3 py-8 text-center text-sm text-slate-500">No notifications</li>
            )}
          </ul>
          <div className="px-2 pt-2 mt-2 border-t border-slate-100 text-right">
            <button
              onClick={() => {
                setOpen(false);
                navigate(`${basePath}/message-box`);
              }}
              className="inline-flex items-center gap-2 text-sm text-[#0066FF] hover:text-[#3572EF] font-semibold hover:underline transition-colors duration-200"
            >
              <MessageSquare className="h-4 w-4" />
              View Message Box
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
