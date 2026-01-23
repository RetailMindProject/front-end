import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import ChatPanel from "./ChatPanel";

export default function CustomerChatWidget() {
  const [open, setOpen] = useState(false);

  // Close on route changes if needed later; keep behavior minimal for now.
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center justify-center h-12 w-12 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 hover:shadow-indigo-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          aria-label="Open chatbot"
          title="Chat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}

      <ChatPanel isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}

