import type { SentMessage } from "./types";
import { CheckCheck, Clock } from "lucide-react";

interface OutboxMessageCardProps {
  message: SentMessage;
  onClick?: () => void;
  showPreview?: boolean;
  className?: string;
}

export default function OutboxMessageCard({
  message,
  onClick,
  showPreview = true,
  className = "",
}: OutboxMessageCardProps) {
  const getStatusIcon = () => {
    switch (message.status) {
      case "read":
        return <CheckCheck className="h-3.5 w-3.5 text-blue-600" />;
      case "delivered":
        return <CheckCheck className="h-3.5 w-3.5 text-green-600" />;
      case "sent":
      default:
        return <Clock className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  const getStatusLabel = () => {
    switch (message.status) {
      case "read":
        return "Read";
      case "delivered":
        return "Delivered";
      case "sent":
      default:
        return "Sent";
    }
  };

  const getStatusColor = () => {
    switch (message.status) {
      case "read":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "delivered":
        return "bg-green-100 text-green-700 border-green-200";
      case "sent":
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getToBadgeColor = (to: SentMessage["to"]) => {
    switch (to) {
      case "CEO":
        return "bg-purple-100 text-purple-700";
      case "Store Manager":
        return "bg-indigo-100 text-indigo-700";
      case "Inventory Manager":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div
      className={`px-4 py-4 hover:bg-blue-50/50 transition-all duration-200 ease-in-out rounded-lg border-l-4 ${
        message.status === "read" ? "border-blue-500" : message.status === "delivered" ? "border-green-500" : "border-slate-300"
      } ${onClick ? "cursor-pointer hover:shadow-sm" : ""} ${className} group`}
      onClick={onClick}
    >
      {/* To Badge, Status, and Date */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getToBadgeColor(message.to)}`}>
            {message.to === "CEO" ? "👔" : message.to === "Store Manager" ? "🏪" : "📦"}
            {message.to}
          </span>
          <span className="text-xs text-slate-400">{message.createdAt}</span>
        </div>
        <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border ${getStatusColor()}`}>
          {getStatusIcon()}
          {getStatusLabel()}
        </div>
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

      {/* To Name */}
      <p className="mt-2 text-xs text-slate-500 group-hover:text-slate-600 transition-colors duration-200">
        To: {message.toName}
      </p>
    </div>
  );
}






