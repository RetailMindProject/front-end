import type { Message } from "./types";
import MessageBadge from "./MessageBadge";

interface MessageCardProps {
  message: Message;
  onClick?: () => void;
  showPreview?: boolean;
  className?: string;
}

export default function MessageCard({
  message,
  onClick,
  showPreview = true,
  className = "",
}: MessageCardProps) {
  return (
    <div
      className={`px-4 py-4 hover:bg-slate-50 transition-colors ${onClick ? "cursor-pointer" : ""} ${
        !message.read ? "bg-blue-50/50" : ""
      } ${className}`}
      onClick={onClick}
    >
      {/* From Badge and Date */}
      <div className="flex items-center gap-2 mb-2">
        <MessageBadge from={message.from} />
        <span className="text-xs text-slate-400">{message.createdAt}</span>
      </div>

      {/* Subject */}
      <div className="mb-2">
        <h4 className="text-sm font-semibold text-slate-800">
          {message.subject}
        </h4>
      </div>

      {/* Message Preview */}
      {showPreview && (
        <p className="text-sm text-slate-600 line-clamp-2">
          {message.message}
        </p>
      )}

      {/* From Name */}
      <p className="mt-2 text-xs text-slate-500">
        From: {message.fromName}
      </p>

      {/* Unread Indicator */}
      {!message.read && (
        <div className="mt-2 h-1 w-1 rounded-full bg-blue-600" />
      )}
    </div>
  );
}

