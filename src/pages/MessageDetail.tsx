import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { Message } from "../components/messages/types";
import { getMockMessages } from "../components/messages/utils";
import MessageContent from "../components/messages/MessageContent";
import ReplyForm from "../components/messages/ReplyForm";

export default function MessageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    // في الواقع سيكون fetch من API
    const messages = getMockMessages();
    const foundMessage = messages.find((m) => m.id === id);
    if (foundMessage) {
      setMessage(foundMessage);
    }
  }, [id]);

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

  if (!message) {
    return (
      <div className="flex-1 bg-[#e9f0ff] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Message not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-blue-600 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#e9f0ff] min-h-screen">
      <div className="px-6 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Messages</span>
        </button>
        <h1 className="text-2xl font-semibold text-slate-800">Message Details</h1>
        <p className="text-slate-500 text-sm">
          View message and send a reply
        </p>
      </div>

      <div className="px-6 py-6 space-y-6">
        <MessageContent message={message} />

        <ReplyForm
          recipientName={message.fromName}
          onSubmit={handleReplySubmit}
        />
      </div>
    </div>
  );
}

