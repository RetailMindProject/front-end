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
      <button onClick={() => setOpen((v) => !v)} className="relative rounded-lg p-2 hover:bg-slate-100" aria-label="Notifications">
        <Bell className="h-5 w-5 text-slate-600" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-red-600 text-[10px] text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="mb-1 px-2 text-sm font-medium text-slate-700">Notifications</div>
          <ul className="max-h-72 divide-y divide-slate-100 overflow-auto">
            {items.map((n) => (
              <li key={n.id} className="px-2 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{n.title}</span>
                  <span className="text-xs text-slate-400">{n.createdAt}</span>
                </div>
                <div className="text-slate-600">{n.body}</div>
                <div className="text-xs text-slate-500">From: {n.from}</div>
              </li>
            ))}
          </ul>
          <div className="px-2 pt-2 text-right">
            <button className="text-sm text-blue-700 hover:underline">View all</button>
          </div>
        </div>
      )}
    </div>
  );
}
