import { useEffect, useMemo, useState } from "react";
import { Bell, MessageSquare } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { messagesApi } from "../services/messages.api";
import type { Message } from "./messages/types";

export default function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Message[]>([]);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const basePath = pathname.split("/").slice(0, 2).join("/");

  const unread = unreadCount;

  const load = async () => {
    const res = await messagesApi.getInboxMessages();
    if (res.data) {
      setItems(res.data.slice(0, 6));
    }
  };

  useEffect(() => {
    if (!open) return;
    load();
    const interval = window.setInterval(load, 5000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const preview = useMemo(() => items, [items]);

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen((v) => !v)} 
        className="relative rounded-lg p-2 text-slate-700 hover:bg-slate-100 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" 
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 transition-transform duration-200" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#0066FF] text-[10px] text-white font-semibold ring-2 ring-white shadow-sm animate-pulse hover:animate-none hover:scale-125 transition-transform duration-200">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[100] mt-2 w-80 rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-md p-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="mb-2 px-2 py-1.5 text-sm font-semibold text-slate-800 border-b border-slate-100">Notifications</div>
          <ul className="max-h-72 divide-y divide-slate-100 overflow-auto">
            {preview.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-slate-500">No notifications</li>
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
                  <span className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors duration-200">{n.subject}</span>
                  <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors duration-200">{n.createdAt}</span>
                </div>
                <div className="text-slate-600 mb-1 group-hover:text-slate-700 transition-colors duration-200 line-clamp-2">{n.message}</div>
                <div className="text-xs text-slate-500 group-hover:text-slate-600 transition-colors duration-200">From: {n.fromName || n.from}</div>
              </li>
              ))
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
