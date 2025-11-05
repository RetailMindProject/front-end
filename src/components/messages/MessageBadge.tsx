import type { Message } from "./types";

interface MessageBadgeProps {
  from: Message["from"];
  size?: "sm" | "md";
  className?: string;
}

export default function MessageBadge({ from, size = "sm", className = "" }: MessageBadgeProps) {
  const sizeClasses = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  const badgeClasses = from === "CEO"
    ? "bg-purple-100 text-purple-700"
    : "bg-blue-100 text-blue-700";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} ${badgeClasses} ${className}`}
    >
      {from === "CEO" ? "👔" : "📦"}
      {from}
    </span>
  );
}

