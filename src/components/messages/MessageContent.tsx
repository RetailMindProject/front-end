import type { Message } from "./types";
import MessageHeader from "./MessageHeader";

interface MessageContentProps {
  message: Message;
  className?: string;
}

export default function MessageContent({ message, className = "" }: MessageContentProps) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 ${className}`}>
      <div className="mb-4">
        <MessageHeader message={message} className="mb-3" />
        
        {/* Subject */}
        <h2 className="text-xl font-semibold text-slate-800 mb-3">
          {message.subject}
        </h2>

        {/* Message Body */}
        <div className="prose prose-sm max-w-none">
          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
            {message.message}
          </p>
        </div>
      </div>
    </div>
  );
}

