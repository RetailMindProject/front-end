import type { SentMessage } from "./types";
import { Check, CheckCheck, Clock } from "lucide-react";

interface SentMessageContentProps {
  message: SentMessage;
  className?: string;
}

export default function SentMessageContent({ message, className = "" }: SentMessageContentProps) {
  const getStatusIcon = () => {
    switch (message.status) {
      case "read":
        return <CheckCheck className="h-4 w-4 text-blue-600" />;
      case "delivered":
        return <CheckCheck className="h-4 w-4 text-green-600" />;
      case "sent":
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
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
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 ${className}`}>
      <div className="mb-4">
        {/* Header with To Badge, Status, and Date */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${getToBadgeColor(message.to)}`}>
              {message.to === "CEO" ? "👔" : message.to === "Store Manager" ? "🏪" : "📦"}
              {message.to}
            </span>
            <span className="text-sm text-slate-500">{message.toName}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium border ${getStatusColor()}`}>
              {getStatusIcon()}
              {getStatusLabel()}
            </div>
            <span className="text-xs text-slate-400">{message.createdAt}</span>
          </div>
        </div>
        
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


