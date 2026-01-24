import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Inbox as InboxIcon, Plus } from "lucide-react";
import type { Message } from "../components/messages/types";
import MessageCard from "../components/messages/MessageCard";
import { messagesApi } from "../services/messages.api";
import PageHeader from "../components/PageHeader";

export default function Inbox() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [senderFilter, setSenderFilter] = useState<"all" | "CEO" | "Store Manager" | "Inventory Manager">("all");
  const [readFilter, setReadFilter] = useState<"all" | "read" | "unread">("all");
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      setError("");
      const result = await messagesApi.getInboxMessages();
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
        msg.fromName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSender = senderFilter === "all" || msg.from === senderFilter;
      const matchesRead =
        readFilter === "all" ||
        (readFilter === "read" && msg.read) ||
        (readFilter === "unread" && !msg.read);

      return matchesSearch && matchesSender && matchesRead;
    });
  }, [allMessages, searchTerm, senderFilter, readFilter]);

  const handleMessageClick = (message: Message) => {
    // Navigate to message detail
    const basePath = pathname.split("/").slice(0, 2).join("/");
    navigate(`${basePath}/message/${message.id}`);
  };

  const handleCompose = () => {
    // Navigate to compose page
    const basePath = pathname.split("/").slice(0, 2).join("/");
    navigate(`${basePath}/compose`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <PageHeader
        title="Inbox"
        icon={<InboxIcon className="h-6 w-6 text-white" />}
        right={
          <button
            onClick={handleCompose}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Compose
          </button>
        }
      />

      <div className="container mx-auto px-4 sm:px-6 py-6 pt-0 max-w-7xl">

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            {/* Sender Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2 uppercase tracking-wide">
                Sender
              </label>
              <div className="flex flex-wrap gap-2">
                {(["all", "CEO", "Store Manager", "Inventory Manager"] as const).map((sender) => (
                  <button
                    key={sender}
                    onClick={() => setSenderFilter(sender)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                      senderFilter === sender
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {sender}
                  </button>
                ))}
              </div>
            </div>

            {/* Read Status Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2 uppercase tracking-wide">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {(["all", "read", "unread"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setReadFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                      readFilter === status
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

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
                <InboxIcon className="h-8 w-8 text-red-400" />
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
                <InboxIcon className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No messages found</h3>
              <p className="text-sm text-slate-600">
                {searchTerm || senderFilter !== "all" || readFilter !== "all"
                  ? "Try adjusting your filters"
                  : "You have no messages yet"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMessages.map((message) => (
                <MessageCard
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
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Messages</div>
              <div className="text-2xl font-bold text-slate-800">{allMessages.length}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Unread</div>
              <div className="text-2xl font-bold text-blue-600">
                {allMessages.filter((m) => !m.read).length}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Read</div>
              <div className="text-2xl font-bold text-green-600">
                {allMessages.filter((m) => m.read).length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

