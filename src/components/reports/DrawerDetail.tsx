import React from "react";

export default function DrawerDetail({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true"></div>
      <aside className="absolute right-0 top-0 h-full w-full max-w-lg bg-background border-l shadow-xl p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Close</button>
        </div>
        <div className="mt-4 overflow-y-auto h-[calc(100%-3rem)] space-y-4">{children}</div>
      </aside>
    </div>
  );
}


