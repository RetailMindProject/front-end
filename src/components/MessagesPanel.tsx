import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, X } from "lucide-react";
import type { Message } from "./messages/types";
import { getMockMessages } from "./messages/utils";
import MessageCard from "./messages/MessageCard";

interface MessagesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMessagesChange?: (messages: Message[]) => void;
}

export default function MessagesPanel({ isOpen, onClose, onMessagesChange }: MessagesPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const mockMessages = getMockMessages();
    setMessages(mockMessages);
    onMessagesChange?.(mockMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = messages.filter((m) => !m.read).length;

  const handleMessageClick = (msg: Message) => {
    // Mark as read
    setMessages((prev) => {
      const updated = prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m));
      if (onMessagesChange) {
        onMessagesChange(updated);
      }
      return updated;
    });
    
    // Navigate to message detail
    onClose();
    navigate(`/store-manager/message/${msg.id}`);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Messages Panel */}
      <div className="fixed right-4 top-16 z-50 w-96 rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-800">Messages</h3>
            {unreadCount > 0 && (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-red-600 text-[10px] font-medium text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-slate-100 transition-colors"
            aria-label="Close messages"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Messages List */}
        <div className="max-h-[500px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No messages yet
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {messages.map((msg) => (
                <MessageCard
                  key={msg.id}
                  message={msg}
                  onClick={() => handleMessageClick(msg)}
                  showPreview
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {messages.length > 0 && (
          <div className="border-t border-slate-200 px-4 py-3">
            <button className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
              View All Messages
            </button>
          </div>
        )}
      </div>
    </>
  );
}

