import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";

type Item = { id: string; title: string; body: string; from: string; createdAt: string; read?: boolean };

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    setItems([
      { id: "1", title: "Message from CEO", body: "Great job on sales this week!", from: "CEO", createdAt: "2025-10-25" },
      { id: "2", title: "Inventory Alert", body: "Low stock on iPhone 15 Pro.", from: "System", createdAt: "2025-10-24" },
    ]);
  }, []);

  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen((v) => !v)} 
        className="relative rounded-lg p-2 text-slate-600 hover:text-[#0066FF] hover:bg-blue-50/80 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95" 
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 transition-transform duration-200" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#0066FF] text-[10px] text-white font-semibold ring-2 ring-white shadow-sm animate-pulse">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-md p-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="mb-2 px-2 py-1.5 text-sm font-semibold text-slate-800 border-b border-slate-100">Notifications</div>
          <ul className="max-h-72 divide-y divide-slate-100 overflow-auto">
            {items.map((n) => (
              <li key={n.id} className="px-2 py-2.5 text-sm hover:bg-slate-50/80 rounded-lg transition-colors duration-150 cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800">{n.title}</span>
                  <span className="text-xs text-slate-400">{n.createdAt}</span>
                </div>
                <div className="text-slate-600 mb-1">{n.body}</div>
                <div className="text-xs text-slate-500">From: {n.from}</div>
              </li>
            ))}
          </ul>
          <div className="px-2 pt-2 mt-2 border-t border-slate-100 text-right">
            <button className="text-sm text-[#0066FF] hover:text-[#3572EF] font-medium hover:underline transition-colors duration-200">View all</button>
          </div>
        </div>
      )}
    </div>
  );
}
