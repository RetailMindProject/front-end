import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Send } from "lucide-react";
import type { SentMessage } from "../components/messages/types";
import OutboxHeader from "../components/messages/OutboxHeader";
import OutboxFilters from "../components/messages/OutboxFilters";
import OutboxMessageCard from "../components/messages/OutboxMessageCard";
import { messagesApi } from "../services/messages.api";

export default function Outbox() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "delivered" | "read">("all");
  const [recipientFilter, setRecipientFilter] = useState<"all" | "CEO" | "Store Manager" | "Inventory Manager">("all");
  const [allMessages, setAllMessages] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      setError("");
      const result = await messagesApi.getOutboxMessages();
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setAllMessages(result.data);
      }
      setLoading(false);
    };

    loadMessages();
  }, []);

  // Filter messages
  const filteredMessages = useMemo(() => {
    return allMessages.filter((msg) => {
      const matchesSearch =
        searchTerm === "" ||
        msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.toName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || msg.status === statusFilter;
      const matchesRecipient = recipientFilter === "all" || msg.to === recipientFilter;

      return matchesSearch && matchesStatus && matchesRecipient;
    });
  }, [allMessages, searchTerm, statusFilter, recipientFilter]);

  const handleMessageClick = (message: SentMessage) => {
    const basePath = pathname.split("/").slice(0, 2).join("/");
    navigate(`${basePath}/message/${message.id}?from=outbox`);
  };

  const handleCompose = () => {
    // Navigate to compose page (to be implemented)
    const basePath = pathname.split("/").slice(0, 2).join("/");
    navigate(`${basePath}/compose`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
        {/* Header */}
        <OutboxHeader totalMessages={allMessages.length} onCompose={handleCompose} />

        {/* Filters */}
        <OutboxFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          recipientFilter={recipientFilter}
          onRecipientFilterChange={setRecipientFilter}
        />

        {/* Messages List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="px-6 py-16 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-slate-600 mt-4">Loading messages...</p>
            </div>
          ) : error ? (
            <div className="px-6 py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <Send className="h-8 w-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Error loading messages</h3>
              <p className="text-sm text-slate-600 mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200"
              >
                Retry
              </button>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                <Send className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No messages found</h3>
              <p className="text-sm text-slate-600 mb-6">
                {searchTerm || statusFilter !== "all" || recipientFilter !== "all"
                  ? "Try adjusting your filters"
                  : "You haven't sent any messages yet"}
              </p>
              {(!searchTerm && statusFilter === "all" && recipientFilter === "all") && (
                <button
                  onClick={handleCompose}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 active:scale-95"
                >
                  <Send className="h-4 w-4" />
                  Compose First Message
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMessages.map((message) => (
                <OutboxMessageCard
                  key={message.id}
                  message={message}
                  onClick={() => handleMessageClick(message)}
                  showPreview
                />
              ))}
            </div>
          )}
        </div>

        {/* Stats Footer */}
        {filteredMessages.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Sent</div>
              <div className="text-2xl font-bold text-slate-800">{allMessages.length}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Read</div>
              <div className="text-2xl font-bold text-blue-600">
                {allMessages.filter((m) => m.status === "read").length}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Delivered</div>
              <div className="text-2xl font-bold text-green-600">
                {allMessages.filter((m) => m.status === "delivered").length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
