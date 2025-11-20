import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { Message, SentMessage } from "../components/messages/types";
import { getMockMessages, getMockSentMessages } from "../components/messages/utils";
import MessageContent from "../components/messages/MessageContent";
import ReplyForm from "../components/messages/ReplyForm";
import SentMessageContent from "../components/messages/SentMessageContent";

export default function MessageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [message, setMessage] = useState<Message | null>(null);
  const [sentMessage, setSentMessage] = useState<SentMessage | null>(null);
  const [isSentMessage, setIsSentMessage] = useState(false);

  useEffect(() => {
    // Check if we're viewing from outbox (sent message)
    const isFromOutbox = pathname.includes("/outbox") || id?.startsWith("s");
    
    if (isFromOutbox) {
      // Try to find in sent messages
      const currentRole = pathname.startsWith("/ceo") ? "CEO" 
        : pathname.startsWith("/store-manager") ? "Store Manager" 
        : "Inventory Manager";
      const sentMessages = getMockSentMessages(currentRole);
      const foundSentMessage = sentMessages.find((m) => m.id === id);
      if (foundSentMessage) {
        setSentMessage(foundSentMessage);
        setIsSentMessage(true);
        return;
      }
    }
    
    // Otherwise, try to find in received messages
    const messages = getMockMessages();
    const foundMessage = messages.find((m) => m.id === id);
    if (foundMessage) {
      setMessage(foundMessage);
      setIsSentMessage(false);
    }
  }, [id, pathname]);

  const handleReplySubmit = (reply: string, files: File[]) => {
    console.log("Reply:", {
      messageId: id,
      reply,
      files,
      to: message?.from,
      toName: message?.fromName,
    });
    
    alert("Reply sent successfully! (Mock - no backend)");
  };

  if (!message && !sentMessage) {
    return (
      <div className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <p className="text-slate-600 mb-4">Message not found</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 active:scale-95"
          >
            <ArrowLeft size={16} />
            Go back
          </button>
        </div>
      </div>
    );
  }

  const basePath = pathname.split("/").slice(0, 2).join("/");
  const backPath = isSentMessage ? `${basePath}/outbox` : `${basePath}`;

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-5xl">
        <div className="mb-6">
          <button
            onClick={() => navigate(backPath)}
            className="mb-4 inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <ArrowLeft size={20} />
            <span>{isSentMessage ? "Back to Outbox" : "Back to Messages"}</span>
          </button>
          <h1 className="text-2xl font-semibold text-slate-800 mb-1">
            {isSentMessage ? "Sent Message Details" : "Message Details"}
          </h1>
          <p className="text-slate-500 text-sm">
            {isSentMessage ? "View your sent message" : "View message and send a reply"}
          </p>
        </div>

        <div className="space-y-6">
          {isSentMessage && sentMessage ? (
            <SentMessageContent message={sentMessage} />
          ) : message ? (
            <>
              <MessageContent message={message} />
              <ReplyForm
                recipientName={message.fromName}
                onSubmit={handleReplySubmit}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

