import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Inbox as InboxIcon, Send, MessageSquare, RefreshCcw, Plus } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { messagesApi } from "../services/messages.api";
import type { Message, SentMessage } from "../components/messages/types";

type Tab = "all" | "inbox" | "sent";

type UnifiedMessage =
  | { kind: "inbox"; id: string; subject: string; body: string; fromName: string; createdAt: string; read: boolean }
  | { kind: "sent"; id: string; subject: string; body: string; toName: string; createdAt: string; status: string };

export default function MessageBox() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const basePath = pathname.split("/").slice(0, 2).join("/");

  const [tab, setTab] = useState<Tab>("all");
  const [inbox, setInbox] = useState<Message[]>([]);
  const [sent, setSent] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const [inboxRes, sentRes] = await Promise.all([
        messagesApi.getInboxMessages(),
        messagesApi.getOutboxMessages(),
      ]);

      if (inboxRes.error) setError(inboxRes.error);
      if (sentRes.error) setError((prev) => prev || sentRes.error || null);

      setInbox(inboxRes.data || []);
      setSent(sentRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadInboxCount = useMemo(() => inbox.filter((m) => !m.read).length, [inbox]);

  const unified: UnifiedMessage[] = useMemo(() => {
    const inboxItems: UnifiedMessage[] = inbox.map((m) => ({
      kind: "inbox",
      id: m.id,
      subject: m.subject,
      body: m.message,
      fromName: m.fromName || m.from,
      createdAt: m.createdAt,
      read: !!m.read,
    }));

    const sentItems: UnifiedMessage[] = sent.map((m) => ({
      kind: "sent",
      id: m.id,
      subject: m.subject,
      body: m.message,
      toName: m.toName,
      createdAt: m.createdAt,
      status: m.status ?? "sent",
    }));

    if (tab === "inbox") return inboxItems;
    if (tab === "sent") return sentItems;
    return [...inboxItems, ...sentItems];
  }, [inbox, sent, tab]);

  const openMessage = (m: UnifiedMessage) => {
    navigate(`${basePath}/message/${m.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <PageHeader
        title="Message Box"
        icon={<MessageSquare className="h-6 w-6 text-white" />}
        right={
          <>
            <button
              onClick={() => navigate(`${basePath}/compose`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              Compose
            </button>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-3 py-2.5 bg-white/70 text-slate-700 rounded-lg hover:bg-white transition-all duration-200 shadow-sm border border-slate-200"
              aria-label="Refresh"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          </>
        }
      />

      <div className="container mx-auto px-4 sm:px-6 py-6 pt-0 max-w-7xl">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={() => setTab("all")}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "all" ? "bg-indigo-600 text-white" : "bg-white/70 text-slate-700 hover:bg-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTab("inbox")}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "inbox" ? "bg-indigo-600 text-white" : "bg-white/70 text-slate-700 hover:bg-white"
            }`}
          >
            <InboxIcon className="h-4 w-4" />
            Inbox
            {unreadInboxCount > 0 && (
              <span className="ml-1 inline-grid min-w-5 h-5 place-items-center rounded-full bg-red-600 text-white text-[11px] px-1">
                {unreadInboxCount > 99 ? "99+" : unreadInboxCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("sent")}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "sent" ? "bg-indigo-600 text-white" : "bg-white/70 text-slate-700 hover:bg-white"
            }`}
          >
            <Send className="h-4 w-4" />
            Sent
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="px-6 py-16 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-slate-600 mt-4">Loading messages...</p>
            </div>
          ) : unified.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No messages</h3>
              <p className="text-sm text-slate-600">Your inbox and sent messages will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {unified.map((m) => (
                <button
                  key={`${m.kind}-${m.id}`}
                  onClick={() => openMessage(m)}
                  className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                            m.kind === "inbox" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {m.kind === "inbox" ? "Inbox" : "Sent"}
                        </span>
                        {m.kind === "inbox" && !m.read && (
                          <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-red-100 text-red-700">
                            New
                          </span>
                        )}
                        {m.kind === "sent" && (
                          <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700">
                            {m.status}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 font-semibold text-slate-900 truncate">{m.subject}</div>
                      <div className="mt-1 text-sm text-slate-600 line-clamp-2">{m.body}</div>
                      <div className="mt-2 text-xs text-slate-500">
                        {m.kind === "inbox" ? `From: ${m.fromName}` : `To: ${m.toName}`}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 whitespace-nowrap">{m.createdAt}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

