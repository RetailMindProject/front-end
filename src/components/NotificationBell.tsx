import { useEffect, useMemo, useState } from "react";
import { Bell, MessageSquare, AlertTriangle, Package } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { messagesApi } from "../services/messages.api";
import type { Message } from "./messages/types";
import { forecastAlertsApi, type ForecastAlert } from "../services/forecastAlerts.api";
import {
  useRestockNotifications,
  markRestockNotificationRead,
  markAllRestockNotificationsRead,
} from "../services/restockNotifications.store";

export default function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Message[]>([]);
  const [alerts, setAlerts] = useState<ForecastAlert[]>([]);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const basePath = pathname.split("/").slice(0, 2).join("/");

  // Restock notifications come from the local singleton store (localStorage-backed).
  const {
    notifications: restockNotifications,
    unreadCount: restockUnreadCount,
  } = useRestockNotifications();

  // Total badge = unread messages + unread restock notifications.
  const totalUnread = unreadCount + restockUnreadCount;

  const loadMessages = async () => {
    const res = await messagesApi.getInboxMessages();
    if (res.data) {
      setItems(res.data.slice(0, 6));
    }
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
    if (!open) return;
    loadMessages();
    loadForecastAlerts();
    const interval = window.setInterval(loadMessages, 5000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const preview = useMemo(() => items, [items]);
  const forecastPreview = useMemo(() => alerts, [alerts]);

  // Show only the 6 most recent restock notifications in the dropdown.
  const restockPreview = restockNotifications.slice(0, 6);
  const hasUnreadRestock = restockNotifications.some((n) => !n.read);

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

          {/* ── Inbox messages ── */}
          <ul className="max-h-56 divide-y divide-slate-100 overflow-auto">
            {preview.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-500">
                No messages
              </li>
            ) : (
              preview.map((n) => (
                <li
                  key={n.id}
                  className="px-2 py-2.5 text-sm hover:bg-blue-50/50 rounded-lg transition-all duration-200 cursor-pointer group border-l-2 border-transparent hover:border-blue-400"
                  onClick={() => {
                    setOpen(false);
                    navigate(`${basePath}/message/${n.id}`);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors duration-200">
                      {n.subject}
                    </span>
                    <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors duration-200">
                      {n.createdAt}
                    </span>
                  </div>
                  <div className="text-slate-600 mb-1 group-hover:text-slate-700 transition-colors duration-200 line-clamp-2">
                    {n.message}
                  </div>
                  <div className="text-xs text-slate-500 group-hover:text-slate-600 transition-colors duration-200">
                    From: {n.fromName || n.from}
                  </div>
                </li>
              ))
            )}
          </ul>

          {/* ── Forecast alerts (from API) ── */}
          {forecastPreview.length > 0 && (
            <div className="mt-2 border-t border-slate-100 pt-2">
              <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Forecast alerts
              </div>
              <ul className="max-h-44 divide-y divide-slate-100 overflow-auto">
                {forecastPreview.map((a) => (
                  <li
                    key={a.id}
                    className="px-2 py-2.5 text-sm hover:bg-amber-50/60 rounded-lg transition-all duration-200 cursor-pointer group border-l-2 border-transparent hover:border-amber-400"
                    onClick={() => {
                      setOpen(false);
                      navigate(`${basePath}/forecasting/products/${a.productId}`);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800 group-hover:text-amber-700 transition-colors duration-200">
                        {a.productName}
                      </span>
                      <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors duration-200">
                        {a.createdAt}
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

          {/* ── Restock recommendations (localStorage-backed) ── */}
          {restockPreview.length > 0 && (
            <div className="mt-2 border-t border-slate-100 pt-2">
              <div className="px-2 py-1.5 flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-red-500" />
                  Restock Recommendations
                  {restockUnreadCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] text-white font-bold">
                      {restockUnreadCount > 9 ? "9+" : restockUnreadCount}
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
                    {/* Title row */}
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

                    {/* Body: matches requested format */}
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

                    {/* Details / forecast message */}
                    <div className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {n.detailsMessage}
                    </div>
                  </li>
                ))}
              </ul>

              {/* Navigate to forecasting dashboard to see full list */}
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

          {/* ── Footer: message box link ── */}
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
