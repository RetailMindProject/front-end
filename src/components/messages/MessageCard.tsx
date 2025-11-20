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
      className={`px-4 py-4 hover:bg-blue-50/50 transition-all duration-200 ease-in-out rounded-lg ${onClick ? "cursor-pointer hover:shadow-sm" : ""} ${
        !message.read ? "bg-blue-50/50 border-l-4 border-blue-500" : "border-l-4 border-transparent"
      } ${className} group`}
      onClick={onClick}
    >
      {/* From Badge and Date */}
      <div className="flex items-center gap-2 mb-2">
        <MessageBadge from={message.from} />
        <span className="text-xs text-slate-400">{message.createdAt}</span>
      </div>

      {/* Subject */}
      <div className="mb-2">
        <h4 className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors duration-200">
          {message.subject}
        </h4>
      </div>

      {/* Message Preview */}
      {showPreview && (
        <p className="text-sm text-slate-600 line-clamp-2 group-hover:text-slate-700 transition-colors duration-200">
          {message.message}
        </p>
      )}

      {/* From Name */}
      <p className="mt-2 text-xs text-slate-500 group-hover:text-slate-600 transition-colors duration-200">
        From: {message.fromName}
      </p>

      {/* Unread Indicator */}
      {!message.read && (
        <div className="mt-2 h-2 w-2 rounded-full bg-blue-600 animate-pulse group-hover:scale-125 transition-transform duration-200" />
      )}
    </div>
  );
}

