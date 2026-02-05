import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import type { Message, SentMessage } from "../components/messages/types";
import type { MessageDTO } from "../services/messages.api";
import MessageContent from "../components/messages/MessageContent";
import ReplyForm from "../components/messages/ReplyForm";
import SentMessageContent from "../components/messages/SentMessageContent";
import { messagesApi } from "../services/messages.api";
import { getCurrentToken, decodeJWT } from "../services/tokens";
import PageHeader from "../components/PageHeader";

function getCurrentUserId(): number | null {
  const token = getCurrentToken();
  if (!token) return null;
  
  const decoded = decodeJWT(token);
  if (!decoded) return null;
  
  let userId = decoded.userId || decoded.user_id || decoded.sub || decoded.id || decoded.user?.id;
  
  if (typeof userId === 'number') return userId;
  if (typeof userId === 'string') {
    const parsed = parseInt(userId, 10);
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
}

function convertDTOToSentMessage(dto: MessageDTO): SentMessage {
  const statusMap: Record<string, "sent" | "delivered" | "read"> = {
    "SENT": "sent",
    "DELIVERED": "delivered",
    "READ": "read",
  };

  const toRole = dto.toUser.role.toUpperCase().replace(/\s+/g, "_");
  let normalizedTo: "CEO" | "Store Manager" | "Inventory Manager" = "Store Manager";
  
  if (toRole === "CEO") {
    normalizedTo = "CEO";
  } else if (toRole === "STORE_MANAGER" || toRole === "STOREMANAGER") {
    normalizedTo = "Store Manager";
  } else if (toRole === "INVENTORY_MANAGER" || toRole === "INVENTORYMANAGER") {
    normalizedTo = "Inventory Manager";
  }

  return {
    id: dto.id.toString(),
    subject: dto.title,
    message: dto.body,
    to: normalizedTo,
    toName: `${dto.toUser.firstName} ${dto.toUser.lastName}`,
    createdAt: new Date(dto.createdAt).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    status: statusMap[dto.status] || "sent",
    attachments: dto.attachments?.filter(att => att && att.id).map(att => ({
      id: att.id.toString(),
      fileName: att.fileName || "Unknown file",
      fileUrl: att.fileUrl || "",
      fileSize: att.fileSize || 0,
      contentType: att.contentType || "application/octet-stream",
    })),
  };
}

export default function MessageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [message, setMessage] = useState<Message | null>(null);
  const [sentMessage, setSentMessage] = useState<SentMessage | null>(null);
  const [isSentMessage, setIsSentMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replying, setReplying] = useState(false);
  const [fromUserId, setFromUserId] = useState<number | undefined>(undefined);
  const [isCurrentUserSender, setIsCurrentUserSender] = useState(false);
  const replyFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadMessage = async () => {
      if (!id) return;

      setLoading(true);
      setError("");
      setIsCurrentUserSender(false);
      
      try {
        const result = await messagesApi.getMessageById(id);
        
        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }

        if (result.data && result.dto) {
          const currentUserId = getCurrentUserId();
          const senderId = result.dto.fromUser?.id;
          const isSender = currentUserId !== null && senderId !== undefined && String(currentUserId) === String(senderId);
          
          if (isSender) {
            if (!result.dto.toUser) {
              setError("Invalid message data: missing recipient");
              setLoading(false);
              return;
            }
            const sentMsg = convertDTOToSentMessage(result.dto);
            setSentMessage(sentMsg);
            setIsSentMessage(true);
            setIsCurrentUserSender(true);
            setMessage(null);
          } else {
            setMessage(result.data);
            setIsSentMessage(false);
            setIsCurrentUserSender(false);
            setSentMessage(null);
            setFromUserId(result.dto.fromUser?.id);
            
            if (!result.data.read) {
              await messagesApi.markAsRead(id);
              window.dispatchEvent(new CustomEvent("messages-updated"));
            }
          }
        } else {
          setError("Failed to load message data");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load message");
      } finally {
        setLoading(false);
      }
    };

    loadMessage();
  }, [id, pathname]);

  useEffect(() => {
    if (!loading && message && !isSentMessage && !isCurrentUserSender && replyFormRef.current) {
      setTimeout(() => {
        replyFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        window.scrollTo({ top: window.scrollY + 100, behavior: "smooth" });
      }, 300);
    }
  }, [loading, message, isSentMessage, isCurrentUserSender]);

  const handleReplySubmit = async (reply: string, files: File[]) => {
    if (!id || !message) return;

    setReplying(true);
    setError("");

    try {
      const result = await messagesApi.replyToMessage(id, reply, files.length > 0 ? files : undefined, fromUserId);

      if (result.error) {
        setError(result.error);
        return;
      }

      const basePath = pathname.split("/").slice(0, 2).join("/");
      window.dispatchEvent(new CustomEvent("messages-updated"));
      navigate(`${basePath}/message-box`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setReplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Loading message...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <p className="text-slate-600 mb-4">{error}</p>
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

  if (!loading && !message && !sentMessage) {
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
  const backPath = `${basePath}/message-box`;

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-full w-full">
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-5xl pb-20">
        <button
          onClick={() => navigate(backPath)}
          className="mb-4 inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <ArrowLeft size={20} />
          <span>Back to Message Box</span>
        </button>

        <PageHeader
          title={isSentMessage ? "Sent Message Details" : "Message Details"}
          icon={<Send className="h-6 w-6 text-white" />}
        />

        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {isSentMessage && sentMessage ? (
            <SentMessageContent message={sentMessage} />
          ) : message && !isSentMessage && !isCurrentUserSender ? (
            <>
              <MessageContent message={message} />
              <div ref={replyFormRef}>
                <ReplyForm
                  recipientName={message.fromName}
                  onSubmit={handleReplySubmit}
                />
              </div>
              {replying && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  Sending reply...
                </div>
              )}
            </>
          ) : message && !isSentMessage && isCurrentUserSender ? (
            <MessageContent message={message} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

