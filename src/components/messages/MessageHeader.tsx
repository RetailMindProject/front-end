import type { Message } from "./types";
import MessageBadge from "./MessageBadge";

interface MessageHeaderProps {
  message: Message;
  showDate?: boolean;
  className?: string;
}

export default function MessageHeader({
  message,
  showDate = true,
  className = "",
}: MessageHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-3">
        <MessageBadge from={message.from} size="md" />
        <span className="text-sm text-slate-500">{message.fromName}</span>
      </div>
      {showDate && (
        <span className="text-xs text-slate-400">{message.createdAt}</span>
      )}
    </div>
  );
}

