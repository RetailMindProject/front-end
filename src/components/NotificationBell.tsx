import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  MessageSquare,
  AlertTriangle,
  ArrowRightLeft,
  Package,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { messagesApi } from "../services/messages.api";
import {
  terminalApi,
  type PairingRequestResponse,
} from "../services/terminal.api";
import {
  transferRequestsApi,
  type TransferRequestDTO,
} from "../services/transfer-requests.api";
import { getCurrentRole } from "../services/tokens";
import type { Message } from "./messages/types";
import {
  forecastAlertsApi,
  type ForecastAlert,
} from "../services/forecastAlerts.api";
import {
  useRestockNotifications,
  markRestockNotificationRead,
  markAllRestockNotificationsRead,
} from "../services/restockNotifications.store";

export default function NotificationBell({
  unreadCount,
}: {
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pairingRequests, setPairingRequests] = useState<
    PairingRequestResponse[]
  >([]);
  const [transferRequests, setTransferRequests] = useState<TransferRequestDTO[]>(
    []
  );
  const [readPairingRequests, setReadPairingRequests] = useState<Set<number>>(
    new Set()
  );
  const [alerts, setAlerts] = useState<ForecastAlert[]>([]);

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const basePath = pathname.split("/").slice(0, 2).join("/");
  const currentRole = getCurrentRole();
  const isStoreManagerOrCEO =
    currentRole === "STORE_MANAGER" || currentRole === "CEO";
  const isInventoryManager = currentRole === "INVENTORY_MANAGER";

  const {
    notifications: restockNotifications,
    unreadCount: restockUnreadCount,
  } = useRestockNotifications();

  const isLowStockAlert = (msg: Message): boolean => {
    return msg.title === "Low stock alert" || msg.message.includes("[LOW_STOCK]");
  };

  const isUnread = (msg: Message): boolean => {
    return msg.status === "SENT" && msg.readAt == null;
  };

  const isTransferRequestMessage = (msg: Message): boolean => {
    return (
      msg.title === "TRANSFER_REQUEST" ||
      msg.message.includes("[TRANSFER_REQUEST]") ||
      msg.message.includes("/requestId")
    );
  };

  const formatTimestamp = (dateString?: string) => {
    if (!dateString) return "-";

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const unreadLowStockCount = useMemo(() => {
    return messages.filter(
      (msg) =>
        isLowStockAlert(msg) && isUnread(msg) && !isTransferRequestMessage(msg)
    ).length;
  }, [messages]);

  const pendingTransferRequestsCount = useMemo(() => {
    if (!isInventoryManager) return 0;
    return transferRequests.filter((req) => req.status === "PENDING").length;
  }, [transferRequests, isInventoryManager]);

  const unreadPairingCount = useMemo(() => {
    if (!isStoreManagerOrCEO) return 0;
    return pairingRequests.filter((req) => !readPairingRequests.has(req.id))
      .length;
  }, [pairingRequests, readPairingRequests, isStoreManagerOrCEO]);

  const inboxPreview = useMemo(() => {
    return messages
      .filter(
        (msg) =>
          !isLowStockAlert(msg) &&
          !isTransferRequestMessage(msg)
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 6);
  }, [messages]);

  const unreadLowStockAlerts = useMemo(() => {
    return messages
      .filter(
        (msg) =>
          isLowStockAlert(msg) &&
          isUnread(msg) &&
          !isTransferRequestMessage(msg)
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [messages]);

  const pendingTransferRequests = useMemo(() => {
    if (!isInventoryManager) return [];
    return transferRequests
      .filter((req) => req.status === "PENDING")
      .sort((a, b) => {
        const aTime = new Date(a.requestedAt ?? a.createdAt ?? 0).getTime();
        const bTime = new Date(b.requestedAt ?? b.createdAt ?? 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [transferRequests, isInventoryManager]);

  const unreadPairingRequests = useMemo(() => {
    if (!isStoreManagerOrCEO) return [];
    return pairingRequests
      .filter((req) => !readPairingRequests.has(req.id))
      .sort(
        (a, b) =>
          new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
      )
      .slice(0, 5);
  }, [pairingRequests, readPairingRequests, isStoreManagerOrCEO]);

  const forecastPreview = useMemo(() => alerts.slice(0, 6), [alerts]);
  const restockPreview = useMemo(
    () => restockNotifications.slice(0, 6),
    [restockNotifications]
  );
  const hasUnreadRestock = useMemo(
    () => restockNotifications.some((n) => !n.read),
    [restockNotifications]
  );

  const totalUnread = useMemo(() => {
    return (
      unreadCount +
      unreadLowStockCount +
      pendingTransferRequestsCount +
      unreadPairingCount +
      restockUnreadCount
    );
  }, [
    unreadCount,
    unreadLowStockCount,
    pendingTransferRequestsCount,
    unreadPairingCount,
    restockUnreadCount,
  ]);

  const loadMessages = async () => {
    const res = await messagesApi.getInboxMessages();
    setMessages(res.data ?? []);
  };

  const loadPairingRequests = async () => {
    if (!isStoreManagerOrCEO) return;

    const result = await terminalApi.getPendingPairingRequests();
    const list = result.data ?? [];
    setPairingRequests(list);

    const currentRequestIds = new Set(list.map((req) => req.id));
    const stored = localStorage.getItem("readPairingRequests");

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as number[];
        const validReadIds = parsed.filter((id) => currentRequestIds.has(id));

        if (validReadIds.length !== parsed.length) {
          localStorage.setItem(
            "readPairingRequests",
            JSON.stringify(validReadIds)
          );
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

  const loadForecastAlerts = async () => {
    try {
      const data = await forecastAlertsApi.getActiveAlerts();
      setAlerts(data.slice(0, 6));
    } catch (error) {
      console.error("Failed to load forecast alerts:", error);
      setAlerts([]);
    }
  };

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

  useEffect(() => {
    if (!isStoreManagerOrCEO) return;

    loadPairingRequests();
    const interval = window.setInterval(loadPairingRequests, 5000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStoreManagerOrCEO]);

  useEffect(() => {
    if (!isInventoryManager) return;

    loadTransferRequests();
    const interval = window.setInterval(loadTransferRequests, 5000);
    const handleUpdate = () => loadTransferRequests();

    window.addEventListener("transfer-requests-updated", handleUpdate);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("transfer-requests-updated", handleUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInventoryManager]);

  useEffect(() => {
    if (!open) return;

    loadMessages();
    loadForecastAlerts();

    const interval = window.setInterval(() => {
      loadMessages();
      loadForecastAlerts();
    }, 5000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleLowStockAlertClick = async (msg: Message) => {
    if (isUnread(msg)) {
      try {
        await messagesApi.markAsRead(msg.id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                  ...m,
                  status: "READ" as const,
                  readAt: new Date().toISOString(),
                }
              : m
          )
        );
        window.dispatchEvent(new Event("messages-updated"));
      } catch (err) {
        console.error("Failed to mark message as read:", err);
      }
    }

    setOpen(false);
    navigate(`${basePath}/message/${msg.id}?mode=notification`);
  };

  const handleMessageClick = (msg: Message) => {
    setOpen(false);
    navigate(`${basePath}/message/${msg.id}`);
  };

  const handlePairingRequestClick = (requestId: number) => {
    const newRead = new Set(readPairingRequests);
    newRead.add(requestId);
    setReadPairingRequests(newRead);
    localStorage.setItem(
      "readPairingRequests",
      JSON.stringify(Array.from(newRead))
    );

    setOpen(false);
    navigate(`${basePath}/pairing-requests`);
  };

  const handleTransferRequestClick = (requestId?: number) => {
    if (!requestId) return;

    setOpen(false);
    navigate(`${basePath}/inventory/transfer-requests/${requestId}`);
  };

  const hasAnyNotifications =
    pendingTransferRequests.length > 0 ||
    unreadLowStockAlerts.length > 0 ||
    unreadPairingRequests.length > 0 ||
    inboxPreview.length > 0 ||
    forecastPreview.length > 0 ||
    restockPreview.length > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-slate-700 hover:bg-slate-100 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 transition-transform duration-200" />
        {totalUnread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 px-0.5 place-items-center rounded-full bg-[#0066FF] text-[10px] text-white font-semibold ring-2 ring-white shadow-sm animate-pulse hover:animate-none hover:scale-125 transition-transform duration-200">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[100] mt-2 w-80 rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-md p-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="mb-2 px-2 py-1.5 text-sm font-semibold text-slate-800 border-b border-slate-100">
            Notifications
          </div>

          {!hasAnyNotifications && (
            <div className="px-3 py-8 text-center text-sm text-slate-500">
              No notifications
            </div>
          )}

          {hasAnyNotifications && (
            <>
              {isInventoryManager && pendingTransferRequests.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600" />
                    Transfer Requests
                  </div>
                  <ul className="max-h-44 divide-y divide-slate-100 overflow-auto">
                    {pendingTransferRequests.map((req) => {
                      const reqItems = req.items ?? [];
                      const totalItems = reqItems.length;
                      const timeStr = formatTimestamp(
                        req.requestedAt ?? req.createdAt
                      );
                      const requesterDisplay =
                        req.requesterName || "Unknown Requester";

                      return (
                        <li
                          key={`transfer-${req.requestId}`}
                          className="px-2 py-2.5 text-sm hover:bg-blue-50/50 rounded-lg transition-all duration-200 cursor-pointer group border-l-2 border-blue-500 bg-blue-50/30"
                          onClick={() =>
                            handleTransferRequestClick(req.requestId)
                          }
                        >
                          <div className="flex items-start gap-2 mb-1">
                            <ArrowRightLeft className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-blue-900 group-hover:text-blue-700 transition-colors duration-200">
                                  Transfer Request
                                </span>
                                <span className="text-xs text-blue-600 group-hover:text-blue-700 transition-colors duration-200">
                                  {timeStr}
                                </span>
                              </div>
                              <div className="text-blue-700 mb-1 group-hover:text-blue-800 transition-colors duration-200 line-clamp-2 text-xs">
                                New transfer request from {requesterDisplay} –{" "}
                                {totalItems}{" "}
                                {totalItems === 1 ? "item" : "items"}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {unreadLowStockAlerts.length > 0 && (
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    Low Stock Alerts
                  </div>
                  <ul className="max-h-44 divide-y divide-slate-100 overflow-auto">
                    {unreadLowStockAlerts.map((msg) => {
                      const shortBody =
                        msg.message.length > 100
                          ? `${msg.message.substring(0, 100)}...`
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
                                <span className="font-semibold text-red-900 group-hover:text-red-700 transition-colors duration-200">
                                  {msg.title}
                                </span>
                                <span className="text-xs text-red-600 group-hover:text-red-700 transition-colors duration-200">
                                  {timeStr}
                                </span>
                              </div>
                              <div className="text-red-700 mb-1 group-hover:text-red-800 transition-colors duration-200 line-clamp-2 text-xs">
                                {shortBody}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {unreadPairingRequests.length > 0 && (
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-blue-500" />
                    Pairing Requests
                  </div>
                  <ul className="max-h-44 divide-y divide-slate-100 overflow-auto">
                    {unreadPairingRequests.map((req) => {
                      const unread = !readPairingRequests.has(req.id);
                      const cashierName =
                        req.requestedByName &&
                        req.requestedByName.trim() &&
                        req.requestedByName.trim() !== "Unknown"
                          ? req.requestedByName.trim()
                          : "Cashier";

                      return (
                        <li
                          key={`pairing-${req.id}`}
                          className={`px-2 py-2.5 text-sm hover:bg-blue-50/50 rounded-lg transition-all duration-200 cursor-pointer group border-l-2 ${
                            unread
                              ? "border-blue-500 bg-blue-50/30"
                              : "border-transparent hover:border-blue-400"
                          }`}
                          onClick={() => handlePairingRequestClick(req.id)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`font-semibold ${
                                unread ? "text-blue-700" : "text-slate-800"
                              } group-hover:text-blue-700 transition-colors duration-200`}
                            >
                              Terminal Pairing Request
                              {unread && (
                                <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500" />
                              )}
                            </span>
                            <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors duration-200">
                              {formatTimestamp(req.issuedAt)}
                            </span>
                          </div>
                          <div
                            className={`mb-1 group-hover:text-slate-700 transition-colors duration-200 ${
                              unread
                                ? "text-slate-700 font-medium"
                                : "text-slate-600"
                            }`}
                          >
                            {cashierName} requested pairing with terminal{" "}
                            {req.terminalCode}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {inboxPreview.length > 0 && (
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                    Inbox Messages
                  </div>
                  <ul className="max-h-56 divide-y divide-slate-100 overflow-auto">
                    {inboxPreview.map((n) => (
                      <li
                        key={n.id}
                        className="px-2 py-2.5 text-sm hover:bg-blue-50/50 rounded-lg transition-all duration-200 cursor-pointer group border-l-2 border-transparent hover:border-blue-400"
                        onClick={() => handleMessageClick(n)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors duration-200">
                            {n.subject || n.title}
                          </span>
                          <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors duration-200">
                            {formatTimestamp(n.createdAt)}
                          </span>
                        </div>
                        <div className="text-slate-600 mb-1 group-hover:text-slate-700 transition-colors duration-200 line-clamp-2">
                          {n.message}
                        </div>
                        <div className="text-xs text-slate-500 group-hover:text-slate-600 transition-colors duration-200">
                          From: {n.fromName || n.from}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {forecastPreview.length > 0 && (
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    Forecast Alerts
                  </div>
                  <ul className="max-h-44 divide-y divide-slate-100 overflow-auto">
                    {forecastPreview.map((a) => (
                      <li
                        key={a.id}
                        className="px-2 py-2.5 text-sm hover:bg-amber-50/60 rounded-lg transition-all duration-200 cursor-pointer group border-l-2 border-transparent hover:border-amber-400"
                        onClick={() => {
                          setOpen(false);
                          navigate(
                            `${basePath}/forecasting/products/${a.productId}`
                          );
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-800 group-hover:text-amber-700 transition-colors duration-200">
                            {a.productName}
                          </span>
                          <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors duration-200">
                            {formatTimestamp(a.createdAt)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 group-hover:text-slate-700 transition-colors duration-200">
                          {a.urgency === "critical"
                            ? "Critical stock risk"
                            : "At-risk stock level"}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {restockPreview.length > 0 && (
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <div className="px-2 py-1.5 flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-red-500" />
                      Restock Recommendations
                      {restockUnreadCount > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] text-white font-bold">
                          {restockUnreadCount > 9
                            ? "9+"
                            : restockUnreadCount}
                        </span>
                      )}
                    </div>

                    {hasUnreadRestock && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAllRestockNotificationsRead();
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <ul className="max-h-56 divide-y divide-slate-100 overflow-auto">
                    {restockPreview.map((n) => (
                      <li
                        key={n.id}
                        className={`px-2 py-2.5 text-sm rounded-lg transition-all duration-200 cursor-pointer group border-l-2 ${
                          n.read
                            ? "border-transparent hover:bg-slate-50/60"
                            : "border-red-400 bg-red-50/20 hover:bg-red-50/50"
                        }`}
                        onClick={() => {
                          markRestockNotificationRead(n.id);
                          setOpen(false);
                          navigate(
                            `${basePath}/forecasting/products/${n.productId}`
                          );
                        }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span
                            className={`text-xs font-bold uppercase tracking-wide ${
                              n.urgency === "critical"
                                ? "text-red-700"
                                : "text-orange-700"
                            }`}
                          >
                            Restock Recommendation
                          </span>
                          {!n.read && (
                            <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
                          )}
                        </div>

                        <div className="text-slate-800 font-semibold text-sm line-clamp-1">
                          {n.productName}
                        </div>

                        <div className="text-xs text-slate-600 mt-0.5">
                          Stock:{" "}
                          <span className="font-semibold">
                            {n.currentStock.toFixed(2)}
                          </span>{" "}
                          · Reorder:{" "}
                          <span className="font-semibold">
                            {Math.round(n.reorderQty)}
                          </span>{" "}
                          · Severity:{" "}
                          <span
                            className={`font-bold ${
                              n.urgency === "critical"
                                ? "text-red-600"
                                : "text-orange-600"
                            }`}
                          >
                            {n.urgency === "critical" ? "Critical" : "High"}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {n.detailsMessage}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="px-2 pt-2 text-right">
                    <button
                      onClick={() => {
                        setOpen(false);
                        navigate(`${basePath}/forecasting`);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 hover:underline transition-colors"
                    >
                      View all restock recommendations →
                    </button>
                  </div>
                </div>
              )}

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
            </>
          )}
        </div>
      )}
    </div>
  );
}