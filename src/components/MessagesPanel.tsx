import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, X } from "lucide-react";
import type { Message } from "./messages/types";
import MessageCard from "./messages/MessageCard";
import { messagesApi } from "../services/messages.api";

interface MessagesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMessagesChange?: (messages: Message[]) => void;
  onOpenMessageBox?: () => void;
}

export default function MessagesPanel({ isOpen, onClose, onMessagesChange, onOpenMessageBox }: MessagesPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const loadMessages = async () => {
      if (!isOpen) return;
      
      setLoading(true);
      const result = await messagesApi.getInboxMessages();
      if (result.data) {
        const recentMessages = result.data.slice(0, 5);
        setMessages(recentMessages);
        onMessagesChange?.(recentMessages);
      }
      const countRes = await messagesApi.getUnreadCount();
      if (countRes.data !== undefined) {
        setUnreadCount(countRes.data);
      }
      setLoading(false);
    };

    loadMessages();
  }, [isOpen, onMessagesChange]);

  const getMessageRoute = (messageId: string) => `/dashboard/message/${messageId}`;

  const handleMessageClick = async (msg: Message) => {
    if (!msg.read) {
      await messagesApi.markAsRead(msg.id);
      setMessages((prev) => {
        const updated = prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m));
        if (onMessagesChange) {
          onMessagesChange(updated);
        }
        return updated;
      });
      window.dispatchEvent(new CustomEvent("messages-updated"));
    }
    
    onClose();
    navigate(getMessageRoute(msg.id));
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
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
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
            <button 
              onClick={() => {
                onClose();
                if (onOpenMessageBox) {
                  onOpenMessageBox();
                  return;
                }
                navigate(`/dashboard/message-box`);
              }}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              View All Messages
            </button>
          </div>
        )}
      </div>
    </>
  );
}

